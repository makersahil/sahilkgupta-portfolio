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
      response = await fetch(endpoint, {
        credentials: 'same-origin',
        ...init,
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

  async deleteMedia(id: string): Promise<boolean> {
    await this.requestEnvelope(`/api/media/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return true;
  }

  // Terminal Exec
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
    return payload as { output: string; exitCode: number };
  }

  // Dynamic Networking Lab Engine
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

  // Architecture Blueprint
  async getBlueprint(): Promise<any> {
    return this.requestData<any>('/api/architecture/blueprint');
  }
}

export const api = new ApiClient();
