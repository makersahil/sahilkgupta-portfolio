import React from 'react';
import {
  Network,
  Terminal,
  Workflow,
  Layers,
  ChevronRight,
  ArrowLeft,
  ChevronDown,
  Activity,
  Server,
} from 'lucide-react';
import { DomainExperienceConfig } from '../config/domainConfig.js';
import { usePortfolio } from '../context/PortfolioContext.js';

interface WorkspaceHeaderProps {
  config: DomainExperienceConfig;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({ config }) => {
  const { setActiveCategory, setIsTerminalOpen } = usePortfolio();

  const getDomainIcon = (slug: string) => {
    switch (slug) {
      case 'networking':
        return <Network className="w-5 h-5" />;
      case 'linux':
        return <Terminal className="w-5 h-5" />;
      case 'devops':
        return <Workflow className="w-5 h-5" />;
      default:
        return <Layers className="w-5 h-5" />;
    }
  };

  return (
    <div className="pt-8 pb-4 border-b border-white/10 bg-gradient-to-b from-black via-[#0a0a0c] to-[#0a0a0c]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center space-x-2 text-xs font-mono mb-4 text-white/50">
          <button
            onClick={() => {
              setActiveCategory(null);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center space-x-1 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>SYSTEM INDEX</span>
          </button>
          <span>/</span>
          <span className="uppercase" style={{ color: config.accentColor }}>
            {config.name} WORKSPACE
          </span>
        </div>

        {/* Header Main Block */}
        <div className="space-y-4">
          {/* Eyebrow & Status */}
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-mono bg-black border uppercase tracking-wider font-bold"
              style={{
                borderColor: `${config.accentColor}40`,
                color: config.accentColor,
              }}
            >
              {getDomainIcon(config.slug)}
              <span>{config.eyebrow}</span>
            </div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-black/60 border border-white/10 text-white/70">
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: config.accentColor }}
              />
              <span>{config.statusLabel}</span>
            </div>
          </div>

          {/* Operator Workspace Title */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-mono tracking-tight text-white uppercase">
            {config.operatorLabel}
          </h1>

          {/* Mission Panel */}
          <div className="p-4 rounded-xl bg-[#111114] border border-white/10 space-y-2 max-w-4xl shadow-xl">
            <div className="flex items-center space-x-2 text-xs font-mono">
              <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: config.accentColor }}>
                MISSION BRIEF //
              </span>
              <span className="text-white font-bold">{config.mission}</span>
            </div>
            <p className="text-xs sm:text-sm text-white/70 font-sans leading-relaxed">
              {config.description}
            </p>
          </div>

          {/* 3 Core Workspace Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <a
              href={config.primaryActionTarget}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-lg text-black font-mono font-bold text-xs sm:text-sm uppercase tracking-wider transition-all shadow-lg hover:brightness-110"
              style={{
                backgroundColor: config.accentColor,
                boxShadow: `0 0 20px ${config.accentColor}35`,
              }}
            >
              {getDomainIcon(config.slug)}
              <span>{config.primaryActionLabel}</span>
              <ChevronDown className="w-4 h-4" />
            </a>

            <a
              href={config.secondaryActionTarget}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-[#111114] hover:bg-[#1a1a1e] text-white/90 hover:text-white font-mono text-xs sm:text-sm border border-white/10 uppercase tracking-wider transition-all"
            >
              <Server className="w-4 h-4" style={{ color: config.accentColor }} />
              <span>{config.secondaryActionLabel}</span>
            </a>

            <button
              onClick={() => setIsTerminalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-black hover:bg-white/5 text-white/90 hover:text-white font-mono text-xs sm:text-sm border transition-all"
              style={{
                borderColor: `${config.accentColor}50`,
                color: config.accentColor,
              }}
            >
              <Terminal className="w-4 h-4" />
              <span>{config.consoleLabel}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
