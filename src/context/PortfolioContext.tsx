import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  Category,
  Project,
  BlogPost,
  Certification,
  Skill,
  AuthUser,
} from '../types.js';
import { api } from '../lib/api.js';

export type CoreDataStatus = 'loading' | 'error' | 'empty' | 'loaded';

interface ToastInfo {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface PortfolioContextType {
  categories: Category[];
  activeCategory: Category | null;
  setActiveCategory: (cat: Category | null) => void;
  projects: Project[];
  blogs: BlogPost[];
  certifications: Certification[];
  skills: Skill[];
  isLoading: boolean;
  dataStatus: CoreDataStatus;
  dataError: string | null;
  
  // Auth state
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  
  // Modals & Panels
  isAdminModalOpen: boolean;
  setIsAdminModalOpen: (open: boolean) => void;
  isTerminalOpen: boolean;
  setIsTerminalOpen: (open: boolean) => void;
  isArchitectureModalOpen: boolean;
  setIsArchitectureModalOpen: (open: boolean) => void;
  
  activeProjectModal: Project | null;
  setActiveProjectModal: (proj: Project | null) => void;
  activeBlogModal: BlogPost | null;
  setActiveBlogModal: (blog: BlogPost | null) => void;

  // Notification Toast
  toasts: ToastInfo[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  dismissToast: (id: string) => void;

  // Refresh
  refreshData: () => Promise<void>;
}

const PortfolioContext = createContext<PortfolioContextType | null>(null);

export const PortfolioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [dataStatus, setDataStatus] = useState<CoreDataStatus>('loading');
  const [dataError, setDataError] = useState<string | null>(null);
  const loadRequestId = useRef(0);

  // Auth State
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isArchitectureModalOpen, setIsArchitectureModalOpen] = useState(false);
  const [activeProjectModal, setActiveProjectModal] = useState<Project | null>(null);
  const [activeBlogModal, setActiveBlogModal] = useState<BlogPost | null>(null);
  const [toasts, setToasts] = useState<ToastInfo[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch all core data
  const refreshData = useCallback(async () => {
    const requestId = ++loadRequestId.current;
    setDataStatus('loading');
    setDataError(null);

    try {
      const [cats, projs, blgs, certs, skls] = await Promise.all([
        api.getCategories(),
        api.getProjects(),
        api.getBlogs(),
        api.getCertifications(),
        api.getSkills(),
      ]);

      if (requestId !== loadRequestId.current) return;

      setCategories(cats);
      setProjects(projs);
      setBlogs(blgs);
      setCertifications(certs);
      setSkills(skls);

      // Do NOT default to any category if none selected - activeCategory === null means SYSTEM INDEX
      const urlParams = new URLSearchParams(window.location.search);
      const domainParam = urlParams.get('domain');

      setActiveCategory((currentCategory) => {
        if (domainParam) {
          return (
            cats.find(
              (c) =>
                c.slug.toLowerCase() === domainParam.toLowerCase() ||
                c.id.toLowerCase() === domainParam.toLowerCase() ||
                c.name.toLowerCase() === domainParam.toLowerCase()
            ) || null
          );
        }

        if (currentCategory) {
          return cats.find((c) => c.id === currentCategory.id) || null;
        }

        return null;
      });

      const isEmpty = [cats, projs, blgs, certs, skls].every((collection) => collection.length === 0);
      setDataStatus(isEmpty ? 'empty' : 'loaded');
    } catch (err) {
      if (requestId !== loadRequestId.current) return;

      const message = err instanceof Error ? err.message : 'Unknown backend error';
      console.error('Failed to load portfolio data:', err);
      setDataError(message);
      setDataStatus('error');
      showToast(`Portfolio data unavailable: ${message}`, 'error');
    }
  }, [showToast]);

  // Handle URL change when activeCategory updates
  const setCategoryWithUrl = useCallback((cat: Category | null) => {
    setActiveCategory(cat);
    const url = new URL(window.location.href);
    if (cat) {
      url.searchParams.set('domain', cat.slug);
    } else {
      url.searchParams.delete('domain');
    }
    window.history.pushState({}, '', url.toString());
  }, []);

  // Listen to browser forward/backward popstate
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const domainParam = params.get('domain');
      if (!domainParam) {
        setActiveCategory(null);
      } else if (categories.length > 0) {
        const matched = categories.find(
          (c) =>
            c.slug.toLowerCase() === domainParam.toLowerCase() ||
            c.id.toLowerCase() === domainParam.toLowerCase() ||
            c.name.toLowerCase() === domainParam.toLowerCase()
        );
        setActiveCategory(matched || null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [categories]);

  // Initial load & check current auth session
  useEffect(() => {
    void refreshData();

    // Check auth
    api.getMe().then((res) => {
      if (res.success && res.user) {
        setUser(res.user);
      }
    }).catch(() => {
      setUser(null);
    });
  }, [refreshData]);

  const login = async (email: string, pass: string) => {
    try {
      const res = await api.login(email, pass);
      if (res.success && res.user) {
        setUser(res.user);
        showToast(`Authenticated as ${res.user.fullName} (${res.user.role})`, 'success');
        return { success: true };
      } else {
        showToast(res.message || 'Authentication failed', 'error');
        return { success: false, message: res.message };
      }
    } catch (err: any) {
      showToast(err.message || 'Login request failed', 'error');
      return { success: false, message: err.message };
    }
  };

  const logout = async () => {
    try {
      await api.logout();
      showToast('Logged out of Admin CMS', 'info');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Server logout failed';
      showToast(`Local session cleared. ${message}`, 'error');
    } finally {
      setUser(null);
    }
  };

  return (
    <PortfolioContext.Provider
      value={{
        categories,
        activeCategory,
        setActiveCategory: setCategoryWithUrl,
        projects,
        blogs,
        certifications,
        skills,
        isLoading: dataStatus === 'loading',
        dataStatus,
        dataError,
        user,
        isAuthenticated: !!user,
        login,
        logout,
        isAdminModalOpen,
        setIsAdminModalOpen,
        isTerminalOpen,
        setIsTerminalOpen,
        isArchitectureModalOpen,
        setIsArchitectureModalOpen,
        activeProjectModal,
        setActiveProjectModal,
        activeBlogModal,
        setActiveBlogModal,
        toasts,
        showToast,
        dismissToast,
        refreshData,
      }}
    >
      {dataStatus !== 'loaded' && (
        <div
          role={dataStatus === 'error' ? 'alert' : 'status'}
          aria-live="polite"
          className="fixed bottom-4 right-4 z-[80] max-w-sm rounded-lg border border-white/15 bg-[#111114]/95 px-3 py-2.5 font-mono text-xs text-white/70 shadow-2xl backdrop-blur-md"
        >
          <div className="flex items-center gap-3">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                dataStatus === 'loading'
                  ? 'animate-pulse bg-[#00d4ff]'
                  : dataStatus === 'error'
                    ? 'bg-[#ff4100]'
                    : 'bg-amber-400'
              }`}
            />
            <div className="min-w-0 flex-1">
              <span className="block font-bold uppercase tracking-wider text-white">
                {dataStatus === 'loading'
                  ? 'Syncing portfolio data'
                  : dataStatus === 'error'
                    ? 'Portfolio API unavailable'
                    : 'No portfolio records returned'}
              </span>
              {dataStatus === 'error' && dataError && (
                <span className="mt-0.5 block truncate text-[10px] text-white/45" title={dataError}>
                  {dataError}
                </span>
              )}
            </div>
            {(dataStatus === 'error' || dataStatus === 'empty') && (
              <button
                type="button"
                onClick={() => void refreshData()}
                className="rounded border border-[#00d4ff]/40 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#00d4ff] transition-colors hover:bg-[#00d4ff]/10"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      )}
      {children}
    </PortfolioContext.Provider>
  );
};

export const usePortfolio = () => {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
};
