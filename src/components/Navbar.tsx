import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Terminal,
  Server,
  Network,
  ShieldCheck,
  Code2,
  Lock,
  Layers,
  Cpu,
  UserCheck,
  Menu,
  X,
  ChevronRight,
  Sparkles,
  BookOpen,
  Award,
  Mail,
  Workflow,
} from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext.js';

export const Navbar: React.FC = () => {
  const {
    categories,
    activeCategory,
    setActiveCategory,
    user,
    setIsAdminModalOpen,
    isTerminalOpen,
    setIsTerminalOpen,
    setIsArchitectureModalOpen,
    projects,
  } = usePortfolio();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const getCategoryIcon = (iconName: string, className = 'w-3.5 h-3.5') => {
    switch (iconName) {
      case 'Terminal':
        return <Terminal className={className} />;
      case 'Network':
        return <Network className={className} />;
      case 'ServerCog':
      case 'Server':
        return <Server className={className} />;
      case 'ShieldCheck':
        return <ShieldCheck className={className} />;
      case 'Code2':
        return <Code2 className={className} />;
      default:
        return <Layers className={className} />;
    }
  };

  // Compact names for desktop navbar to prevent horizontal crowding
  const getShortName = (name: string) => {
    if (name.toLowerCase().includes('network')) return 'Networking';
    if (name.toLowerCase().includes('linux')) return 'Linux';
    if (name.toLowerCase().includes('devops')) return 'DevOps';
    return name;
  };

  // Dynamic CLI Label based on active domain
  const getCliLabel = () => {
    if (!activeCategory) return 'CLI';
    const name = activeCategory.name.toLowerCase();
    if (name.includes('network')) return 'NetOps CLI';
    if (name.includes('linux')) return 'Linux Shell';
    if (name.includes('devops')) return 'DevOps CLI';
    return 'CLI';
  };

  const navLinks = [
    { label: 'Cisco Lab', href: '#network-topology-section', icon: Network },
    { label: 'DevOps CI/CD', href: '#devops-pipeline-section', icon: Workflow },
    { label: 'Projects', href: '#projects-section', icon: Server },
    { label: 'Skills & Progress', href: '#certifications-section', icon: Award },
    { label: 'Engineering Blog', href: '#technical-blog-section', icon: BookOpen },
    { label: 'Contact', href: '#contact-section', icon: Mail },
  ];

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-[#0a0a0c]/95 border-b border-white/10">
      {/* Top Primary Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand & Personal Identifier */}
          <button
            onClick={() => {
              setActiveCategory(null);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center space-x-3 shrink-0 group py-1 text-left"
            title="Sahil K Gupta - Portfolio Home & System Index"
          >
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-tr from-[#00d4ff] to-[#00ff41] text-black font-mono font-bold text-xs shadow-[0_0_12px_rgba(0,212,255,0.25)] shrink-0 transition-transform group-hover:scale-105">
              <Terminal className="w-5 h-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-mono font-bold text-sm sm:text-base text-white tracking-wider uppercase whitespace-nowrap">
                  Sahil K Gupta
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-black/70 text-[#00ff41] border border-[#00ff41]/30 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00ff41] shadow-[0_0_6px_#00ff41] mr-1 animate-pulse" />
                  SYS ONLINE
                </span>
              </div>
              <p className="text-[10px] text-white/50 font-mono hidden xl:block uppercase tracking-wider truncate">
                Networking &bull; Linux &bull; DevOps
              </p>
            </div>
          </button>

          {/* Large Screen Category Navigation Tabs */}
          <nav className="hidden xl:flex items-center p-1 rounded-lg bg-black/60 border border-white/10 shrink-0">
            <button
              id="nav-cat-tab-all"
              onClick={() => setActiveCategory(null)}
              className={`relative flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                !activeCategory
                  ? 'text-white'
                  : 'text-white/40 hover:text-white/80 hover:bg-white/5'
              }`}
            >
              {!activeCategory && (
                <motion.div
                  layoutId="activeCategoryTab"
                  className="absolute inset-0 rounded-md bg-white/10 border border-white/15 shadow-sm"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className={`relative z-10 ${!activeCategory ? 'text-[#00d4ff]' : ''}`}>
                <Layers className="w-3.5 h-3.5" />
              </span>
              <span className="relative z-10">All</span>
            </button>

            {categories.map((cat) => {
              const isActive = activeCategory?.id === cat.id;
              return (
                <button
                  key={cat.id}
                  id={`nav-cat-tab-${cat.slug}`}
                  onClick={() => setActiveCategory(cat)}
                  className={`relative flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                    isActive
                      ? 'text-white'
                      : 'text-white/40 hover:text-white/80 hover:bg-white/5'
                  }`}
                  title={cat.name}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeCategoryTab"
                      className="absolute inset-0 rounded-md bg-white/10 border border-white/15 shadow-sm"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className={`relative z-10 ${isActive ? 'text-[#00d4ff]' : ''}`}>
                    {getCategoryIcon(cat.icon)}
                  </span>
                  <span className="relative z-10">{getShortName(cat.name)}</span>
                </button>
              );
            })}
          </nav>

          {/* Quick Action Controls */}
          <div className="flex items-center space-x-2 shrink-0">
            {/* Interactive Terminal Toggle */}
            <button
              id="btn-toggle-terminal"
              onClick={() => setIsTerminalOpen(!isTerminalOpen)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all border shrink-0 ${
                isTerminalOpen
                  ? 'bg-[#00ff41]/10 text-[#00ff41] border-[#00ff41]/40 shadow-[0_0_12px_rgba(0,255,65,0.15)]'
                  : 'bg-[#111114] hover:bg-[#1a1a1e] text-white/80 hover:text-white border-white/10'
              }`}
              title="Toggle Interactive CLI Terminal"
            >
              <Terminal className="w-3.5 h-3.5 text-[#00ff41]" />
              <span className="hidden sm:inline font-bold uppercase tracking-wider text-[11px] whitespace-nowrap">
                {getCliLabel()}
              </span>
              <kbd className="hidden lg:inline px-1 py-0.5 text-[9px] bg-black text-white/40 rounded border border-white/10 font-mono">
                ~
              </kbd>
            </button>

            {/* Authenticated Admin Badge (Only displayed when actively logged in) */}
            {user && (
              <button
                id="btn-open-admin-cms"
                onClick={() => setIsAdminModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all border shrink-0 bg-[#00d4ff]/10 text-[#00d4ff] border-[#00d4ff]/40 shadow-[0_0_12px_rgba(0,212,255,0.15)]"
                title="Administrator Session Active"
              >
                <UserCheck className="w-3.5 h-3.5 text-[#00d4ff]" />
                <span className="hidden sm:inline font-bold uppercase tracking-wider text-[11px] whitespace-nowrap">
                  Admin
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#00d4ff] shadow-[0_0_6px_#00d4ff]" />
              </button>
            )}

            {/* Mobile Menu Toggle Button */}
            <button
              id="btn-toggle-mobile-menu"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="xl:hidden flex items-center justify-center w-9 h-9 rounded-lg bg-[#111114] hover:bg-[#1a1a1e] text-white border border-white/10 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="w-4 h-4 text-[#00d4ff]" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Domain Sub-Navbar Filter Strip (Visible on all screens below xl, scrollable & fully touch-friendly) */}
      <div className="xl:hidden border-t border-white/10 bg-black/50 px-4 py-2">
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar scroll-smooth">
          <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest shrink-0 mr-1 hidden sm:inline">
            Domain:
          </span>
          <button
            onClick={() => setActiveCategory(null)}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-mono whitespace-nowrap shrink-0 transition-colors ${
              !activeCategory
                ? 'bg-white/15 text-white border border-white/25 font-bold shadow-sm'
                : 'text-white/40 hover:text-white/80 hover:bg-white/5'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>All Domains ({projects.length})</span>
          </button>
          {categories.map((cat) => {
            const isActive = activeCategory?.id === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat)}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-mono whitespace-nowrap shrink-0 transition-colors ${
                  isActive
                    ? 'bg-white/15 text-white border border-white/25 font-bold shadow-sm'
                    : 'text-white/40 hover:text-white/80 hover:bg-white/5'
                }`}
              >
                {getCategoryIcon(cat.icon, 'w-3 h-3')}
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Drawer / Slide-Down Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="xl:hidden border-t border-white/10 bg-[#0a0a0c]/98 backdrop-blur-xl px-4 py-6 overflow-hidden shadow-2xl"
          >
            <div className="space-y-6 max-w-lg mx-auto">
              {/* Specialization Domains */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest block">
                  Select Domain Focus
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setActiveCategory(null);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-lg text-xs font-mono border transition-all text-left ${
                      !activeCategory
                        ? 'bg-[#111114] border-[#00d4ff] text-white font-bold'
                        : 'bg-black/60 border-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Layers className="w-4 h-4 text-[#00d4ff]" />
                      <span>All Portfolios</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/60">
                      {projects.length}
                    </span>
                  </button>

                  {categories.map((cat) => {
                    const isActive = activeCategory?.id === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setActiveCategory(cat);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`flex items-center justify-between p-2.5 rounded-lg text-xs font-mono border transition-all text-left ${
                          isActive
                            ? 'bg-[#111114] border-[#00d4ff] text-white font-bold'
                            : 'bg-black/60 border-white/10 text-white/60 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center space-x-2 truncate">
                          {getCategoryIcon(cat.icon, 'w-4 h-4 text-[#00d4ff] shrink-0')}
                          <span className="truncate">{cat.name}</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-white/20 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Navigation Jump Anchors */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest block">
                  Portfolio Sections
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {navLinks.map((link) => {
                    const Icon = link.icon;
                    return (
                      <a
                        key={link.href}
                        href={link.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center space-x-2 p-2.5 rounded-lg bg-black/40 border border-white/10 text-white/70 hover:text-white hover:border-white/20 text-xs font-mono transition-colors"
                      >
                        <Icon className="w-3.5 h-3.5 text-[#00d4ff] shrink-0" />
                        <span className="truncate">{link.label}</span>
                      </a>
                    );
                  })}
                </div>
              </div>

              {/* System Quick Action Tools */}
              <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
                <button
                  onClick={() => {
                    setIsTerminalOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center justify-center space-x-2 p-2.5 rounded-lg bg-[#00ff41]/15 border border-[#00ff41]/40 text-[#00ff41] text-xs font-mono uppercase tracking-wider font-bold"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Launch Terminal CLI</span>
                </button>
                {user && (
                  <button
                    onClick={() => {
                      setIsAdminModalOpen(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center justify-center space-x-2 p-2.5 rounded-lg bg-[#00d4ff]/15 border border-[#00d4ff]/40 text-[#00d4ff] text-xs font-mono uppercase tracking-wider font-bold"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Admin CMS Session</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

