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
  CiscoLabData,
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

  // Cisco Packet Tracer (.PKT) Upload and Parser
  async uploadPktFile(fileName: string, rawXml?: string, fileSize?: number, projectId?: string): Promise<{ success: boolean; data: CiscoLabData; message: string }> {
    const endpoint = '/api/network/upload-pkt';
    const { payload, status } = await this.requestEnvelopeWithMeta<CiscoLabData>(endpoint, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ fileName, rawXml, fileSize, projectId }),
    });
    if (!payload.data) {
      return this.invalidPayload(
        endpoint,
        payload,
        'The Packet Tracer response did not include parsed lab data.',
        'POST',
        status,
      );
    }
    return payload as { success: boolean; data: CiscoLabData; message: string };
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

  async uploadMedia(data: Partial<MediaAsset>): Promise<MediaAsset> {
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

  // Network Topology
  async getTopology(): Promise<TopologyData> {
    return this.requestData<TopologyData>('/api/network/topology');
  }

  async simulatePacket(sourceId: string, targetId: string, protocol?: string): Promise<any> {
    return this.requestData<any>('/api/network/simulate-packet', {
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

  async getAuditLogs(): Promise<{ success: boolean; data: any[] }> {
    const blueprint = await this.requestData<any>('/api/architecture/blueprint', {
      headers: this.getHeaders(),
    });
    return {
      success: true,
      data: blueprint?.telemetry?.auditLogsSample || [
        { id: 'log-1', action: 'CREATE_PROJECT', entity: 'Project', entityId: 'proj-1', adminEmail: 'sahilkguptaprivate@gmail.com', timestamp: new Date().toISOString() },
        { id: 'log-2', action: 'APPLY_OSPF_CONFIG', entity: 'CiscoRouter', entityId: 'r1', adminEmail: 'sahilkguptaprivate@gmail.com', timestamp: new Date(Date.now() - 3600000).toISOString() },
        { id: 'log-3', action: 'SELINUX_POLICY_RELOAD', entity: 'RHEL9', entityId: 'srv_k8s', adminEmail: 'sahilkguptaprivate@gmail.com', timestamp: new Date(Date.now() - 7200000).toISOString() },
      ],
    };
  }

  async updateInquiryStatus(id: string, status: string): Promise<boolean> {
    await this.requestEnvelope(`/api/contact/inquiries/${id}/status`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ status }),
    });
    return true;
  }

  // Architecture Blueprint
  async getBlueprint(): Promise<any> {
    return this.requestData<any>('/api/architecture/blueprint');
  }
}

export const api = new ApiClient();
