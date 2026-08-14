import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock,
  User,
  Key,
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  Layers,
  FileText,
  Award,
  Database,
  ShieldCheck,
  Mail,
  Activity,
  Upload,
  RefreshCw,
  LogOut,
  Sparkles,
  Network,
  GitBranch,
  Eye,
  EyeOff,
} from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext.js';
import { api } from '../../lib/api.js';
import { Category, Project, BlogPost, Certification, Skill } from '../../types.js';

export const AdminModal: React.FC = () => {
  const {
    isAdminModalOpen,
    setIsAdminModalOpen,
    user,
    login,
    logout,
    categories,
    projects,
    blogs,
    certifications,
    skills,
    refreshData,
    showToast,
  } = usePortfolio();

  // Auth form state
  const [email, setEmail] = useState('sahilkguptaprivate@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Active CMS tab
  const [activeTab, setActiveTab] = useState<
    'projects' | 'blogs' | 'categories' | 'certifications' | 'skills' | 'inquiries' | 'audit'
  >('projects');

  // Inquiries and Audit Logs state
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form modal states for CRUD
  const [editingProject, setEditingProject] = useState<Partial<Project> | null>(null);
  const [editingBlog, setEditingBlog] = useState<Partial<BlogPost> | null>(null);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);

  const pktUploadRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user && isAdminModalOpen) {
      loadAdminData();
    }
  }, [user, isAdminModalOpen, activeTab]);

  const loadAdminData = async () => {
    if (activeTab === 'inquiries') {
      const data = await api.getInquiries();
      setInquiries(Array.isArray(data) ? data : []);
    } else if (activeTab === 'audit') {
      const res = await api.getAuditLogs();
      if (res.success) setAuditLogs(res.data);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    await login(email, password);
    setIsLoggingIn(false);
  };

  // --- Project Handlers ---
  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject?.title || !editingProject.categoryId) {
      showToast('Title and Category are required', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingProject.id) {
        await api.updateProject(editingProject.id, editingProject);
        showToast('Project updated successfully', 'success');
      } else {
        await api.createProject(editingProject);
        showToast('New project created', 'success');
      }
      setEditingProject(null);
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save project', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await api.deleteProject(id);
        showToast('Project deleted', 'info');
        await refreshData();
      } catch (err: any) {
        showToast(err.message || 'Failed to delete project', 'error');
      }
    }
  };

  const handlePktUploadInModal = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text().catch(() => '');
      const res = await api.uploadPktFile(file.name, text, file.size, editingProject?.id);
      if (res.success && editingProject) {
        setEditingProject({
          ...editingProject,
          packetTracerFile: file.name,
          formatType: 'cisco_pkt_lab',
          ciscoLabData: res.data,
        });
        showToast(`Parsed and attached ${file.name} successfully!`, 'success');
      }
    } catch (err) {
      showToast('Uploaded Packet Tracer file', 'info');
    }
  };

  // --- Blog Handlers ---
  const handleSaveBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBlog?.title || !editingBlog.categoryId) {
      showToast('Title and Category are required', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingBlog.id) {
        await api.updateBlog(editingBlog.id, editingBlog);
        showToast('Blog article updated', 'success');
      } else {
        await api.createBlog(editingBlog);
        showToast('Blog article published', 'success');
      }
      setEditingBlog(null);
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save blog post', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBlog = async (id: string) => {
    if (window.confirm('Delete this blog post?')) {
      try {
        await api.deleteBlog(id);
        showToast('Blog post deleted', 'info');
        await refreshData();
      } catch (err: any) {
        showToast(err.message || 'Failed to delete post', 'error');
      }
    }
  };

  // --- Category Handlers ---
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory?.name || !editingCategory.slug) {
      showToast('Name and Slug are required', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingCategory.id) {
        await api.updateCategory(editingCategory.id, editingCategory);
        showToast('Portfolio category updated', 'success');
      } else {
        await api.createCategory(editingCategory);
        showToast('New category created', 'success');
      }
      setEditingCategory(null);
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save category', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAdminModalOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto font-mono">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="w-full max-w-5xl rounded-2xl bg-[#111114] border border-white/15 shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]"
        >
          {/* Titlebar */}
          <div className="flex items-center justify-between px-6 py-4 bg-[#16161a] border-b border-white/10">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-black border border-white/10 text-[#00d4ff]">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm sm:text-base uppercase tracking-tight">
                  Portfolio CMS &amp; Architecture Orchestrator
                </h3>
                <p className="text-xs text-white/50">
                  {user ? `Authenticated: ${user.fullName} (${user.role})` : 'Secured via JWT & Argon2id'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {user && (
                <button
                  onClick={logout}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-black hover:bg-[#ff4100]/20 text-white/70 hover:text-[#ff4100] border border-white/10 hover:border-[#ff4100]/40 text-xs transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              )}
              <button
                onClick={() => setIsAdminModalOpen(false)}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* If NOT logged in: Show Secure Login Form */}
          {!user ? (
            <div className="p-8 max-w-md mx-auto w-full my-auto space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex p-3 rounded-full bg-black border border-[#00d4ff]/40 text-[#00d4ff] mb-2 shadow-[0_0_15px_rgba(0,212,255,0.15)]">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-white uppercase tracking-tight">Admin CMS Portal</h4>
                <p className="text-xs text-white/60 font-sans">
                  Manage multi-format portfolio repositories, Cisco .PKT labs, RHCSA competencies, and engineering articles.
                </p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="text-white/60 block mb-1 uppercase tracking-wider text-[10px]">Admin Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#00d4ff]"
                  />
                </div>

                <div>
                  <label className="text-white/60 block mb-1 uppercase tracking-wider text-[10px]">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Enter administrator password"
                      className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 pr-10 text-white focus:outline-none focus:border-[#00d4ff]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-2.5 rounded-lg bg-[#00d4ff] hover:bg-[#00d4ff]/90 text-black font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  {isLoggingIn ? 'Authenticating...' : 'Sign In as Administrator'}
                </button>
              </form>
            </div>
          ) : (
            /* If Logged In: Full CMS Dashboard */
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* CMS Navigation Tabs */}
              <div className="px-6 bg-[#16161a] border-b border-white/10 flex items-center space-x-2 overflow-x-auto no-scrollbar text-xs pt-2">
                <button
                  onClick={() => setActiveTab('projects')}
                  className={`flex items-center space-x-1.5 pb-2.5 px-3 border-b-2 font-medium transition-colors ${
                    activeTab === 'projects'
                      ? 'border-[#00d4ff] text-[#00d4ff]'
                      : 'border-transparent text-white/40 hover:text-white'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>Projects ({projects.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('blogs')}
                  className={`flex items-center space-x-1.5 pb-2.5 px-3 border-b-2 font-medium transition-colors ${
                    activeTab === 'blogs'
                      ? 'border-[#00d4ff] text-[#00d4ff]'
                      : 'border-transparent text-white/40 hover:text-white'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Blog Posts ({blogs.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('categories')}
                  className={`flex items-center space-x-1.5 pb-2.5 px-3 border-b-2 font-medium transition-colors ${
                    activeTab === 'categories'
                      ? 'border-[#00d4ff] text-[#00d4ff]'
                      : 'border-transparent text-white/40 hover:text-white'
                  }`}
                >
                  <Database className="w-4 h-4" />
                  <span>Categories ({categories.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('inquiries')}
                  className={`flex items-center space-x-1.5 pb-2.5 px-3 border-b-2 font-medium transition-colors ${
                    activeTab === 'inquiries'
                      ? 'border-[#00d4ff] text-[#00d4ff]'
                      : 'border-transparent text-white/40 hover:text-white'
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  <span>Inquiries ({inquiries.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('audit')}
                  className={`flex items-center space-x-1.5 pb-2.5 px-3 border-b-2 font-medium transition-colors ${
                    activeTab === 'audit'
                      ? 'border-[#00d4ff] text-[#00d4ff]'
                      : 'border-transparent text-white/40 hover:text-white'
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  <span>System Audit Log</span>
                </button>
              </div>

              {/* CMS Tab Body */}
              <div className="p-6 overflow-y-auto flex-1 text-xs space-y-4">
                {/* 1. Projects CMS Tab */}
                {activeTab === 'projects' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-white/60 font-semibold">Manage Infrastructure &amp; Code Projects</span>
                      <button
                        onClick={() =>
                          setEditingProject({
                            title: '',
                            slug: '',
                            summary: '',
                            descriptionMarkdown: '## System Overview\n\nDetailed architectural breakdown...',
                            categoryId: categories[0]?.id || '',
                            status: 'COMPLETED',
                            formatType: 'standard',
                            isFeatured: true,
                            devopsStack: ['Linux', 'Docker'],
                            tags: ['infrastructure'],
                          })
                        }
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#00d4ff] hover:bg-[#00d4ff]/90 text-black font-bold uppercase tracking-wider text-[11px] transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add New Project</span>
                      </button>
                    </div>

                    <div className="divide-y divide-white/10 rounded-xl bg-black border border-white/10 overflow-hidden">
                      {projects.map((proj) => (
                        <div
                          key={proj.id}
                          className="p-4 flex items-center justify-between hover:bg-white/[0.03] transition-colors"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-white text-sm">{proj.title}</span>
                              <span className="px-2 py-0.5 rounded text-[10px] bg-[#111114] text-[#00d4ff] border border-white/10 font-mono">
                                {proj.formatType || 'standard'}
                              </span>
                            </div>
                            <p className="text-white/60 text-[11px] max-w-xl truncate">{proj.summary}</p>
                            <div className="flex items-center space-x-2 text-[10px] text-white/40 font-mono">
                              <span>Slug: /{proj.slug}</span>
                              <span>&bull;</span>
                              <span>Stack: {proj.devopsStack.join(', ')}</span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setEditingProject(proj)}
                              className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-white"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteProject(proj.id)}
                              className="p-1.5 rounded bg-white/5 hover:bg-[#ff4100]/20 text-white/70 hover:text-[#ff4100]"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Blog Posts CMS Tab */}
                {activeTab === 'blogs' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-white/60 font-semibold">Technical Articles &amp; Markdown Notes</span>
                      <button
                        onClick={() =>
                          setEditingBlog({
                            title: '',
                            slug: '',
                            excerpt: '',
                            contentMarkdown: '# Article Title\n\nDeep-dive systems engineering notes...',
                            categoryId: categories[0]?.id || '',
                            readTimeMinutes: 5,
                            tags: ['linux', 'networking'],
                            isPublished: true,
                          })
                        }
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#00d4ff] hover:bg-[#00d4ff]/90 text-black font-bold uppercase tracking-wider text-[11px] transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Write Article</span>
                      </button>
                    </div>

                    <div className="divide-y divide-white/10 rounded-xl bg-black border border-white/10 overflow-hidden">
                      {blogs.map((b) => (
                        <div
                          key={b.id}
                          className="p-4 flex items-center justify-between hover:bg-white/[0.03] transition-colors"
                        >
                          <div className="space-y-1">
                            <span className="font-bold text-white text-sm block">{b.title}</span>
                            <p className="text-white/60 text-[11px] max-w-xl truncate">{b.excerpt}</p>
                            <div className="flex items-center space-x-2 text-[10px] text-white/40 font-mono">
                              <span>{b.readTimeMinutes} min read</span>
                              <span>&bull;</span>
                              <span>{b.viewCount} views</span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setEditingBlog(b)}
                              className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-white"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteBlog(b.id)}
                              className="p-1.5 rounded bg-white/5 hover:bg-[#ff4100]/20 text-white/70 hover:text-[#ff4100]"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Categories CMS Tab */}
                {activeTab === 'categories' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-white/60 font-semibold">Multi-Format Portfolio Categories</span>
                      <button
                        onClick={() =>
                          setEditingCategory({
                            name: '',
                            slug: '',
                            description: '',
                            icon: 'Layers',
                            sortOrder: categories.length + 1,
                            isPublished: true,
                          })
                        }
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#00d4ff] hover:bg-[#00d4ff]/90 text-black font-bold uppercase tracking-wider text-[11px] transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Category</span>
                      </button>
                    </div>

                    <div className="divide-y divide-white/10 rounded-xl bg-black border border-white/10 overflow-hidden">
                      {categories.map((c) => (
                        <div
                          key={c.id}
                          className="p-4 flex items-center justify-between hover:bg-white/[0.03] transition-colors"
                        >
                          <div className="space-y-1">
                            <span className="font-bold text-white text-sm block">{c.name}</span>
                            <p className="text-white/60 text-[11px]">{c.description}</p>
                            <div className="text-[10px] text-white/40 font-mono">
                              Slug: /{c.slug} &bull; Icon: {c.icon}
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setEditingCategory(c)}
                              className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-white"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Inquiries CMS Tab */}
                {activeTab === 'inquiries' && (
                  <div className="space-y-4">
                    <span className="text-white/60 font-semibold block">Client &amp; Recruiter Inquiries</span>
                    <div className="divide-y divide-white/10 rounded-xl bg-black border border-white/10 overflow-hidden">
                      {inquiries.length === 0 ? (
                        <div className="p-8 text-center text-white/40">No inquiries received yet.</div>
                      ) : (
                        inquiries.map((inq) => (
                          <div key={inq.id} className="p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white text-sm">{inq.name} ({inq.email})</span>
                              <span className="px-2 py-0.5 rounded text-[10px] bg-[#00ff41]/10 text-[#00ff41]">
                                {inq.status}
                              </span>
                            </div>
                            <p className="text-white/80 text-xs">{inq.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* 5. System Audit Log CMS Tab */}
                {activeTab === 'audit' && (
                  <div className="space-y-4">
                    <span className="text-white/60 font-semibold block">System Architecture Audit Trail</span>
                    <div className="divide-y divide-white/10 rounded-xl bg-black border border-white/10 overflow-hidden font-mono text-[11px]">
                      {auditLogs.map((log) => (
                        <div key={log.id} className="p-3 flex items-center justify-between">
                          <div className="space-x-2">
                            <span className="text-[#00d4ff] font-bold">[{log.action}]</span>
                            <span className="text-white/80">{log.entity}</span>
                            {log.entityId && <span className="text-white/40">({log.entityId})</span>}
                            <span className="text-white/50">by {log.adminEmail}</span>
                          </div>
                          <span className="text-white/40">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sub-Modal: Edit / Add Project with Format Selector & .PKT file upload */}
          {editingProject && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
              <div className="w-full max-w-2xl rounded-xl bg-[#111114] border border-white/15 p-6 space-y-4 my-8">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h4 className="font-bold text-white text-base uppercase tracking-tight">
                    {editingProject.id ? 'Edit Project' : 'Create New Infrastructure Project'}
                  </h4>
                  <button onClick={() => setEditingProject(null)} className="text-white/40 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveProject} className="space-y-3 text-xs">
                  <div>
                    <label className="text-white/60 block mb-1 uppercase tracking-wider text-[10px]">Project Title</label>
                    <input
                      type="text"
                      value={editingProject.title || ''}
                      onChange={(e) => setEditingProject({ ...editingProject, title: e.target.value })}
                      required
                      className="w-full bg-black border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-[#00d4ff]"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-white/60 block mb-1 uppercase tracking-wider text-[10px]">URL Slug</label>
                      <input
                        type="text"
                        value={editingProject.slug || ''}
                        onChange={(e) => setEditingProject({ ...editingProject, slug: e.target.value })}
                        placeholder="e.g. enterprise-bgp-hsrp"
                        className="w-full bg-black border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-[#00d4ff]"
                      />
                    </div>
                    <div>
                      <label className="text-white/60 block mb-1 uppercase tracking-wider text-[10px]">Category</label>
                      <select
                        value={editingProject.categoryId || ''}
                        onChange={(e) => setEditingProject({ ...editingProject, categoryId: e.target.value })}
                        className="w-full bg-black border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-[#00d4ff]"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-white/60 block mb-1 uppercase tracking-wider text-[10px]">Format Type</label>
                      <select
                        value={editingProject.formatType || 'standard'}
                        onChange={(e) => setEditingProject({ ...editingProject, formatType: e.target.value as any })}
                        className="w-full bg-black border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-[#00d4ff]"
                      >
                        <option value="standard">Standard Architecture</option>
                        <option value="cisco_pkt_lab">Cisco .PKT Sandbox Lab</option>
                        <option value="rhcsa_matrix">RHCSA RHEL 9 Matrix</option>
                        <option value="devops_pipeline">GitOps Kubernetes Pipeline</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-white/60 block mb-1 uppercase tracking-wider text-[10px]">Short Summary</label>
                    <input
                      type="text"
                      value={editingProject.summary || ''}
                      onChange={(e) => setEditingProject({ ...editingProject, summary: e.target.value })}
                      required
                      className="w-full bg-black border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-[#00d4ff]"
                    />
                  </div>

                  <div>
                    <label className="text-white/60 block mb-1 uppercase tracking-wider text-[10px]">Detailed Markdown Description</label>
                    <textarea
                      rows={5}
                      value={editingProject.descriptionMarkdown || ''}
                      onChange={(e) =>
                        setEditingProject({ ...editingProject, descriptionMarkdown: e.target.value })
                      }
                      className="w-full bg-black border border-white/10 rounded px-3 py-2 text-white font-mono focus:outline-none focus:border-[#00d4ff]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-white/60 uppercase tracking-wider text-[10px]">Packet Tracer File (.pkt)</label>
                        <button
                          type="button"
                          onClick={() => pktUploadRef.current?.click()}
                          className="text-[10px] text-[#00d4ff] hover:underline flex items-center gap-1"
                        >
                          <Upload className="w-3 h-3" />
                          <span>Parse .PKT</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        value={editingProject.packetTracerFile || ''}
                        onChange={(e) =>
                          setEditingProject({ ...editingProject, packetTracerFile: e.target.value })
                        }
                        placeholder="enterprise_wan_dual_isp.pkt"
                        className="w-full bg-black border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-[#00d4ff]"
                      />
                      <input
                        type="file"
                        ref={pktUploadRef}
                        accept=".pkt,.xml,.txt"
                        onChange={handlePktUploadInModal}
                        className="hidden"
                      />
                    </div>
                    <div>
                      <label className="text-white/60 block mb-1 uppercase tracking-wider text-[10px]">GitHub Repo URL</label>
                      <input
                        type="url"
                        value={editingProject.githubUrl || ''}
                        onChange={(e) => setEditingProject({ ...editingProject, githubUrl: e.target.value })}
                        placeholder="https://github.com/sahilgupta/..."
                        className="w-full bg-black border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-[#00d4ff]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-2 pt-4 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setEditingProject(null)}
                      className="px-3 py-2 rounded bg-white/5 hover:bg-white/10 text-white/70"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 rounded bg-[#00d4ff] hover:bg-[#00d4ff]/90 text-black font-bold uppercase tracking-wider"
                    >
                      {isSubmitting ? 'Saving...' : 'Save Project'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Sub-Modal: Edit / Add Blog */}
          {editingBlog && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
              <div className="w-full max-w-2xl rounded-xl bg-[#111114] border border-white/15 p-6 space-y-4 my-8">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h4 className="font-bold text-white text-base uppercase tracking-tight">
                    {editingBlog.id ? 'Edit Article' : 'Write New Engineering Article'}
                  </h4>
                  <button onClick={() => setEditingBlog(null)} className="text-white/40 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveBlog} className="space-y-3 text-xs">
                  <div>
                    <label className="text-white/60 block mb-1 uppercase tracking-wider text-[10px]">Article Title</label>
                    <input
                      type="text"
                      value={editingBlog.title || ''}
                      onChange={(e) => setEditingBlog({ ...editingBlog, title: e.target.value })}
                      required
                      className="w-full bg-black border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-[#00d4ff]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-white/60 block mb-1 uppercase tracking-wider text-[10px]">Category</label>
                      <select
                        value={editingBlog.categoryId || ''}
                        onChange={(e) => setEditingBlog({ ...editingBlog, categoryId: e.target.value })}
                        className="w-full bg-black border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-[#00d4ff]"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-white/60 block mb-1 uppercase tracking-wider text-[10px]">Read Time (minutes)</label>
                      <input
                        type="number"
                        value={editingBlog.readTimeMinutes || 5}
                        onChange={(e) =>
                          setEditingBlog({ ...editingBlog, readTimeMinutes: parseInt(e.target.value) })
                        }
                        className="w-full bg-black border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-[#00d4ff]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-white/60 block mb-1 uppercase tracking-wider text-[10px]">Excerpt</label>
                    <input
                      type="text"
                      value={editingBlog.excerpt || ''}
                      onChange={(e) => setEditingBlog({ ...editingBlog, excerpt: e.target.value })}
                      required
                      className="w-full bg-black border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-[#00d4ff]"
                    />
                  </div>

                  <div>
                    <label className="text-white/60 block mb-1 uppercase tracking-wider text-[10px]">Markdown Article Content</label>
                    <textarea
                      rows={6}
                      value={editingBlog.contentMarkdown || ''}
                      onChange={(e) => setEditingBlog({ ...editingBlog, contentMarkdown: e.target.value })}
                      className="w-full bg-black border border-white/10 rounded px-3 py-2 text-white font-mono focus:outline-none focus:border-[#00d4ff]"
                    />
                  </div>

                  <div className="flex items-center justify-end space-x-2 pt-4 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setEditingBlog(null)}
                      className="px-3 py-2 rounded bg-white/5 hover:bg-white/10 text-white/70"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 rounded bg-[#00d4ff] hover:bg-[#00d4ff]/90 text-black font-bold uppercase tracking-wider"
                    >
                      {isSubmitting ? 'Saving...' : 'Publish Article'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Sub-Modal: Edit / Add Category */}
          {editingCategory && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
              <div className="w-full max-w-md rounded-xl bg-[#111114] border border-white/15 p-6 space-y-4 my-8">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h4 className="font-bold text-white text-base uppercase tracking-tight">
                    {editingCategory.id ? 'Edit Category' : 'Create New Portfolio Category'}
                  </h4>
                  <button onClick={() => setEditingCategory(null)} className="text-white/40 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveCategory} className="space-y-3 text-xs">
                  <div>
                    <label className="text-white/60 block mb-1 uppercase tracking-wider text-[10px]">Category Name</label>
                    <input
                      type="text"
                      value={editingCategory.name || ''}
                      onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                      required
                      placeholder="e.g. Cyber Security"
                      className="w-full bg-black border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-[#00d4ff]"
                    />
                  </div>

                  <div>
                    <label className="text-white/60 block mb-1 uppercase tracking-wider text-[10px]">URL Slug</label>
                    <input
                      type="text"
                      value={editingCategory.slug || ''}
                      onChange={(e) => setEditingCategory({ ...editingCategory, slug: e.target.value })}
                      required
                      placeholder="e.g. cyber-sec"
                      className="w-full bg-black border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-[#00d4ff]"
                    />
                  </div>

                  <div>
                    <label className="text-white/60 block mb-1 uppercase tracking-wider text-[10px]">Description</label>
                    <textarea
                      rows={3}
                      value={editingCategory.description || ''}
                      onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                      placeholder="Describe the domain specialization..."
                      className="w-full bg-black border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-[#00d4ff]"
                    />
                  </div>

                  <div className="flex items-center justify-end space-x-2 pt-4 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setEditingCategory(null)}
                      className="px-3 py-2 rounded bg-white/5 hover:bg-white/10 text-white/70"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 rounded bg-[#00d4ff] hover:bg-[#00d4ff]/90 text-black font-bold uppercase tracking-wider"
                    >
                      {isSubmitting ? 'Saving...' : 'Save Category'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
