import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Category,
  Project,
  BlogPost,
  Certification,
  Skill,
  AuthUser,
} from '../types.js';
import { api } from '../lib/api.js';

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
  const [isLoading, setIsLoading] = useState(true);

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
    try {
      const [cats, projs, blgs, certs, skls] = await Promise.all([
        api.getCategories(),
        api.getProjects(),
        api.getBlogs(),
        api.getCertifications(),
        api.getSkills(),
      ]);

      setCategories(cats);
      setProjects(projs);
      setBlogs(blgs);
      setCertifications(certs);
      setSkills(skls);

      // Do NOT default to any category if none selected - activeCategory === null means SYSTEM INDEX
      const urlParams = new URLSearchParams(window.location.search);
      const domainParam = urlParams.get('domain');

      if (domainParam) {
        const matched = cats.find(
          (c) =>
            c.slug.toLowerCase() === domainParam.toLowerCase() ||
            c.id.toLowerCase() === domainParam.toLowerCase() ||
            c.name.toLowerCase() === domainParam.toLowerCase()
        );
        if (matched) {
          setActiveCategory(matched);
        }
      } else if (activeCategory) {
        const updatedCurrent = cats.find((c) => c.id === activeCategory.id);
        if (updatedCurrent) {
          setActiveCategory(updatedCurrent);
        }
      }
    } catch (err) {
      console.error('Failed to load portfolio data:', err);
      showToast('Error connecting to backend API', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [activeCategory, showToast]);

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
    refreshData();

    // Check auth
    api.getMe().then((res) => {
      if (res.success && res.user) {
        setUser(res.user);
      }
    }).catch(() => {});
  }, []);

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
    await api.logout();
    setUser(null);
    showToast('Logged out of Admin CMS', 'info');
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
        isLoading,
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
