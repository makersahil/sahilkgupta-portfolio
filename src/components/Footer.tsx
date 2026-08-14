import React from 'react';
import {
  Terminal,
  Activity,
  Shield,
  Layers,
  Database,
  Cpu,
  ArrowUpRight,
  GitBranch,
} from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext.js';

export const Footer: React.FC = () => {
  const { activeCategory, setIsArchitectureModalOpen, setIsTerminalOpen, setIsAdminModalOpen } =
    usePortfolio();

  return (
    <footer className="bg-[#0a0a0c] border-t border-white/10 py-10 font-mono text-xs text-white/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Live System Telemetry Bar */}
        <div className="p-4 rounded-xl bg-[#111114] border border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="space-y-1">
            <span className="text-white/40 text-[10px] block uppercase tracking-wider">Kernel &amp; Security</span>
            <span className="text-[#00ff41] font-bold flex items-center gap-1.5 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00ff41] animate-pulse shadow-[0_0_8px_#00ff41]" />
              RHEL 9.4 (SELinux Enforcing)
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-white/40 text-[10px] block uppercase tracking-wider">Cisco .PKT WAN</span>
            <span className="text-[#00d4ff] font-bold text-xs">BGP AS65001 &bull; Dual Homed</span>
          </div>

          <div className="space-y-1">
            <span className="text-white/40 text-[10px] block uppercase tracking-wider">Database &amp; CMS Engine</span>
            <span className="text-[#00d4ff] font-bold text-xs">PostgreSQL / Prisma Schema</span>
          </div>

          <div className="space-y-1">
            <span className="text-white/40 text-[10px] block uppercase tracking-wider">Active Domain</span>
            <span className="text-white font-bold truncate block text-xs">
              {activeCategory?.name || 'Cisco & Linux Infrastructure'}
            </span>
          </div>
        </div>

        {/* Footer Navigation & Copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5 text-white font-bold text-xs uppercase tracking-wider">
              <Terminal className="w-4 h-4 text-[#00ff41]" />
              <span>Sahil K Gupta &bull; Infrastructure Portfolio</span>
            </div>
            <span className="text-white/20">|</span>
            <span className="text-white/50 text-xs">Networking &bull; Linux &bull; DevOps</span>
          </div>

          <div className="flex items-center space-x-4 uppercase tracking-wider text-[11px]">
            <button
              onClick={() => setIsArchitectureModalOpen(true)}
              className="text-white/50 hover:text-[#00d4ff] transition-colors font-semibold"
            >
              System Blueprints
            </button>
            <button
              onClick={() => setIsTerminalOpen(true)}
              className="text-white/50 hover:text-[#00ff41] transition-colors font-semibold"
            >
              Interactive CLI
            </button>
            <button
              onClick={() => setIsAdminModalOpen(true)}
              className="text-white/50 hover:text-white transition-colors font-semibold"
            >
              Admin CMS
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
