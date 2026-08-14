// Phase 2B persistence migration target.
// Not connected to application routes until CRUD parity is complete.

import { prisma } from '../lib/prisma.js';
import type { 
  Project as PrismaProject, 
  Category as PrismaCategory, 
  BlogPost as PrismaBlogPost,
  Certification as PrismaCertification,
  Skill as PrismaSkill,
  User as PrismaUser,
  Inquiry as PrismaInquiry,
  AuditLog as PrismaAuditLog
} from '@prisma/client';

export class PrismaDatabaseService {
  private notImplemented(): never {
    throw new Error('Not implemented: scheduled for Phase 2B persistence migration');
  }
  
  // --- Categories ---
  public async getCategories() {
    const cats = await prisma.category.findMany({ orderBy: { createdAt: 'asc' } });
    return cats.map(this.mapCategory);
  }

  public async getCategoryBySlug(slug: string) {
    const cat = await prisma.category.findUnique({ where: { slug } });
    return cat ? this.mapCategory(cat) : undefined;
  }

  private mapCategory(c: PrismaCategory) {
    return {
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description || '',
      tagline: c.description || '',
      icon: 'Folder',
      accentColor: 'blue',
      terminalTheme: 'cyan',
      sortOrder: 0,
      isPublished: c.status === 'PUBLISHED',
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    };
  }

  // --- Projects ---
  public async getProjects(categoryId?: string, tag?: string) {
    const where: any = {};
    if (categoryId) where.categoryId = categoryId;
    if (tag) where.tags = { has: tag };

    const projects = await prisma.project.findMany({
      where,
      include: { lab: true },
      orderBy: { createdAt: 'desc' }
    });
    return projects.map(this.mapProject);
  }

  public async getProjectBySlug(slug: string) {
    const p = await prisma.project.findUnique({ where: { slug }, include: { lab: true } });
    return p ? this.mapProject(p) : undefined;
  }

  public async getProjectById(id: string) {
    const p = await prisma.project.findUnique({ where: { id }, include: { lab: true } });
    return p ? this.mapProject(p) : undefined;
  }

  private mapProject(p: any) {
    const base = {
      id: p.id,
      slug: p.slug,
      title: p.title,
      summary: p.summary,
      descriptionMarkdown: p.whatIBuilt || p.mission || '',
      categoryId: p.categoryId,
      status: p.status,
      isFeatured: p.featured,
      sortOrder: 0,
      devopsStack: p.technologies || [],
      tags: p.tags || [],
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      formatType: 'standard'
    };

    if (p.lab) {
      if (p.lab.kind === 'NETWORK_TOPOLOGY') {
        base.formatType = 'cisco_pkt_lab';
        (base as any).ciscoLabData = p.lab.metadata;
      } else if (p.lab.kind === 'LINUX_SYSTEM') {
        base.formatType = 'rhcsa_matrix';
        (base as any).rhcsaMatrixData = p.lab.metadata;
      } else if (p.lab.kind === 'DEVOPS_PIPELINE') {
        base.formatType = 'devops_pipeline';
        (base as any).devopsPipelineData = p.lab.metadata;
      }
    }

    return base;
  }

  // --- Blogs ---
  public async getBlogs(categoryId?: string, tag?: string) {
    const blogs = await prisma.blogPost.findMany({ orderBy: { publishedAt: 'desc' } });
    return blogs.map(this.mapBlog);
  }

  public async getBlogBySlug(slug: string) {
    const b = await prisma.blogPost.findUnique({ where: { slug } });
    return b ? this.mapBlog(b) : undefined;
  }

  private mapBlog(b: PrismaBlogPost) {
    return {
      id: b.id,
      slug: b.slug,
      title: b.title,
      excerpt: b.excerpt,
      contentMarkdown: b.content,
      categoryId: '',
      readTimeMinutes: 5,
      tags: b.tags || [],
      isPublished: b.status === 'PUBLISHED',
      publishedAt: b.publishedAt ? b.publishedAt.toISOString() : b.createdAt.toISOString(),
      viewCount: 0,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    };
  }

  // --- Certs & Skills ---
  public async getCertifications(categoryId?: string) {
    const certs = await prisma.certification.findMany({ orderBy: { sortOrder: 'asc' } });
    return certs.map(c => ({
      id: c.id,
      title: c.title,
      code: c.code,
      issuer: c.issuer,
      credentialId: c.credentialId,
      verificationUrl: c.verificationUrl,
      badgeIcon: c.badgeIcon,
      issueDate: c.issueDate.toISOString(),
      expiryDate: c.expiryDate?.toISOString(),
      categoryId: c.categoryId,
      skillsValidated: c.skillsValidated,
      isFeatured: c.isFeatured,
      sortOrder: c.sortOrder,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));
  }

  public async getSkills(categoryId?: string) {
    const skills = await prisma.skill.findMany({ orderBy: { sortOrder: 'asc' } });
    return skills.map(s => ({
      id: s.id,
      name: s.name,
      level: s.level,
      proficiencyPercent: s.proficiencyPercent,
      yearsOfExperience: s.yearsOfExperience,
      categoryId: s.categoryId,
      iconName: s.iconName,
      terminalSnippet: s.terminalSnippet,
      sortOrder: s.sortOrder,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));
  }

  // Users, Inquiries, etc.
  public async getUserByEmail(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    return user ? this.mapUser(user) : undefined;
  }

  public async getUserById(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    return user ? this.mapUser(user) : undefined;
  }

  public async updateUserLastLogin(id: string) {
    await prisma.user.update({
      where: { id },
      data: { updatedAt: new Date() },
    });
  }

  public async createOrUpdateAdmin(email: string, passwordHash: string | undefined, displayName: string = 'System Admin') {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      if (passwordHash && existing.passwordHash !== passwordHash) {
        return await prisma.user.update({
          where: { email },
          data: { passwordHash }
        });
      }
      return existing;
    }
    return await prisma.user.create({
      data: {
        email,
        displayName,
        passwordHash,
        role: 'SUPER_ADMIN',
        isActive: true,
      }
    });
  }

  private mapUser(u: PrismaUser): import('../../src/types.js').AuthUser & { passwordHash?: string | null } {
    return {
      id: u.id,
      email: u.email,
      fullName: u.displayName,
      role: u.role,
      passwordHash: u.passwordHash,
    };
  }

  public async createProject(data: any) { this.notImplemented(); }
  public async updateProject(id: string, data: any) { this.notImplemented(); }
  public async deleteProject(id: string) { this.notImplemented(); }

  public async getMediaAssets() { this.notImplemented(); }
  
  public async getAuditLogs() { this.notImplemented(); }


  // --- Stubs for Admin CRUD & Network routes ---
  public async createCategory(data: any) { this.notImplemented(); }
  public async updateCategory(id: string, data: any) { this.notImplemented(); }
  public async deleteCategory(id: string) { this.notImplemented(); }

  public async createBlog(data: any) { this.notImplemented(); }
  public async updateBlog(id: string, data: any) { this.notImplemented(); }
  public async deleteBlog(id: string) { this.notImplemented(); }

  public async createCertification(data: any) { this.notImplemented(); }
  public async updateCertification(id: string, data: any) { this.notImplemented(); }
  public async deleteCertification(id: string) { this.notImplemented(); }

  public async createSkill(data: any) { this.notImplemented(); }
  public async updateSkill(id: string, data: any) { this.notImplemented(); }
  public async deleteSkill(id: string) { this.notImplemented(); }

  public async addMediaAsset(data: any) { this.notImplemented(); }
  public async deleteMediaAsset(id: string) { this.notImplemented(); }

  public async getInquiries() { this.notImplemented(); }
  public async addInquiry(data: any) { this.notImplemented(); }
  public async updateInquiryStatus(id: string, status: any) { this.notImplemented(); }

  public async getSystemMetrics() { this.notImplemented(); }
  public async parseAndAttachPktFile(...args: any[]) { this.notImplemented(); }
  public async logAudit(action: string, entity: string, entityId?: string, details?: any) { this.notImplemented(); }
}
export const dbService = new PrismaDatabaseService();
