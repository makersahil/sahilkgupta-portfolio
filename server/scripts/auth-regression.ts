import 'dotenv/config';

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

interface ApiResult {
  response: Response;
  payload: Record<string, any>;
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error('DATABASE_URL is required for the authentication regression suite');
  }

  const suffix = randomUUID().replaceAll('-', '');
  process.env.NODE_ENV = 'test';
  process.env.RATE_LIMIT_ENABLED = 'true';
  process.env.JWT_SECRET = `${randomUUID()}${randomUUID()}`;

  const adminEmail = `auth-admin-${suffix}@example.invalid`;
  const editorEmail = `auth-editor-${suffix}@example.invalid`;
  const inactiveEmail = `auth-inactive-${suffix}@example.invalid`;
  const rateLimitEmail = `auth-rate-${suffix}@example.invalid`;
  const adminPassword = `Admin-${randomUUID()}!`;
  const editorPassword = `Editor-${randomUUID()}!`;
  const inactivePassword = `Inactive-${randomUUID()}!`;

  const [
    { default: express },
    { default: cookieParser },
    { default: bcrypt },
    { default: authRoutes },
    { authenticateToken, requireRole },
    { errorHandler },
    { asyncHandler },
    { prisma },
    { bootstrapAdmin },
    { PrismaAuthRepository },
    { signSessionToken },
  ] = await Promise.all([
    import('express'),
    import('cookie-parser'),
    import('bcryptjs'),
    import('../routes/auth.routes.js'),
    import('../middlewares/auth.middleware.js'),
    import('../middlewares/error.middleware.js'),
    import('../middlewares/async-handler.js'),
    import('../lib/prisma.js'),
    import('../services/auth/bootstrap-admin.js'),
    import('../repositories/prisma/auth.repository.js'),
    import('../lib/auth-token.js'),
  ]);

  const authRepository = new PrismaAuthRepository(prisma);
  const createdUserIds: string[] = [];
  let server: Server | null = null;
  let runFailure: unknown;

  async function request(baseUrl: string, path: string, init?: RequestInit): Promise<ApiResult> {
    const response = await fetch(`${baseUrl}${path}`, init);
    const payload = (await response.json()) as Record<string, any>;
    return { response, payload };
  }

  async function expectStatus(
    baseUrl: string,
    path: string,
    status: number,
    init?: RequestInit,
  ): Promise<ApiResult> {
    const result = await request(baseUrl, path, init);
    assert.equal(result.response.status, status, `${init?.method || 'GET'} ${path}`);
    return result;
  }

  function sessionCookie(result: ApiResult): string {
    const setCookie = result.response.headers.get('set-cookie');
    assert.ok(setCookie, 'successful login must return a session cookie');
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite=Lax/i);
    return setCookie.split(';', 1)[0];
  }

  try {
    const bootstrapped = await bootstrapAdmin({
      email: adminEmail,
      password: adminPassword,
      displayName: 'Authentication Regression Admin',
    }, authRepository);
    createdUserIds.push(bootstrapped.id);

    const storedAdmin = await prisma.user.findUniqueOrThrow({ where: { id: bootstrapped.id } });
    assert.equal(storedAdmin.role, 'SUPER_ADMIN');
    assert.equal(storedAdmin.isActive, true);
    assert.ok(storedAdmin.passwordHash);
    assert.notEqual(storedAdmin.passwordHash, adminPassword);
    assert.equal(await bcrypt.compare(adminPassword, storedAdmin.passwordHash!), true);

    const editorHash = await bcrypt.hash(editorPassword, 12);
    const editor = await prisma.user.create({
      data: {
        email: editorEmail,
        displayName: 'Authentication Regression Editor',
        passwordHash: editorHash,
        role: 'EDITOR',
        isActive: true,
      },
    });
    createdUserIds.push(editor.id);

    const inactiveHash = await bcrypt.hash(inactivePassword, 12);
    const inactive = await prisma.user.create({
      data: {
        email: inactiveEmail,
        displayName: 'Inactive Authentication User',
        passwordHash: inactiveHash,
        role: 'ADMIN',
        isActive: false,
      },
    });
    createdUserIds.push(inactive.id);

    const app = express();
    app.use(express.json({ limit: '1mb' }));
    app.use(cookieParser());
    app.use('/api/auth', authRoutes);
    app.get(
      '/api/test/admin-only',
      authenticateToken,
      requireRole('SUPER_ADMIN', 'ADMIN'),
      asyncHandler(async (req, res) => {
        res.json({ success: true });
      }),
    );
    app.use('/api', errorHandler);

    server = await new Promise<Server>((resolve, reject) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
      listener.once('error', reject);
    });
    const address = server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const badLogin = await expectStatus(baseUrl, '/api/auth/login', 401, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: `${adminPassword}-wrong` }),
    });
    assert.equal(badLogin.payload.error.code, 'UNAUTHORIZED');

    await expectStatus(baseUrl, '/api/auth/login', 401, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inactiveEmail, password: inactivePassword }),
    });

    const adminLogin = await expectStatus(baseUrl, '/api/auth/login', 200, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail.toUpperCase(), password: adminPassword }),
    });
    assert.equal(adminLogin.payload.success, true);
    assert.equal(adminLogin.payload.user.email, adminEmail);
    assert.equal(adminLogin.payload.user.role, 'SUPER_ADMIN');
    assert.equal('token' in adminLogin.payload, false, 'browser login must not expose a bearer token');
    assert.equal(JSON.stringify(adminLogin.payload).includes('passwordHash'), false);
    const adminCookie = sessionCookie(adminLogin);

    const session = await prisma.authSession.findFirst({
      where: { userId: bootstrapped.id, revokedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    assert.ok(session, 'login must create a persisted session');

    const me = await expectStatus(baseUrl, '/api/auth/me', 200, {
      headers: { Cookie: adminCookie },
    });
    assert.equal(me.payload.user.id, bootstrapped.id);
    assert.equal(me.payload.user.role, 'SUPER_ADMIN');
    assert.equal(JSON.stringify(me.payload).includes('passwordHash'), false);

    await expectStatus(baseUrl, '/api/test/admin-only', 200, {
      headers: { Cookie: adminCookie },
    });

    // Current DB role is authoritative; the same cookie loses access immediately.
    await prisma.user.update({ where: { id: bootstrapped.id }, data: { role: 'EDITOR' } });
    await expectStatus(baseUrl, '/api/test/admin-only', 403, {
      headers: { Cookie: adminCookie },
    });
    const roleChangedMe = await expectStatus(baseUrl, '/api/auth/me', 200, {
      headers: { Cookie: adminCookie },
    });
    assert.equal(roleChangedMe.payload.user.role, 'EDITOR');

    await prisma.user.update({ where: { id: bootstrapped.id }, data: { role: 'ADMIN' } });
    await expectStatus(baseUrl, '/api/test/admin-only', 200, {
      headers: { Cookie: adminCookie },
    });

    const editorLogin = await expectStatus(baseUrl, '/api/auth/login', 200, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: editorEmail, password: editorPassword }),
    });
    const editorCookie = sessionCookie(editorLogin);
    await expectStatus(baseUrl, '/api/test/admin-only', 403, {
      headers: { Cookie: editorCookie },
    });

    await prisma.user.update({ where: { id: bootstrapped.id }, data: { isActive: false } });
    await expectStatus(baseUrl, '/api/auth/me', 401, {
      headers: { Cookie: adminCookie },
    });
    await prisma.user.update({ where: { id: bootstrapped.id }, data: { isActive: true } });

    // DB-expired sessions fail even if the signed token itself is still cryptographically valid.
    const expiredSession = await authRepository.createLoginSession(
      bootstrapped.id,
      new Date(Date.now() - 60_000),
      new Date(),
    );
    const expiredToken = signSessionToken(
      bootstrapped.id,
      expiredSession.id,
      new Date(Date.now() + 60_000),
    );
    await expectStatus(baseUrl, '/api/auth/me', 401, {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });

    const logout = await expectStatus(baseUrl, '/api/auth/logout', 200, {
      method: 'POST',
      headers: { Cookie: adminCookie },
    });
    assert.equal(logout.payload.success, true);
    const storedSession = await prisma.authSession.findUnique({ where: { id: session!.id } });
    assert.ok(storedSession?.revokedAt, 'logout must revoke the persisted session');
    await expectStatus(baseUrl, '/api/auth/me', 401, {
      headers: { Cookie: adminCookie },
    });

    // Shared PostgreSQL-backed failed-login throttling.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expectStatus(baseUrl, '/api/auth/login', 401, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: rateLimitEmail, password: 'wrong-password' }),
      });
    }
    const rateLimited = await expectStatus(baseUrl, '/api/auth/login', 429, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: rateLimitEmail, password: 'wrong-password' }),
    });
    assert.equal(rateLimited.payload.error.code, 'RATE_LIMITED');
  } catch (error) {
    runFailure = error;
  } finally {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close((error) => (error ? reject(error) : resolve()));
      });
    }
    await prisma.rateLimitBucket.deleteMany({ where: { scope: 'auth.failed-login' } });
    for (const userId of createdUserIds) {
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    await prisma.$disconnect();
  }

  if (runFailure) throw runFailure;
  console.log('Authentication regression: PASS');
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : 'Unknown error';
  console.error(`Authentication regression: FAIL (${message})`);
  process.exitCode = 1;
});
