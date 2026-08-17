import { createHash, randomUUID } from 'node:crypto';
import { constants as fsConstants } from 'node:fs';
import { access, copyFile, mkdir, readFile, readdir, realpath, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { env } from '../../config/env.js';
import { ConfigurationError, IntegrityError, PayloadTooLargeError, ValidationError } from '../../lib/errors.js';
import { log } from '../../lib/logger.js';

export interface StoredArtifactBytes {
  storageKey: string;
  sha256: string;
  sizeBytes: number;
}

export interface ArtifactStorageHealth {
  ready: boolean;
  provider: 'LOCAL_MANAGED';
  writable: boolean;
  message?: string;
}

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export class ManagedArtifactStorage {
  private readyRoot: string | null = null;

  constructor(
    private readonly rootPath = env.ARTIFACT_STORAGE_DIR,
    private readonly maximumBytes = env.ARTIFACT_MAX_BYTES,
  ) {}

  async ensureReady(): Promise<string> {
    if (!env.ARTIFACT_STORAGE_ENABLED) {
      throw new ConfigurationError('Managed artifact storage is disabled');
    }
    if (this.readyRoot) return this.readyRoot;
    await mkdir(this.rootPath, { recursive: true, mode: 0o700 });
    const root = await realpath(this.rootPath);
    const probe = path.join(root, `.probe-${randomUUID()}`);
    await writeFile(probe, 'ready', { mode: 0o600, flag: 'wx' });
    await rm(probe, { force: true });
    this.readyRoot = root;
    return root;
  }

  private async resolveStorageKey(storageKey: string): Promise<string> {
    if (!/^[a-f0-9]{2}\/[a-f0-9]{64}$/.test(storageKey)) {
      throw new ValidationError('Managed artifact storage key is invalid');
    }
    const root = await this.ensureReady();
    const resolved = path.resolve(root, storageKey);
    if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
      throw new ValidationError('Managed artifact path escaped the storage root');
    }
    return resolved;
  }

  async store(bytes: Buffer): Promise<StoredArtifactBytes> {
    if (!Buffer.isBuffer(bytes) || bytes.length === 0) throw new ValidationError('Artifact bytes are required');
    if (bytes.length > this.maximumBytes) {
      throw new PayloadTooLargeError('Artifact exceeds the configured byte limit', {
        maximumBytes: this.maximumBytes,
      });
    }
    const digest = sha256(bytes);
    const storageKey = `${digest.slice(0, 2)}/${digest}`;
    const destination = await this.resolveStorageKey(storageKey);
    await mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
    const temporary = `${destination}.${randomUUID()}.tmp`;
    await writeFile(temporary, bytes, { mode: 0o600, flag: 'wx' });
    try {
      await copyFile(temporary, destination, fsConstants.COPYFILE_EXCL);
    } catch (error) {
      const code = typeof error === 'object' && error && 'code' in error ? (error as { code?: unknown }).code : undefined;
      if (code !== 'EEXIST') throw error;
      const existing = await readFile(destination);
      if (sha256(existing) !== digest) throw new IntegrityError('Existing content-addressed artifact does not match its key');
    } finally {
      await rm(temporary, { force: true });
    }
    return { storageKey, sha256: digest, sizeBytes: bytes.length };
  }

  async read(storageKey: string, expectedSha256: string, verify = env.ARTIFACT_VERIFY_ON_READ): Promise<Buffer> {
    const location = await this.resolveStorageKey(storageKey);
    const info = await stat(location);
    if (!info.isFile() || info.size > this.maximumBytes) throw new IntegrityError('Managed artifact object has an invalid size');
    const bytes = await readFile(location);
    if (verify) {
      const actual = sha256(bytes);
      if (actual !== expectedSha256) {
        throw new IntegrityError('Managed artifact bytes do not match the recorded SHA-256', {
          expectedSha256,
          actualSha256: actual,
        });
      }
    }
    return bytes;
  }

  async verify(storageKey: string, expectedSha256: string, expectedSizeBytes?: number): Promise<{ valid: boolean; actualSha256: string; sizeBytes: number }> {
    const location = await this.resolveStorageKey(storageKey);
    const info = await stat(location);
    if (!info.isFile() || info.size > this.maximumBytes) throw new IntegrityError('Managed artifact object has an invalid size');
    const bytes = await readFile(location);
    const actualSha256 = sha256(bytes);
    return {
      valid: actualSha256 === expectedSha256 && (expectedSizeBytes === undefined || bytes.length === expectedSizeBytes),
      actualSha256,
      sizeBytes: bytes.length,
    };
  }

  async delete(storageKey: string): Promise<void> {
    const location = await this.resolveStorageKey(storageKey);
    await rm(location, { force: true });
  }


  async pruneUnreferenced(referencedKeys: ReadonlySet<string>, olderThan: Date): Promise<number> {
    const root = await this.ensureReady();
    let deleted = 0;
    const prefixes = await readdir(root, { withFileTypes: true });
    for (const prefix of prefixes) {
      if (!prefix.isDirectory() || !/^[a-f0-9]{2}$/.test(prefix.name)) continue;
      const directory = path.join(root, prefix.name);
      const entries = await readdir(directory, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile() || !/^[a-f0-9]{64}$/.test(entry.name)) continue;
        const storageKey = `${prefix.name}/${entry.name}`;
        if (referencedKeys.has(storageKey)) continue;
        const location = path.join(directory, entry.name);
        const info = await stat(location);
        if (info.mtime >= olderThan) continue;
        await rm(location, { force: true });
        deleted += 1;
      }
      await rm(directory, { recursive: false }).catch(() => undefined);
    }
    return deleted;
  }

  async checkHealth(): Promise<ArtifactStorageHealth> {
    if (!env.ARTIFACT_STORAGE_ENABLED) {
      return { ready: true, provider: 'LOCAL_MANAGED', writable: false, message: 'Managed storage disabled by configuration' };
    }
    try {
      const root = await this.ensureReady();
      await access(root, fsConstants.R_OK | fsConstants.W_OK);
      const info = await stat(root);
      return { ready: info.isDirectory(), provider: 'LOCAL_MANAGED', writable: true };
    } catch (error) {
      log('error', 'managed_artifact_storage_health_failed', { error });
      return {
        ready: false,
        provider: 'LOCAL_MANAGED',
        writable: false,
        message: 'Managed artifact storage unavailable',
      };
    }
  }
}

export const managedArtifactStorage = new ManagedArtifactStorage();
