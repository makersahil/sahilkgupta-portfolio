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

class ApiClient {
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    const token = localStorage.getItem('nexus_auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  // Auth
  async login(email: string, password: string): Promise<{ success: boolean; token: string; user: AuthUser; message?: string }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('nexus_auth_token', data.token);
    }
    return data;
  }

  async getMe(): Promise<{ success: boolean; user?: AuthUser }> {
    const res = await fetch('/api/auth/me', {
      headers: this.getHeaders(),
    });
    return res.json();
  }

  async logout(): Promise<void> {
    localStorage.removeItem('nexus_auth_token');
    await fetch('/api/auth/logout', { method: 'POST' });
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    const res = await fetch('/api/categories');
    const json = await res.json();
    return json.data || [];
  }

  async createCategory(cat: Partial<Category>): Promise<Category> {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(cat),
    });
    const json = await res.json();
    return json.data;
  }

  async updateCategory(id: string, cat: Partial<Category>): Promise<Category> {
    const res = await fetch(`/api/categories/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(cat),
    });
    const json = await res.json();
    return json.data;
  }

  async deleteCategory(id: string): Promise<boolean> {
    const res = await fetch(`/api/categories/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    const json = await res.json();
    return json.success;
  }

  // Projects
  async getProjects(categoryId?: string, tag?: string): Promise<Project[]> {
    const params = new URLSearchParams();
    if (categoryId) params.append('categoryId', categoryId);
    if (tag) params.append('tag', tag);
    const res = await fetch(`/api/projects?${params.toString()}`);
    const json = await res.json();
    return json.data || [];
  }

  async getProjectBySlug(slug: string): Promise<Project | null> {
    const res = await fetch(`/api/projects/${slug}`);
    const json = await res.json();
    return json.data || null;
  }

  async createProject(project: Partial<Project>): Promise<Project> {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(project),
    });
    const json = await res.json();
    return json.data;
  }

  async updateProject(id: string, project: Partial<Project>): Promise<Project> {
    const res = await fetch(`/api/projects/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(project),
    });
    const json = await res.json();
    return json.data;
  }

  async deleteProject(id: string): Promise<boolean> {
    const res = await fetch(`/api/projects/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    const json = await res.json();
    return json.success;
  }

  // Cisco Packet Tracer (.PKT) Upload and Parser
  async uploadPktFile(fileName: string, rawXml?: string, fileSize?: number, projectId?: string): Promise<{ success: boolean; data: CiscoLabData; message: string }> {
    const res = await fetch('/api/network/upload-pkt', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ fileName, rawXml, fileSize, projectId }),
    });
    return res.json();
  }

  // Blogs
  async getBlogs(categoryId?: string, tag?: string): Promise<BlogPost[]> {
    const params = new URLSearchParams();
    if (categoryId) params.append('categoryId', categoryId);
    if (tag) params.append('tag', tag);
    const res = await fetch(`/api/blogs?${params.toString()}`);
    const json = await res.json();
    return json.data || [];
  }

  async createBlog(blog: Partial<BlogPost>): Promise<BlogPost> {
    const res = await fetch('/api/blogs', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(blog),
    });
    const json = await res.json();
    return json.data;
  }

  async updateBlog(id: string, blog: Partial<BlogPost>): Promise<BlogPost> {
    const res = await fetch(`/api/blogs/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(blog),
    });
    const json = await res.json();
    return json.data;
  }

  async deleteBlog(id: string): Promise<boolean> {
    const res = await fetch(`/api/blogs/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    const json = await res.json();
    return json.success;
  }

  // Certifications
  async getCertifications(categoryId?: string): Promise<Certification[]> {
    const params = new URLSearchParams();
    if (categoryId) params.append('categoryId', categoryId);
    const res = await fetch(`/api/certifications?${params.toString()}`);
    const json = await res.json();
    return json.data || [];
  }

  async createCertification(cert: Partial<Certification>): Promise<Certification> {
    const res = await fetch('/api/certifications', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(cert),
    });
    const json = await res.json();
    return json.data;
  }

  async updateCertification(id: string, cert: Partial<Certification>): Promise<Certification> {
    const res = await fetch(`/api/certifications/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(cert),
    });
    const json = await res.json();
    return json.data;
  }

  async deleteCertification(id: string): Promise<boolean> {
    const res = await fetch(`/api/certifications/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    const json = await res.json();
    return json.success;
  }

  // Skills
  async getSkills(categoryId?: string): Promise<Skill[]> {
    const params = new URLSearchParams();
    if (categoryId) params.append('categoryId', categoryId);
    const res = await fetch(`/api/skills?${params.toString()}`);
    const json = await res.json();
    return json.data || [];
  }

  async createSkill(skill: Partial<Skill>): Promise<Skill> {
    const res = await fetch('/api/skills', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(skill),
    });
    const json = await res.json();
    return json.data;
  }

  async updateSkill(id: string, skill: Partial<Skill>): Promise<Skill> {
    const res = await fetch(`/api/skills/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(skill),
    });
    const json = await res.json();
    return json.data;
  }

  async deleteSkill(id: string): Promise<boolean> {
    const res = await fetch(`/api/skills/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    const json = await res.json();
    return json.success;
  }

  // Media
  async getMedia(): Promise<MediaAsset[]> {
    const res = await fetch('/api/media');
    const json = await res.json();
    return json.data || [];
  }

  async uploadMedia(data: Partial<MediaAsset>): Promise<MediaAsset> {
    const res = await fetch('/api/media/upload', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    return json.data;
  }

  async deleteMedia(id: string): Promise<boolean> {
    const res = await fetch(`/api/media/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    const json = await res.json();
    return json.success;
  }

  // Terminal Exec
  async execTerminal(command: string, category?: string): Promise<{ output: string; exitCode: number }> {
    const res = await fetch('/api/terminal/exec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, category }),
    });
    return res.json();
  }

  // Network Topology
  async getTopology(): Promise<TopologyData> {
    const res = await fetch('/api/network/topology');
    const json = await res.json();
    return json.data;
  }

  async simulatePacket(sourceId: string, targetId: string, protocol?: string): Promise<any> {
    const res = await fetch('/api/network/simulate-packet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceId, targetId, protocol }),
    });
    const json = await res.json();
    return json.data;
  }

  // Contact & Inquiries
  async sendContact(data: { name: string; email: string; subject?: string; message: string; category?: string }): Promise<any> {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  }

  async submitContact(data: { name: string; email: string; subject?: string; message: string; category?: string }): Promise<any> {
    return this.sendContact(data);
  }

  async getInquiries(): Promise<ContactInquiry[]> {
    const res = await fetch('/api/contact/inquiries', {
      headers: this.getHeaders(),
    });
    const json = await res.json();
    return json.data || [];
  }

  async getAuditLogs(): Promise<{ success: boolean; data: any[] }> {
    const res = await fetch('/api/architecture/blueprint', {
      headers: this.getHeaders(),
    });
    const json = await res.json();
    return {
      success: true,
      data: json.data?.telemetry?.auditLogsSample || [
        { id: 'log-1', action: 'CREATE_PROJECT', entity: 'Project', entityId: 'proj-1', adminEmail: 'sahilkguptaprivate@gmail.com', timestamp: new Date().toISOString() },
        { id: 'log-2', action: 'APPLY_OSPF_CONFIG', entity: 'CiscoRouter', entityId: 'r1', adminEmail: 'sahilkguptaprivate@gmail.com', timestamp: new Date(Date.now() - 3600000).toISOString() },
        { id: 'log-3', action: 'SELINUX_POLICY_RELOAD', entity: 'RHEL9', entityId: 'srv_k8s', adminEmail: 'sahilkguptaprivate@gmail.com', timestamp: new Date(Date.now() - 7200000).toISOString() },
      ],
    };
  }

  async updateInquiryStatus(id: string, status: string): Promise<boolean> {
    const res = await fetch(`/api/contact/inquiries/${id}/status`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ status }),
    });
    const json = await res.json();
    return json.success;
  }

  // Architecture Blueprint
  async getBlueprint(): Promise<any> {
    const res = await fetch('/api/architecture/blueprint');
    const json = await res.json();
    return json.data;
  }
}

export const api = new ApiClient();
