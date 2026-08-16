import React, { useState, useEffect } from 'react';
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
import { AdminAuditLog, Category, ContactInquiry, BlogPost } from '../../types.js';
import { AdminAuditPanel } from './AdminAuditPanel.js';
import { AdminCertificationManager } from './AdminCertificationManager.js';
import { AdminOrchestrator } from '../AdminOrchestrator/index.js';
import { AdminSkillManager } from './AdminSkillManager.js';

export const AdminModal: React.FC = () => {
  const {
    isAdminModalOpen,
    setIsAdminModalOpen,
    user,
    login,
    logout,
    categories,
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
    'orchestrator' | 'blogs' | 'categories' | 'certifications' | 'skills' | 'inquiries' | 'audit'
  >('orchestrator');

  // Inquiries and Audit Logs state
  const [inquiries, setInquiries] = useState<ContactInquiry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [adminDataLoading, setAdminDataLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form modal states for CRUD
  const [editingBlog, setEditingBlog] = useState<Partial<BlogPost> | null>(null);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);


  useEffect(() => {
    if (user && isAdminModalOpen) {
      loadAdminData();
    }
  }, [user, isAdminModalOpen, activeTab]);

  const loadAdminData = async () => {
    setAdminDataLoading(true);
    try {
      if (activeTab === 'inquiries') {
        setInquiries(await api.getInquiries());
      } else if (activeTab === 'audit') {
        setAuditLogs(await api.getAuditLogs());
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load admin data';
      showToast(message, 'error');
    } finally {
      setAdminDataLoading(false);
    }
  };

  const handleInquiryStatus = async (id: string, status: ContactInquiry['status']) => {
    try {
      await api.updateInquiryStatus(id, status);
      setInquiries(await api.getInquiries());
      showToast(`Inquiry marked ${status}`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update inquiry', 'error');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      await login(email, password);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // --- Blog Handlers ---
  const handleSaveBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !editingBlog?.title?.trim() ||
      !editingBlog.slug?.trim() ||
      !editingBlog.categoryId ||
      !editingBlog.contentMarkdown?.trim()
    ) {
      showToast('Title, Slug, Category, and Article Content are required', 'error');
      return;
    }

    const blogPayload = {
      ...editingBlog,
      title: editingBlog.title.trim(),
      slug: editingBlog.slug.trim(),
    };

    setIsSubmitting(true);
    try {
      if (editingBlog.id) {
        await api.updateBlog(editingBlog.id, blogPayload);
        showToast('Blog article updated', 'success');
      } else {
        await api.createBlog(blogPayload);
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

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('Delete this category? Categories still referenced by portfolio content cannot be deleted.')) return;
    try {
      await api.deleteCategory(id);
      showToast('Portfolio category deleted', 'info');
      await refreshData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to delete category', 'error');
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
                  {user ? `Authenticated: ${user.fullName} (${user.role})` : 'Secured via persistent session + RBAC'}
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
                  onClick={() => setActiveTab('orchestrator')}
                  className={`flex items-center space-x-1.5 pb-2.5 px-3 border-b-2 font-medium transition-colors ${
                    activeTab === 'orchestrator'
                      ? 'border-[#00d4ff] text-[#00d4ff]'
                      : 'border-transparent text-white/40 hover:text-white'
                  }`}
                >
                  <Network className="w-4 h-4" />
                  <span>Portfolio Orchestrator</span>
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
                  onClick={() => setActiveTab('certifications')}
                  className={`flex items-center space-x-1.5 pb-2.5 px-3 border-b-2 font-medium transition-colors ${
                    activeTab === 'certifications' ? 'border-[#00d4ff] text-[#00d4ff]' : 'border-transparent text-white/40 hover:text-white'
                  }`}
                >
                  <Award className="w-4 h-4" />
                  <span>Certifications ({certifications.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('skills')}
                  className={`flex items-center space-x-1.5 pb-2.5 px-3 border-b-2 font-medium transition-colors ${
                    activeTab === 'skills' ? 'border-[#00d4ff] text-[#00d4ff]' : 'border-transparent text-white/40 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Skills ({skills.length})</span>
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
                {activeTab === 'orchestrator' && (
                  <AdminOrchestrator categories={categories} showToast={showToast} canPermanentDelete={user?.role === 'SUPER_ADMIN'} />
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
                            domain: 'NETWORKING',
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
                              Slug: /{c.slug} &bull; Domain: {c.domain || 'UNASSIGNED'} &bull; Icon: {c.icon}
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
                            <button
                              onClick={() => void handleDeleteCategory(c.id)}
                              className="p-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-300"
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

                {activeTab === 'certifications' && (
                  <AdminCertificationManager certifications={certifications} categories={categories} refreshData={refreshData} showToast={showToast} />
                )}

                {activeTab === 'skills' && (
                  <AdminSkillManager skills={skills} categories={categories} refreshData={refreshData} showToast={showToast} />
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
                              <select
                                value={inq.status}
                                onChange={(e) => void handleInquiryStatus(inq.id, e.target.value as ContactInquiry['status'])}
                                className="bg-[#111114] border border-white/10 rounded px-2 py-1 text-[10px] text-[#00ff41]"
                              >
                                <option value="NEW">NEW</option>
                                <option value="READ">READ</option>
                                <option value="RESPONDED">RESPONDED</option>
                                <option value="ARCHIVED">ARCHIVED</option>
                              </select>
                            </div>
                            <p className="text-white/80 text-xs">{inq.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Persisted System Audit Log */}
                {activeTab === 'audit' && (
                  <AdminAuditPanel logs={auditLogs} loading={adminDataLoading} onRefresh={() => void loadAdminData()} />
                )}
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

                  <div>
                    <label className="text-white/60 block mb-1 uppercase tracking-wider text-[10px]">URL Slug</label>
                    <input
                      type="text"
                      value={editingBlog.slug || ''}
                      onChange={(e) => setEditingBlog({ ...editingBlog, slug: e.target.value })}
                      required
                      placeholder="e.g. troubleshooting-bgp-convergence"
                      className="w-full bg-black border border-white/10 rounded px-3 py-2 text-white font-mono focus:outline-none focus:border-[#00d4ff]"
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
                      required
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
                    <label className="text-white/60 block mb-1 uppercase tracking-wider text-[10px]">Engineering Domain</label>
                    <select
                      value={editingCategory.domain || 'NETWORKING'}
                      onChange={(e) =>
                        setEditingCategory({
                          ...editingCategory,
                          domain: e.target.value as Category['domain'],
                        })
                      }
                      className="w-full bg-black border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-[#00d4ff]"
                    >
                      <option value="NETWORKING">Networking</option>
                      <option value="LINUX">Linux</option>
                      <option value="DEVOPS">DevOps</option>
                    </select>
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
