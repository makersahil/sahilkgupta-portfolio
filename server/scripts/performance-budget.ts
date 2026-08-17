import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

interface Budget {
  maximumLargestJavaScriptGzip: number;
  maximumTotalJavaScriptGzip: number;
  maximumTotalCssGzip: number;
  maximumServerBytes: number;
}

const budget: Budget = {
  maximumLargestJavaScriptGzip: 350 * 1024,
  maximumTotalJavaScriptGzip: 550 * 1024,
  maximumTotalCssGzip: 30 * 1024,
  maximumServerBytes: 700 * 1024,
};

async function files(directory: string): Promise<string[]> {
  const output: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await files(target));
    else output.push(target);
  }
  return output;
}

async function main(): Promise<void> {
  const dist = path.resolve('dist');
  const entries = await files(dist);
  assert.ok(entries.some((entry) => entry.endsWith('index.html')), 'dist/index.html is required');
  assert.equal(entries.some((entry) => entry.endsWith('.map')), false, 'production source maps must not be packaged');
  assert.equal(entries.some((entry) => /(^|[\\/])\.env($|[.])/i.test(entry)), false, 'environment files must not be packaged');

  let totalJsGzip = 0;
  let largestJsGzip = 0;
  let totalCssGzip = 0;
  for (const entry of entries) {
    if (!entry.endsWith('.js') && !entry.endsWith('.css')) continue;
    const compressed = gzipSync(await readFile(entry)).length;
    if (entry.endsWith('.js')) {
      totalJsGzip += compressed;
      largestJsGzip = Math.max(largestJsGzip, compressed);
    } else totalCssGzip += compressed;
  }
  const serverBytes = (await stat(path.join(dist, 'server.cjs'))).size;
  assert.ok(largestJsGzip <= budget.maximumLargestJavaScriptGzip, `largest JS gzip ${largestJsGzip} exceeds ${budget.maximumLargestJavaScriptGzip}`);
  assert.ok(totalJsGzip <= budget.maximumTotalJavaScriptGzip, `total JS gzip ${totalJsGzip} exceeds ${budget.maximumTotalJavaScriptGzip}`);
  assert.ok(totalCssGzip <= budget.maximumTotalCssGzip, `total CSS gzip ${totalCssGzip} exceeds ${budget.maximumTotalCssGzip}`);
  assert.ok(serverBytes <= budget.maximumServerBytes, `server bundle ${serverBytes} exceeds ${budget.maximumServerBytes}`);
  console.log(`Production performance budget: PASS (largest JS gzip=${largestJsGzip}, total JS gzip=${totalJsGzip}, CSS gzip=${totalCssGzip}, server=${serverBytes})`);
}

main().catch((error: unknown) => {
  console.error(`Production performance budget: FAIL (${error instanceof Error ? error.message : String(error)})`);
  process.exitCode = 1;
});
