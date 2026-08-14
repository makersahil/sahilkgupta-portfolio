import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  Clock,
  Tag,
  Search,
  Eye,
  ArrowUpRight,
  X,
  Copy,
  Check,
  Terminal,
  Calendar,
  Share2,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { usePortfolio } from '../context/PortfolioContext.js';
import { BlogPost } from '../types.js';

export const TechnicalBlog: React.FC = () => {
  const {
    blogs,
    activeCategory,
    activeBlogModal,
    setActiveBlogModal,
    showToast,
  } = usePortfolio();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const filteredBlogs = blogs.filter((blog) => {
    const matchesCategory = !activeCategory || blog.categoryId === activeCategory.id;
    const matchesSearch =
      !searchQuery ||
      blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      blog.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = !selectedTag || blog.tags.includes(selectedTag);
    return matchesCategory && matchesSearch && matchesTag;
  });

  const handleShare = (blog: BlogPost) => {
    navigator.clipboard.writeText(`${window.location.origin}/#blog-${blog.slug}`);
    setCopiedLink(true);
    showToast('Article link copied to clipboard', 'success');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <section id="blog-section" className="py-14 border-b border-white/10 bg-[#0a0a0c]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded text-[10px] font-mono bg-black/60 text-[#00d4ff] border border-white/10 uppercase tracking-widest mb-2">
              <BookOpen className="w-3.5 h-3.5 text-[#00d4ff]" />
              <span>Engineering Notes &bull; Systems Architecture</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight uppercase">
              Technical Articles &amp; Deep Dives
            </h2>
            <p className="text-sm text-white/60 max-w-2xl mt-1">
              In-depth architectural breakdowns covering BGP traffic engineering, Linux kernel SELinux diagnostics, and high-performance eBPF networking.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search articles, tags..."
              className="w-full bg-black border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-[#00d4ff]"
            />
          </div>
        </div>

        {/* Blog Post Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBlogs.map((blog) => (
            <motion.article
              key={blog.id}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className="rounded-xl bg-[#111114] border border-white/10 hover:border-[#00d4ff]/40 overflow-hidden flex flex-col justify-between transition-all hover:shadow-[0_0_25px_rgba(0,212,255,0.1)]"
            >
              {/* Cover Image */}
              {blog.coverImageUrl && (
                <div className="h-44 bg-black overflow-hidden border-b border-white/10 relative">
                  <img
                    src={blog.coverImageUrl}
                    alt={blog.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity"
                  />
                  <div className="absolute bottom-2 left-2 flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-black/80 text-[#00d4ff] border border-[#00d4ff]/30 backdrop-blur-sm flex items-center gap-1 uppercase">
                      <Clock className="w-3 h-3 text-[#00d4ff]" />
                      {blog.readTimeMinutes} min read
                    </span>
                  </div>
                </div>
              )}

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-[11px] font-mono text-white/40">
                    <Calendar className="w-3 h-3 text-[#00d4ff]" />
                    <span>{new Date(blog.publishedAt).toLocaleDateString()}</span>
                    <span>&bull;</span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {blog.viewCount} views
                    </span>
                  </div>

                  <h3
                    onClick={() => setActiveBlogModal(blog)}
                    className="text-base font-bold font-mono text-white hover:text-[#00d4ff] transition-colors cursor-pointer line-clamp-2"
                  >
                    {blog.title}
                  </h3>

                  <p className="text-xs text-white/60 line-clamp-3 leading-relaxed">
                    {blog.excerpt}
                  </p>
                </div>

                {/* Tag Chips */}
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {blog.tags.map((tag, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTag(selectedTag === tag ? null : tag);
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                        selectedTag === tag
                          ? 'bg-[#00d4ff]/20 text-[#00d4ff] border-[#00d4ff]/40'
                          : 'bg-black text-white/60 border-white/10 hover:text-white'
                      }`}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>

                {/* Read Button */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                  <button
                    onClick={() => setActiveBlogModal(blog)}
                    className="text-[#00d4ff] hover:brightness-125 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1 transition-colors"
                  >
                    <span>Read Full Article</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleShare(blog)}
                    className="p-1.5 rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                    title="Share Article Link"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.article>
          ))}
        </div>

        {/* Article Reader Modal */}
        <AnimatePresence>
          {activeBlogModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-4xl rounded-xl bg-[#111114] border border-white/15 shadow-2xl overflow-hidden font-sans my-8"
              >
                {/* Article Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-[#1a1a1e] border-b border-white/10 font-mono">
                  <div className="flex items-center space-x-2">
                    <Terminal className="w-4 h-4 text-[#00d4ff]" />
                    <span className="text-xs text-white/90 font-bold uppercase tracking-wider">
                      Technical Article &bull; {activeBlogModal.readTimeMinutes} min read
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveBlogModal(null)}
                    className="p-1.5 rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Article Body */}
                <div className="p-6 sm:p-10 space-y-6 max-h-[80vh] overflow-y-auto">
                  <div className="space-y-3 pb-6 border-b border-white/10">
                    <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-white/40">
                      <span>Published {new Date(activeBlogModal.publishedAt).toLocaleDateString()}</span>
                      <span>&bull;</span>
                      <span>Author: Sahil K Gupta (RHCSA, CCNA)</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold font-mono text-white leading-tight uppercase">
                      {activeBlogModal.title}
                    </h1>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {activeBlogModal.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded text-[11px] font-mono bg-black text-[#00d4ff] border border-white/10"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Markdown Renderer */}
                  <div className="markdown-body prose prose-invert max-w-none text-white/80 text-sm sm:text-base leading-relaxed space-y-4 font-sans">
                    <ReactMarkdown>{activeBlogModal.contentMarkdown}</ReactMarkdown>
                  </div>

                  {/* Footer Bar */}
                  <div className="pt-6 border-t border-white/10 flex items-center justify-between font-mono text-xs">
                    <button
                      onClick={() => handleShare(activeBlogModal)}
                      className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-black hover:bg-white/10 text-white/90 border border-white/10 uppercase tracking-wider transition-colors"
                    >
                      <Share2 className="w-3.5 h-3.5 text-[#00d4ff]" />
                      <span>{copiedLink ? 'Link Copied!' : 'Share Article'}</span>
                    </button>

                    <button
                      onClick={() => setActiveBlogModal(null)}
                      className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white border border-white/10 uppercase tracking-wider text-[11px] transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};
