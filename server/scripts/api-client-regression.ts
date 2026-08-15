import assert from 'node:assert/strict';

interface CapturedRequest {
  endpoint: string | URL | Request;
  init?: RequestInit;
}

async function main(): Promise<void> {
  const { api, ApiError } = await import('../../src/lib/api.js');
  let captured: CapturedRequest | null = null;

  function respond(status: number, body: unknown, contentType = 'application/json'): void {
    globalThis.fetch = (async (endpoint: string | URL | Request, init?: RequestInit) => {
      captured = { endpoint, init };
      return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
        status,
        headers: { 'Content-Type': contentType },
      });
    }) as typeof fetch;
  }

  async function expectApiError(
    operation: () => Promise<unknown>,
    code: InstanceType<typeof ApiError>['code'],
    status?: number,
  ): Promise<void> {
    try {
      await operation();
      assert.fail(`Expected ApiError ${code}`);
    } catch (error) {
      assert.ok(error instanceof ApiError);
      assert.equal(error.code, code);
      assert.equal(error.status, status);
    }
  }

  respond(200, { success: true, data: [] });
  assert.deepEqual(await api.getProjects(), [], 'a genuine successful empty collection is valid');
  assert.equal(captured?.init?.credentials, 'same-origin');

  respond(503, {
    success: false,
    error: { code: 'PERSISTENCE_UNAVAILABLE', message: 'Persistent storage is unavailable' },
  });
  await expectApiError(() => api.getProjects(), 'HTTP_ERROR', 503);

  respond(200, { success: false, error: { code: 'CONFLICT', message: 'Rejected' } });
  await expectApiError(() => api.createCategory({ name: 'Rejected' }), 'API_ERROR', 200);

  respond(200, { success: true });
  await expectApiError(() => api.getBlogs(), 'INVALID_PAYLOAD', 200);

  respond(200, { success: true, data: {} });
  await expectApiError(() => api.getSkills(), 'INVALID_PAYLOAD', 200);

  respond(200, '<html>not JSON</html>', 'text/html');
  await expectApiError(() => api.getCategories(), 'INVALID_JSON', 200);

  respond(409, { success: false, error: { code: 'CONFLICT', message: 'Duplicate slug' } });
  await expectApiError(() => api.createBlog({ title: 'Duplicate' }), 'HTTP_ERROR', 409);

  globalThis.fetch = (async () => {
    throw new TypeError('simulated network failure');
  }) as typeof fetch;
  await expectApiError(() => api.getCertifications(), 'NETWORK_ERROR');

  respond(200, { output: 'terminal contract preserved', exitCode: 0 });
  assert.deepEqual(await api.execTerminal('help'), {
    output: 'terminal contract preserved',
    exitCode: 0,
  });

  respond(201, { success: true, data: { id: 'inquiry-test' }, message: 'accepted' });
  const contact = await api.sendContact({
    name: 'Visitor',
    email: 'visitor@example.invalid',
    message: 'Hello',
  });
  assert.equal(contact.success, true);

  // Browser authentication is cookie-only. A successful login response does not need a bearer token.
  respond(200, {
    success: true,
    user: {
      id: 'user-test',
      email: 'admin@example.invalid',
      fullName: 'Admin',
      role: 'ADMIN',
    },
  });
  const login = await api.login('admin@example.invalid', 'not-used-by-mock');
  assert.equal(login.success, true);
  assert.equal(login.user.role, 'ADMIN');
  assert.equal(captured?.init?.credentials, 'same-origin');
  const loginHeaders = captured?.init?.headers as Record<string, string> | undefined;
  assert.equal(loginHeaders?.Authorization, undefined, 'browser auth must not send a stored bearer token');

  respond(200, { success: true, message: 'Logged out successfully' });
  await api.logout();

  console.log('API client regression: PASS');
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : 'Unknown error';
  console.error(`API client regression: FAIL (${message})`);
  process.exitCode = 1;
});
