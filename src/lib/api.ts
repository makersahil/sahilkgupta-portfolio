import {
  Category,
  Project,
  BlogPost,
  Certification,
  Skill,
  MediaAsset,
  AuthUser,
  ContactInquiry,
  TopologyData,
  NetworkingDeviceState,
  NetworkingLabState,
  NetworkingLabSummary,
  NetworkingPathTrace,
  NetworkingOperationsSnapshot,
  NetworkingRouteLookup,
  NetworkingOperationalPathAnalysis,
  NetworkingOperatorContext,
  LinuxHostState,
  LinuxLabState,
  LinuxLabSummary,
  LinuxOperationsSnapshot,
  LinuxOperatorContext,
  DevOpsLabState,
  DevOpsLabSummary,
  DevOpsPipelineState,
  DevOpsOperationsSnapshot,
  DevOpsOperatorContext,
  LabAggregate,
  LabRecord,
  LabInputRecord,
  LabInputTypeDefinition,
  LabNodeRecord,
  LabLinkRecord,
  LabScenarioRecord,
  LabRunbookStepRecord,
  LabEvidenceRecord,
  CanonicalLabManifestV1,
  AdminAuditLog,
  LabDomain,
  UnifiedCliBootstrap,
  UnifiedCliExecutionResult,
  ScenarioOverview,
  OrchestratorArtifactAdminRecord,
  OrchestratorDashboardSummary,
  OrchestratorImportDryRunResult,
  OrchestratorImportResult,
  OrchestratorLabRecord,
  OrchestratorProjectAggregate,
  OrchestratorProjectPreview,
  OrchestratorProjectRecord,
  OrchestratorReorderItem,
  OrchestratorValidationReport,
} from '../types.js';

export type ApiErrorCode =
  | 'NETWORK_ERROR'
  | 'INVALID_JSON'
  | 'HTTP_ERROR'
  | 'API_ERROR'
  | 'INVALID_PAYLOAD';

interface ApiErrorOptions {
  code: ApiErrorCode;
  endpoint: string;
  method: string;
  status?: number;
  serverCode?: string;
  payload?: unknown;
  cause?: unknown;
}

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly endpoint: string;
  readonly method: string;
  readonly status?: number;
  readonly serverCode?: string;
  readonly payload?: unknown;
  readonly cause?: unknown;

  constructor(message: string, options: ApiErrorOptions) {
    super(message);
    this.name = 'ApiError';
    this.code = options.code;
    this.endpoint = options.endpoint;
    this.method = options.method;
    this.status = options.status;
    this.serverCode = options.serverCode;
    this.payload = options.payload;
    this.cause = options.cause;
  }
}

interface ApiEnvelope<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}

interface AuthResponse {
  success: boolean;
  user: AuthUser;
  message?: string;
}

interface RequestResult<T> {
  payload: T;
  status: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getApiMessage = (payload: unknown, fallback: string): string => {
  if (isRecord(payload) && typeof payload.message === 'string' && payload.message.trim()) {
    return payload.message;
  }
  if (
    isRecord(payload) &&
    isRecord(payload.error) &&
    typeof payload.error.message === 'string' &&
    payload.error.message.trim()
  ) {
    return payload.error.message;
  }
  return fallback;
};

const getServerCode = (payload: unknown): string | undefined => {
  if (isRecord(payload) && isRecord(payload.error) && typeof payload.error.code === 'string') {
    return payload.error.code;
  }
  return undefined;
};

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
let csrfTokenPromise: Promise<string | null> | null = null;

function csrfCookieToken(): string | null {
  if (typeof document === 'undefined') return null;
  for (const part of document.cookie.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === 'portfolio_csrf') return decodeURIComponent(rest.join('='));
  }
  return null;
}

async function ensureCsrfToken(): Promise<string | null> {
  const existing = csrfCookieToken();
  if (existing) return existing;
  if (typeof window === 'undefined') return null;
  csrfTokenPromise ??= fetch('/api/security/csrf', { credentials: 'same-origin' })
    .then(async (response) => {
      if (!response.ok) return null;
      const payload = await response.json() as unknown;
      if (isRecord(payload) && isRecord(payload.data) && typeof payload.data.token === 'string') {
        return payload.data.token;
      }
      return csrfCookieToken();
    })
    .finally(() => { csrfTokenPromise = null; });
  return csrfTokenPromise;
}



let volatileLabSessionId: string | null = null;
const LAB_SESSION_STORAGE_KEY = 'portfolio-lab-session-v1';

function createLabSessionId(): string {
  const uuid = globalThis.crypto?.randomUUID?.().replace(/-/g, '');
  if (uuid) return `lab-${uuid}`;
  const random = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  return `lab-${Date.now().toString(36)}-${random.replace(/[^a-z0-9]/gi, '')}`;
}

function getLabSessionId(): string {
  if (typeof window === 'undefined') {
    volatileLabSessionId ??= createLabSessionId();
    return volatileLabSessionId;
  }
  try {
    const existing = window.sessionStorage.getItem(LAB_SESSION_STORAGE_KEY);
    if (existing) return existing;
    const created = createLabSessionId();
    window.sessionStorage.setItem(LAB_SESSION_STORAGE_KEY, created);
    return created;
  } catch {
    volatileLabSessionId ??= createLabSessionId();
    return volatileLabSessionId;
  }
}

class ApiClient {
  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
    };
  }

  private async requestWithMeta<T>(endpoint: string, init: RequestInit = {}): Promise<RequestResult<T>> {
    const method = init.method || 'GET';
    let response: Response;

    try {
      const headers = new Headers(init.headers);
      headers.set('X-Lab-Session', getLabSessionId());
      if (UNSAFE_METHODS.has(method.toUpperCase())) {
        const csrfToken = await ensureCsrfToken();
        if (csrfToken) headers.set('X-CSRF-Token', csrfToken);
      }
      response = await fetch(endpoint, {
        credentials: 'same-origin',
        ...init,
        headers,
      });
    } catch (cause) {
      throw new ApiError('Unable to reach the backend API.', {
        code: 'NETWORK_ERROR',
        endpoint,
        method,
        cause,
      });
    }

    let rawBody: string;
    try {
      rawBody = await response.text();
    } catch (cause) {
      throw new ApiError('Unable to read the backend response.', {
        code: 'INVALID_JSON',
        endpoint,
        method,
        status: response.status,
        cause,
      });
    }

    let payload: unknown;
    try {
      payload = rawBody.trim() ? JSON.parse(rawBody) : null;
    } catch (cause) {
      throw new ApiError('The backend returned an invalid JSON response.', {
        code: 'INVALID_JSON',
        endpoint,
        method,
        status: response.status,
        payload: rawBody.slice(0, 240),
        cause,
      });
    }

    if (!response.ok) {
      throw new ApiError(
        getApiMessage(payload, `API request failed with status ${response.status}.`),
        {
          code: 'HTTP_ERROR',
          endpoint,
          method,
          status: response.status,
          serverCode: getServerCode(payload),
          payload,
        }
      );
    }

    if (isRecord(payload) && payload.success === false) {
      throw new ApiError(getApiMessage(payload, 'The backend rejected the request.'), {
        code: 'API_ERROR',
        endpoint,
        method,
        status: response.status,
        serverCode: getServerCode(payload),
        payload,
      });
    }

    if (payload === null) {
      throw new ApiError('The backend returned an empty response.', {
        code: 'INVALID_PAYLOAD',
        endpoint,
        method,
        status: response.status,
      });
    }

    return { payload: payload as T, status: response.status };
  }

  private async request<T>(endpoint: string, init: RequestInit = {}): Promise<T> {
    const result = await this.requestWithMeta<T>(endpoint, init);
    return result.payload;
  }

  private invalidPayload(
    endpoint: string,
    payload: unknown,
    message: string,
    method = 'GET',
    status?: number,
  ): never {
    throw new ApiError(message, {
      code: 'INVALID_PAYLOAD',
      endpoint,
      method,
      status,
      payload,
    });
  }

  private async requestEnvelopeWithMeta<T>(
    endpoint: string,
    init: RequestInit = {},
  ): Promise<RequestResult<ApiEnvelope<T>>> {
    const result = await this.requestWithMeta<ApiEnvelope<T>>(endpoint, init);
    const { payload, status } = result;
    if (!isRecord(payload) || payload.success !== true) {
      return this.invalidPayload(
        endpoint,
        payload,
        'The backend returned an invalid response envelope.',
        init.method || 'GET',
        status,
      );
    }
    return { payload: payload as unknown as ApiEnvelope<T>, status };
  }

  private async requestEnvelope<T>(endpoint: string, init: RequestInit = {}): Promise<ApiEnvelope<T>> {
    const result = await this.requestEnvelopeWithMeta<T>(endpoint, init);
    return result.payload;
  }

  private async requestDataWithMeta<T>(
    endpoint: string,
    init: RequestInit = {},
  ): Promise<RequestResult<T>> {
    const { payload: envelope, status } = await this.requestEnvelopeWithMeta<T>(endpoint, init);
    if (
      !Object.prototype.hasOwnProperty.call(envelope, 'data') ||
      envelope.data === undefined ||
      envelope.data === null
    ) {
      return this.invalidPayload(
        endpoint,
        envelope,
        'The backend response did not include data.',
        init.method || 'GET',
        status,
      );
    }
    return { payload: envelope.data as T, status };
  }

  private async requestData<T>(endpoint: string, init: RequestInit = {}): Promise<T> {
    const result = await this.requestDataWithMeta<T>(endpoint, init);
    return result.payload;
  }

  private async requestArray<T>(endpoint: string, init: RequestInit = {}): Promise<T[]> {
    const { payload: data, status } = await this.requestDataWithMeta<unknown>(endpoint, init);
    if (!Array.isArray(data)) {
      return this.invalidPayload(
        endpoint,
        data,
        'The backend returned a non-array collection.',
        init.method || 'GET',
        status,
      );
    }
    return data as T[];
  }

  // Auth
  async login(email: string, password: string): Promise<AuthResponse> {
    const endpoint = '/api/auth/login';
    const { payload, status } = await this.requestWithMeta<AuthResponse>(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (
      !isRecord(payload) ||
      payload.success !== true ||
      !isRecord(payload.user)
    ) {
      return this.invalidPayload(endpoint, payload, 'The authentication response was incomplete.', 'POST', status);
    }

    return payload as unknown as AuthResponse;
  }

  async getMe(): Promise<{ success: boolean; user?: AuthUser }> {
    const endpoint = '/api/auth/me';
    const { payload, status } = await this.requestWithMeta<{ success: boolean; user?: AuthUser }>(endpoint, {
      headers: this.getHeaders(),
    });
    if (!isRecord(payload) || payload.success !== true || !isRecord(payload.user)) {
      return this.invalidPayload(endpoint, payload, 'The session response was incomplete.', 'GET', status);
    }
    return payload as { success: boolean; user: AuthUser };
  }

  async logout(): Promise<void> {
    await this.requestEnvelope('/api/auth/logout', { method: 'POST' });
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return this.requestArray<Category>('/api/categories');
  }

  async createCategory(cat: Partial<Category>): Promise<Category> {
    return this.requestData<Category>('/api/categories', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(cat),
    });
  }

  async updateCategory(id: string, cat: Partial<Category>): Promise<Category> {
    return this.requestData<Category>(`/api/categories/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(cat),
    });
  }

  async deleteCategory(id: string): Promise<boolean> {
    await this.requestEnvelope(`/api/categories/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return true;
  }

  // Projects
  async getProjects(categoryId?: string, tag?: string): Promise<Project[]> {
    const params = new URLSearchParams();
    if (categoryId) params.append('categoryId', categoryId);
    if (tag) params.append('tag', tag);
    return this.requestArray<Project>(`/api/projects?${params.toString()}`);
  }

  async getProjectBySlug(slug: string): Promise<Project | null> {
    return this.requestData<Project>(`/api/projects/${slug}`);
  }

  async createProject(project: Partial<Project>): Promise<Project> {
    return this.requestData<Project>('/api/projects', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(project),
    });
  }

  async updateProject(id: string, project: Partial<Project>): Promise<Project> {
    return this.requestData<Project>(`/api/projects/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(project),
    });
  }

  async deleteProject(id: string): Promise<boolean> {
    await this.requestEnvelope(`/api/projects/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return true;
  }

  // Blogs
  async getBlogs(categoryId?: string, tag?: string): Promise<BlogPost[]> {
    const params = new URLSearchParams();
    if (categoryId) params.append('categoryId', categoryId);
    if (tag) params.append('tag', tag);
    return this.requestArray<BlogPost>(`/api/blogs?${params.toString()}`);
  }

  async createBlog(blog: Partial<BlogPost>): Promise<BlogPost> {
    return this.requestData<BlogPost>('/api/blogs', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(blog),
    });
  }

  async updateBlog(id: string, blog: Partial<BlogPost>): Promise<BlogPost> {
    return this.requestData<BlogPost>(`/api/blogs/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(blog),
    });
  }

  async deleteBlog(id: string): Promise<boolean> {
    await this.requestEnvelope(`/api/blogs/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return true;
  }

  // Certifications
  async getCertifications(categoryId?: string): Promise<Certification[]> {
    const params = new URLSearchParams();
    if (categoryId) params.append('categoryId', categoryId);
    return this.requestArray<Certification>(`/api/certifications?${params.toString()}`);
  }

  async createCertification(cert: Partial<Certification>): Promise<Certification> {
    return this.requestData<Certification>('/api/certifications', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(cert),
    });
  }

  async updateCertification(id: string, cert: Partial<Certification>): Promise<Certification> {
    return this.requestData<Certification>(`/api/certifications/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(cert),
    });
  }

  async deleteCertification(id: string): Promise<boolean> {
    await this.requestEnvelope(`/api/certifications/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return true;
  }

  // Skills
  async getSkills(categoryId?: string): Promise<Skill[]> {
    const params = new URLSearchParams();
    if (categoryId) params.append('categoryId', categoryId);
    return this.requestArray<Skill>(`/api/skills?${params.toString()}`);
  }

  async createSkill(skill: Partial<Skill>): Promise<Skill> {
    return this.requestData<Skill>('/api/skills', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(skill),
    });
  }

  async updateSkill(id: string, skill: Partial<Skill>): Promise<Skill> {
    return this.requestData<Skill>(`/api/skills/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(skill),
    });
  }

  async deleteSkill(id: string): Promise<boolean> {
    await this.requestEnvelope(`/api/skills/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return true;
  }

  // Media
  async getMedia(): Promise<MediaAsset[]> {
    return this.requestArray<MediaAsset>('/api/media');
  }

  async registerMediaReference(data: Partial<MediaAsset>): Promise<MediaAsset> {
    return this.requestData<MediaAsset>('/api/media/upload', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
  }

  async uploadManagedMedia(
    file: Blob,
    options: { fileName: string; mimeType?: string; projectId?: string; labId?: string; isPublic?: boolean },
  ): Promise<MediaAsset> {
    const headers = new Headers({
      'Content-Type': 'application/octet-stream',
      'X-File-Name': options.fileName,
      'X-Artifact-Mime-Type': options.mimeType || file.type || 'application/octet-stream',
      'X-Artifact-Public': String(options.isPublic ?? false),
    });
    if (options.projectId) headers.set('X-Project-Id', options.projectId);
    if (options.labId) headers.set('X-Lab-Id', options.labId);
    return this.requestData<MediaAsset>('/api/media/managed', {
      method: 'POST',
      headers,
      body: file,
    });
  }

  async verifyManagedMedia(id: string): Promise<{ valid: boolean; actualSha256: string; expectedSha256: string; sizeBytes: number }> {
    return this.requestData(`/api/media/${id}/verify-integrity`, { method: 'POST' });
  }

  async deleteMedia(id: string): Promise<boolean> {
    await this.requestEnvelope(`/api/media/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return true;
  }

  // Unified recorded-state CLI. execTerminal is retained as a small compatibility wrapper.
  async getCliBootstrap(category?: string): Promise<UnifiedCliBootstrap> {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    const query = params.toString();
    return this.requestData<UnifiedCliBootstrap>(`/api/terminal/bootstrap${query ? `?${query}` : ''}`);
  }

  async execCli(command: string, contextId?: string, category?: string): Promise<UnifiedCliExecutionResult> {
    const endpoint = '/api/terminal/exec';
    const { payload, status } = await this.requestWithMeta<UnifiedCliExecutionResult>(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, contextId, category }),
    });
    if (
      !isRecord(payload) ||
      payload.schemaVersion !== 'cli.v1' ||
      typeof payload.output !== 'string' ||
      typeof payload.exitCode !== 'number' ||
      !isRecord(payload.context) ||
      typeof payload.context.contextId !== 'string'
    ) {
      return this.invalidPayload(endpoint, payload, 'The CLI response was incomplete.', 'POST', status);
    }
    return payload as unknown as UnifiedCliExecutionResult;
  }

  async execTerminal(command: string, category?: string): Promise<{ output: string; exitCode: number }> {
    const endpoint = '/api/terminal/exec';
    const { payload, status } = await this.requestWithMeta<{ output: string; exitCode: number }>(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, category }),
    });
    if (!isRecord(payload) || typeof payload.output !== 'string' || typeof payload.exitCode !== 'number') {
      return this.invalidPayload(endpoint, payload, 'The terminal response was incomplete.', 'POST', status);
    }
    return { output: payload.output, exitCode: payload.exitCode };
  }

  // Dynamic Networking Lab Engine
  async getScenarioOverview(labIdentifier: string): Promise<ScenarioOverview> {
    return this.requestData<ScenarioOverview>(`/api/scenarios/labs/${encodeURIComponent(labIdentifier)}`);
  }

  async runScenario(labIdentifier: string, scenarioSlug: string): Promise<ScenarioOverview> {
    return this.requestData<ScenarioOverview>(`/api/scenarios/labs/${encodeURIComponent(labIdentifier)}/run`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ scenarioSlug }),
    });
  }

  async verifyScenario(labIdentifier: string): Promise<ScenarioOverview> {
    return this.requestData<ScenarioOverview>(`/api/scenarios/labs/${encodeURIComponent(labIdentifier)}/verify`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
  }

  async remediateScenario(labIdentifier: string): Promise<ScenarioOverview> {
    return this.requestData<ScenarioOverview>(`/api/scenarios/labs/${encodeURIComponent(labIdentifier)}/remediate`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
  }

  async resetScenario(labIdentifier: string): Promise<ScenarioOverview> {
    return this.requestData<ScenarioOverview>(`/api/scenarios/labs/${encodeURIComponent(labIdentifier)}/runtime`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
  }

  async getNetworkingLabs(projectSlug?: string): Promise<NetworkingLabSummary[]> {
    const params = new URLSearchParams();
    if (projectSlug) params.set('projectSlug', projectSlug);
    const query = params.toString();
    return this.requestArray<NetworkingLabSummary>(`/api/network/labs${query ? `?${query}` : ''}`);
  }

  async getNetworkingLab(identifier: string): Promise<NetworkingLabState> {
    return this.requestData<NetworkingLabState>(`/api/network/labs/${encodeURIComponent(identifier)}`);
  }

  async getNetworkingDevice(identifier: string, deviceKey: string): Promise<NetworkingDeviceState> {
    return this.requestData<NetworkingDeviceState>(
      `/api/network/labs/${encodeURIComponent(identifier)}/devices/${encodeURIComponent(deviceKey)}`,
    );
  }

  async traceNetworkingPath(
    labIdentifier: string,
    sourceDeviceKey: string,
    targetDeviceKey: string,
    protocol = 'ICMP',
  ): Promise<NetworkingPathTrace> {
    return this.requestData<NetworkingPathTrace>(
      `/api/network/labs/${encodeURIComponent(labIdentifier)}/trace`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceDeviceKey, targetDeviceKey, protocol }),
      },
    );
  }

  async getNetworkingOperations(identifier: string): Promise<NetworkingOperationsSnapshot> {
    return this.requestData<NetworkingOperationsSnapshot>(
      `/api/network/labs/${encodeURIComponent(identifier)}/operations`,
    );
  }

  async lookupNetworkingRoute(
    identifier: string,
    destination: string,
    deviceKey?: string,
  ): Promise<NetworkingRouteLookup> {
    const params = new URLSearchParams({ destination });
    if (deviceKey) params.set('deviceKey', deviceKey);
    return this.requestData<NetworkingRouteLookup>(
      `/api/network/labs/${encodeURIComponent(identifier)}/route-lookup?${params.toString()}`,
    );
  }

  async analyzeNetworkingPath(
    identifier: string,
    sourceDeviceKey: string,
    targetDeviceKey: string,
    protocol = 'ICMP',
  ): Promise<NetworkingOperationalPathAnalysis> {
    return this.requestData<NetworkingOperationalPathAnalysis>(
      `/api/network/labs/${encodeURIComponent(identifier)}/analyze-path`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceDeviceKey, targetDeviceKey, protocol }),
      },
    );
  }

  async getNetworkingContext(identifier: string, deviceKey?: string): Promise<NetworkingOperatorContext> {
    const params = new URLSearchParams();
    if (deviceKey) params.set('deviceKey', deviceKey);
    const query = params.toString();
    return this.requestData<NetworkingOperatorContext>(
      `/api/network/labs/${encodeURIComponent(identifier)}/context${query ? `?${query}` : ''}`,
    );
  }


  // Dynamic Linux Lab Engine
  async getLinuxLabs(projectSlug?: string): Promise<LinuxLabSummary[]> {
    const params = new URLSearchParams();
    if (projectSlug) params.set('projectSlug', projectSlug);
    const query = params.toString();
    return this.requestArray<LinuxLabSummary>(`/api/linux/labs${query ? `?${query}` : ''}`);
  }

  async getLinuxLab(identifier: string): Promise<LinuxLabState> {
    return this.requestData<LinuxLabState>(`/api/linux/labs/${encodeURIComponent(identifier)}`);
  }

  async getLinuxHost(identifier: string, hostKey: string): Promise<LinuxHostState> {
    return this.requestData<LinuxHostState>(
      `/api/linux/labs/${encodeURIComponent(identifier)}/hosts/${encodeURIComponent(hostKey)}`,
    );
  }

  async getLinuxOperations(identifier: string, hostKey?: string): Promise<LinuxOperationsSnapshot> {
    const params = new URLSearchParams();
    if (hostKey) params.set('hostKey', hostKey);
    const query = params.toString();
    return this.requestData<LinuxOperationsSnapshot>(
      `/api/linux/labs/${encodeURIComponent(identifier)}/operations${query ? `?${query}` : ''}`,
    );
  }

  async getLinuxContext(identifier: string, hostKey?: string): Promise<LinuxOperatorContext> {
    const params = new URLSearchParams();
    if (hostKey) params.set('hostKey', hostKey);
    const query = params.toString();
    return this.requestData<LinuxOperatorContext>(
      `/api/linux/labs/${encodeURIComponent(identifier)}/context${query ? `?${query}` : ''}`,
    );
  }

  // Dynamic DevOps Lab Engine
  async getDevOpsLabs(projectSlug?: string): Promise<DevOpsLabSummary[]> {
    const params = new URLSearchParams();
    if (projectSlug) params.set('projectSlug', projectSlug);
    const query = params.toString();
    return this.requestArray<DevOpsLabSummary>(`/api/devops/labs${query ? `?${query}` : ''}`);
  }

  async getDevOpsLab(identifier: string): Promise<DevOpsLabState> {
    return this.requestData<DevOpsLabState>(`/api/devops/labs/${encodeURIComponent(identifier)}`);
  }

  async getDevOpsPipeline(identifier: string, pipelineId: string): Promise<DevOpsPipelineState> {
    return this.requestData<DevOpsPipelineState>(
      `/api/devops/labs/${encodeURIComponent(identifier)}/pipelines/${encodeURIComponent(pipelineId)}`,
    );
  }


  async getDevOpsOperations(identifier: string): Promise<DevOpsOperationsSnapshot> {
    return this.requestData<DevOpsOperationsSnapshot>(
      `/api/devops/labs/${encodeURIComponent(identifier)}/operations`,
    );
  }

  async getDevOpsContext(identifier: string, pipelineId?: string): Promise<DevOpsOperatorContext> {
    const params = new URLSearchParams();
    if (pipelineId) params.set('pipelineId', pipelineId);
    const query = params.toString();
    return this.requestData<DevOpsOperatorContext>(
      `/api/devops/labs/${encodeURIComponent(identifier)}/context${query ? `?${query}` : ''}`,
    );
  }

  // Compatibility methods retained for existing integrations.
  async getTopology(labIdentifier?: string): Promise<TopologyData> {
    const params = new URLSearchParams();
    if (labIdentifier) params.set('lab', labIdentifier);
    const query = params.toString();
    return this.requestData<TopologyData>(`/api/network/topology${query ? `?${query}` : ''}`);
  }

  async simulatePacket(
    sourceId: string,
    targetId: string,
    protocol?: string,
    labIdentifier?: string,
  ): Promise<NetworkingPathTrace> {
    if (labIdentifier) return this.traceNetworkingPath(labIdentifier, sourceId, targetId, protocol ?? 'ICMP');
    return this.requestData<NetworkingPathTrace>('/api/network/simulate-packet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceId, targetId, protocol }),
    });
  }

  // Contact & Inquiries
  async sendContact(data: { name: string; email: string; subject?: string; message: string; category?: string }): Promise<any> {
    return this.requestEnvelope('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async submitContact(data: { name: string; email: string; subject?: string; message: string; category?: string }): Promise<any> {
    return this.sendContact(data);
  }

  async getInquiries(): Promise<ContactInquiry[]> {
    return this.requestArray<ContactInquiry>('/api/contact/inquiries', {
      headers: this.getHeaders(),
    });
  }

  async getAuditLogs(limit = 100): Promise<AdminAuditLog[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    return this.requestArray<AdminAuditLog>(`/api/admin/audit?${params.toString()}`, {
      headers: this.getHeaders(),
    });
  }

  async updateInquiryStatus(id: string, status: string): Promise<boolean> {
    await this.requestEnvelope(`/api/contact/inquiries/${id}/status`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ status }),
    });
    return true;
  }

  // Canonical Lab Platform / Admin Orchestrator
  async getAdminLabs(projectId?: string): Promise<LabRecord[]> {
    const params = new URLSearchParams();
    if (projectId) params.set('projectId', projectId);
    const query = params.toString();
    return this.requestArray<LabRecord>(`/api/labs/admin${query ? `?${query}` : ''}`, {
      headers: this.getHeaders(),
    });
  }

  async getAdminLab(identifier: string): Promise<LabAggregate> {
    return this.requestData<LabAggregate>(`/api/labs/admin/${identifier}`, { headers: this.getHeaders() });
  }

  async getLabManifestPreview(identifier: string): Promise<CanonicalLabManifestV1> {
    return this.requestData<CanonicalLabManifestV1>(`/api/labs/admin/${identifier}/manifest`, { headers: this.getHeaders() });
  }

  async getLabInputRegistry(domain: LabDomain): Promise<LabInputTypeDefinition[]> {
    return this.requestArray<LabInputTypeDefinition>(`/api/labs/registry/${domain}`);
  }

  async createLab(lab: Partial<LabRecord>): Promise<LabRecord> {
    return this.requestData<LabRecord>('/api/labs', {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify(lab),
    });
  }

  async updateLab(id: string, lab: Partial<LabRecord>): Promise<LabRecord> {
    return this.requestData<LabRecord>(`/api/labs/${id}`, {
      method: 'PUT', headers: this.getHeaders(), body: JSON.stringify(lab),
    });
  }

  async deleteLab(id: string): Promise<void> {
    await this.requestEnvelope(`/api/labs/${id}`, { method: 'DELETE', headers: this.getHeaders() });
  }

  async createLabInput(labId: string, input: Partial<LabInputRecord>): Promise<LabInputRecord> {
    return this.requestData<LabInputRecord>(`/api/labs/${labId}/inputs`, {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify(input),
    });
  }

  async updateLabInput(labId: string, inputId: string, input: Partial<LabInputRecord>): Promise<LabInputRecord> {
    return this.requestData<LabInputRecord>(`/api/labs/${labId}/inputs/${inputId}`, {
      method: 'PUT', headers: this.getHeaders(), body: JSON.stringify(input),
    });
  }

  async deleteLabInput(labId: string, inputId: string): Promise<void> {
    await this.requestEnvelope(`/api/labs/${labId}/inputs/${inputId}`, { method: 'DELETE', headers: this.getHeaders() });
  }

  async replaceLabTopology(
    labId: string,
    nodes: Array<Partial<LabNodeRecord>>,
    links: Array<Partial<LabLinkRecord>>,
  ): Promise<{ nodes: LabNodeRecord[]; links: LabLinkRecord[] }> {
    return this.requestData<{ nodes: LabNodeRecord[]; links: LabLinkRecord[] }>(`/api/labs/${labId}/topology`, {
      method: 'PUT', headers: this.getHeaders(), body: JSON.stringify({ nodes, links }),
    });
  }

  async createLabScenario(labId: string, scenario: Partial<LabScenarioRecord>): Promise<LabScenarioRecord> {
    return this.requestData<LabScenarioRecord>(`/api/labs/${labId}/scenarios`, {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify(scenario),
    });
  }

  async updateLabScenario(labId: string, scenarioId: string, scenario: Partial<LabScenarioRecord>): Promise<LabScenarioRecord> {
    return this.requestData<LabScenarioRecord>(`/api/labs/${labId}/scenarios/${scenarioId}`, {
      method: 'PUT', headers: this.getHeaders(), body: JSON.stringify(scenario),
    });
  }

  async deleteLabScenario(labId: string, scenarioId: string): Promise<void> {
    await this.requestEnvelope(`/api/labs/${labId}/scenarios/${scenarioId}`, { method: 'DELETE', headers: this.getHeaders() });
  }

  async createLabRunbookStep(labId: string, step: Partial<LabRunbookStepRecord>): Promise<LabRunbookStepRecord> {
    return this.requestData<LabRunbookStepRecord>(`/api/labs/${labId}/runbook`, {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify(step),
    });
  }

  async updateLabRunbookStep(labId: string, stepId: string, step: Partial<LabRunbookStepRecord>): Promise<LabRunbookStepRecord> {
    return this.requestData<LabRunbookStepRecord>(`/api/labs/${labId}/runbook/${stepId}`, {
      method: 'PUT', headers: this.getHeaders(), body: JSON.stringify(step),
    });
  }

  async deleteLabRunbookStep(labId: string, stepId: string): Promise<void> {
    await this.requestEnvelope(`/api/labs/${labId}/runbook/${stepId}`, { method: 'DELETE', headers: this.getHeaders() });
  }

  async createLabEvidence(labId: string, evidence: Partial<LabEvidenceRecord>): Promise<LabEvidenceRecord> {
    return this.requestData<LabEvidenceRecord>(`/api/labs/${labId}/evidence`, {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify(evidence),
    });
  }

  async updateLabEvidence(labId: string, evidenceId: string, evidence: Partial<LabEvidenceRecord>): Promise<LabEvidenceRecord> {
    return this.requestData<LabEvidenceRecord>(`/api/labs/${labId}/evidence/${evidenceId}`, {
      method: 'PUT', headers: this.getHeaders(), body: JSON.stringify(evidence),
    });
  }

  async deleteLabEvidence(labId: string, evidenceId: string): Promise<void> {
    await this.requestEnvelope(`/api/labs/${labId}/evidence/${evidenceId}`, { method: 'DELETE', headers: this.getHeaders() });
  }

  // Phase 8 Portfolio Orchestrator
  async getOrchestratorDashboard(): Promise<OrchestratorDashboardSummary> {
    return this.requestData<OrchestratorDashboardSummary>('/api/admin/orchestrator/dashboard', { headers: this.getHeaders() });
  }

  async getOrchestratorProjects(): Promise<OrchestratorProjectRecord[]> {
    return this.requestArray<OrchestratorProjectRecord>('/api/admin/orchestrator/projects', { headers: this.getHeaders() });
  }

  async getOrchestratorProject(projectId: string): Promise<OrchestratorProjectAggregate> {
    return this.requestData<OrchestratorProjectAggregate>(`/api/admin/orchestrator/projects/${encodeURIComponent(projectId)}`, { headers: this.getHeaders() });
  }

  async createOrchestratorProject(input: Record<string, unknown>): Promise<OrchestratorProjectAggregate> {
    return this.requestData<OrchestratorProjectAggregate>('/api/admin/orchestrator/projects', {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify(input),
    });
  }

  async updateOrchestratorProject(projectId: string, input: Record<string, unknown>): Promise<OrchestratorProjectAggregate> {
    return this.requestData<OrchestratorProjectAggregate>(`/api/admin/orchestrator/projects/${encodeURIComponent(projectId)}`, {
      method: 'PATCH', headers: this.getHeaders(), body: JSON.stringify(input),
    });
  }

  async duplicateOrchestratorProject(projectId: string, input: { slug?: string; title?: string } = {}): Promise<OrchestratorProjectAggregate> {
    return this.requestData<OrchestratorProjectAggregate>(`/api/admin/orchestrator/projects/${encodeURIComponent(projectId)}/duplicate`, {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify(input),
    });
  }

  async reorderOrchestratorProjects(items: OrchestratorReorderItem[]): Promise<OrchestratorProjectRecord[]> {
    return this.requestData<OrchestratorProjectRecord[]>('/api/admin/orchestrator/projects/reorder', {
      method: 'PUT', headers: this.getHeaders(), body: JSON.stringify({ items }),
    });
  }

  async validateOrchestratorProject(projectId: string): Promise<OrchestratorValidationReport> {
    return this.requestData<OrchestratorValidationReport>(`/api/admin/orchestrator/projects/${encodeURIComponent(projectId)}/validate`, {
      method: 'POST', headers: this.getHeaders(), body: '{}',
    });
  }

  async previewOrchestratorProject(projectId: string): Promise<OrchestratorProjectPreview> {
    return this.requestData<OrchestratorProjectPreview>(`/api/admin/orchestrator/projects/${encodeURIComponent(projectId)}/preview`, { headers: this.getHeaders() });
  }

  async publishOrchestratorProject(projectId: string, input: { expectedProjectRevision: number; expectedLabRevisions: Record<string, number>; readyLabIds: string[] }): Promise<unknown> {
    return this.requestData<unknown>(`/api/admin/orchestrator/projects/${encodeURIComponent(projectId)}/publish`, {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify(input),
    });
  }

  async archiveOrchestratorProject(projectId: string, expectedRevision: number): Promise<OrchestratorProjectAggregate> {
    return this.requestData<OrchestratorProjectAggregate>(`/api/admin/orchestrator/projects/${encodeURIComponent(projectId)}/archive`, {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify({ expectedRevision }),
    });
  }

  async restoreOrchestratorProject(projectId: string, expectedRevision: number, lifecycleStatus: 'COMPLETED' | 'IN_PROGRESS' | 'PLANNED'): Promise<OrchestratorProjectAggregate> {
    return this.requestData<OrchestratorProjectAggregate>(`/api/admin/orchestrator/projects/${encodeURIComponent(projectId)}/restore-draft`, {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify({ expectedRevision, lifecycleStatus }),
    });
  }

  async exportOrchestratorProject(projectId: string): Promise<unknown> {
    return this.request<unknown>(`/api/admin/orchestrator/projects/${encodeURIComponent(projectId)}/export`, { headers: this.getHeaders() });
  }

  async createOrchestratorLab(projectId: string, input: Record<string, unknown>): Promise<OrchestratorProjectAggregate> {
    return this.requestData<OrchestratorProjectAggregate>(`/api/admin/orchestrator/projects/${encodeURIComponent(projectId)}/labs`, {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify(input),
    });
  }

  async updateOrchestratorLab(labId: string, input: Record<string, unknown>): Promise<LabAggregate> {
    return this.requestData<LabAggregate>(`/api/admin/orchestrator/labs/${encodeURIComponent(labId)}`, {
      method: 'PATCH', headers: this.getHeaders(), body: JSON.stringify(input),
    });
  }

  async duplicateOrchestratorLab(labId: string, input: { projectId?: string; slug?: string; title?: string } = {}): Promise<LabAggregate> {
    return this.requestData<LabAggregate>(`/api/admin/orchestrator/labs/${encodeURIComponent(labId)}/duplicate`, {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify(input),
    });
  }

  async reorderOrchestratorLabs(projectId: string, items: OrchestratorReorderItem[]): Promise<LabAggregate[]> {
    return this.requestData<LabAggregate[]>(`/api/admin/orchestrator/projects/${encodeURIComponent(projectId)}/labs/reorder`, {
      method: 'PUT', headers: this.getHeaders(), body: JSON.stringify({ items }),
    });
  }

  async validateOrchestratorLab(labId: string): Promise<OrchestratorValidationReport> {
    return this.requestData<OrchestratorValidationReport>(`/api/admin/orchestrator/labs/${encodeURIComponent(labId)}/validate`, {
      method: 'POST', headers: this.getHeaders(), body: '{}',
    });
  }

  async previewOrchestratorLab(labId: string): Promise<OrchestratorProjectPreview['labs'][number]> {
    return this.requestData<OrchestratorProjectPreview['labs'][number]>(`/api/admin/orchestrator/labs/${encodeURIComponent(labId)}/preview`, { headers: this.getHeaders() });
  }

  async markOrchestratorLabReady(labId: string, expectedRevision: number): Promise<{ lab: LabAggregate; validation: OrchestratorValidationReport }> {
    return this.requestData<{ lab: LabAggregate; validation: OrchestratorValidationReport }>(`/api/admin/orchestrator/labs/${encodeURIComponent(labId)}/mark-ready`, {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify({ expectedRevision }),
    });
  }

  async archiveOrchestratorLab(labId: string, expectedRevision: number): Promise<{ lab: LabAggregate; deletedRuntimes: number }> {
    return this.requestData<{ lab: LabAggregate; deletedRuntimes: number }>(`/api/admin/orchestrator/labs/${encodeURIComponent(labId)}/archive`, {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify({ expectedRevision }),
    });
  }

  async resetOrchestratorLabRuntimes(labId: string): Promise<{ deletedRuntimes: number }> {
    return this.requestData<{ deletedRuntimes: number }>(`/api/admin/orchestrator/labs/${encodeURIComponent(labId)}/reset-runtimes`, {
      method: 'POST', headers: this.getHeaders(), body: '{}',
    });
  }

  async exportOrchestratorLab(labId: string): Promise<unknown> {
    return this.request<unknown>(`/api/admin/orchestrator/labs/${encodeURIComponent(labId)}/export`, { headers: this.getHeaders() });
  }

  async exportNetworkingCompanion(labId: string): Promise<unknown> {
    return this.request<unknown>(`/api/admin/orchestrator/labs/${encodeURIComponent(labId)}/export?format=networking-companion`, { headers: this.getHeaders() });
  }

  async deleteOrchestratorProject(projectId: string, confirmation: string): Promise<void> {
    await this.requestEnvelope(`/api/admin/orchestrator/projects/${encodeURIComponent(projectId)}`, {
      method: 'DELETE', headers: this.getHeaders(), body: JSON.stringify({ confirmation }),
    });
  }

  async deleteOrchestratorLab(labId: string, confirmation: string): Promise<void> {
    await this.requestEnvelope(`/api/admin/orchestrator/labs/${encodeURIComponent(labId)}`, {
      method: 'DELETE', headers: this.getHeaders(), body: JSON.stringify({ confirmation }),
    });
  }

  async orchestratorImportDryRun(bundle: unknown, conflictMode: 'REJECT' | 'RENAME' = 'REJECT', targetProjectId?: string): Promise<OrchestratorImportDryRunResult> {
    return this.requestData<OrchestratorImportDryRunResult>('/api/admin/orchestrator/import/dry-run', {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify({ bundle, conflictMode, targetProjectId }),
    });
  }

  async orchestratorImport(bundle: unknown, conflictMode: 'REJECT' | 'RENAME' = 'REJECT', targetProjectId?: string): Promise<OrchestratorImportResult> {
    return this.requestData<OrchestratorImportResult>('/api/admin/orchestrator/import', {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify({ bundle, conflictMode, targetProjectId }),
    });
  }

  async getOrchestratorArtifacts(query: { projectId?: string; labId?: string; isPublic?: boolean; mimeType?: string; storageProvider?: string } = {}): Promise<OrchestratorArtifactAdminRecord[]> {
    const params = new URLSearchParams();
    if (query.projectId) params.set('projectId', query.projectId);
    if (query.labId) params.set('labId', query.labId);
    if (query.isPublic !== undefined) params.set('isPublic', String(query.isPublic));
    if (query.mimeType) params.set('mimeType', query.mimeType);
    if (query.storageProvider) params.set('storageProvider', query.storageProvider);
    const suffix = params.toString();
    return this.requestArray<OrchestratorArtifactAdminRecord>(`/api/admin/orchestrator/artifacts${suffix ? `?${suffix}` : ''}`, { headers: this.getHeaders() });
  }

  async updateOrchestratorArtifact(artifactId: string, input: Record<string, unknown>): Promise<OrchestratorArtifactAdminRecord> {
    return this.requestData<OrchestratorArtifactAdminRecord>(`/api/admin/orchestrator/artifacts/${encodeURIComponent(artifactId)}`, {
      method: 'PATCH', headers: this.getHeaders(), body: JSON.stringify(input),
    });
  }

  async deleteOrchestratorArtifact(artifactId: string): Promise<void> {
    await this.requestEnvelope(`/api/admin/orchestrator/artifacts/${encodeURIComponent(artifactId)}`, { method: 'DELETE', headers: this.getHeaders() });
  }

  // Architecture Blueprint
  async getBlueprint(): Promise<any> {
    return this.requestData<any>('/api/architecture/blueprint');
  }
}

export const api = new ApiClient();
