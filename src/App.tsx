import React from 'react';
import { PortfolioProvider, usePortfolio } from './context/PortfolioContext.js';
import { Navbar } from './components/Navbar.js';
import { SystemIndex } from './components/SystemIndex.js';
import { DomainWorkspace } from './components/DomainWorkspace.js';
import { Footer } from './components/Footer.js';
import { TerminalEmulator } from './components/TerminalEmulator.js';
import { ArchitectureBlueprintModal } from './components/ArchitectureBlueprintModal.js';
import { AdminModal } from './components/AdminCMS/AdminModal.js';
import { ToastContainer } from './components/ToastContainer.js';
import { DomainSlug } from './config/domainConfig.js';

const AppContent: React.FC = () => {
  const { activeCategory } = usePortfolio();

  const getDomainSlug = (): DomainSlug | null => {
    if (!activeCategory) return null;
    const slug = activeCategory.slug.toLowerCase();
    if (slug.includes('network')) return 'networking';
    if (slug.includes('linux')) return 'linux';
    if (slug.includes('devops')) return 'devops';
    return null;
  };

  const domainSlug = getDomainSlug();

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-[#e0e0e0] flex flex-col font-sans selection:bg-[#00d4ff]/30 selection:text-[#00d4ff]">
      {/* Navigation Bar */}
      <Navbar />

      {/* Main Content: Domain Workspace or Full System Index */}
      <main className="flex-1">
        {domainSlug ? (
          <DomainWorkspace domainSlug={domainSlug} />
        ) : (
          <SystemIndex />
        )}
      </main>

      {/* Global Footer */}
      <Footer />

      {/* Interactive Modals & Floating Overlays */}
      <TerminalEmulator />
      <ArchitectureBlueprintModal />
      <AdminModal />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <PortfolioProvider>
      <AppContent />
    </PortfolioProvider>
  );
}
