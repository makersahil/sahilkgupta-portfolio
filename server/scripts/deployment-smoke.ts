const baseUrl = (process.argv[2] || process.env.DEPLOYMENT_BASE_URL || '').replace(/\/$/, '');
if (!baseUrl) {
  console.error('Usage: npm run deployment:smoke -- https://example.com');
  process.exit(2);
}

async function expect(path: string, status: number): Promise<Response> {
  const response = await fetch(`${baseUrl}${path}`, { redirect: 'manual' });
  if (response.status !== status) throw new Error(`${path}: expected ${status}, received ${response.status}`);
  return response;
}

async function main(): Promise<void> {
  const live = await expect('/api/live', 200);
  const ready = await expect('/api/ready', 200);
  const categories = await expect('/api/categories', 200);
  if (!live.headers.get('x-request-id')) throw new Error('X-Request-Id header is missing');
  if (!live.headers.get('content-security-policy')) throw new Error('Content-Security-Policy header is missing');
  const readiness = await ready.json() as { status?: string };
  if (readiness.status !== 'ready') throw new Error('Readiness payload is not ready');
  const content = await categories.json() as { success?: boolean };
  if (content.success !== true) throw new Error('Public content smoke failed');
  console.log('Deployment smoke: PASS');
}

main().catch((error) => {
  console.error(`Deployment smoke: FAIL (${error instanceof Error ? error.message : String(error)})`);
  process.exitCode = 1;
});
