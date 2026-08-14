import React from 'react';
import { motion } from 'motion/react';
import {
  Network,
  Terminal,
  Workflow,
  ArrowRight,
  ShieldCheck,
  Server,
  Layers,
  Cpu,
} from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext.js';
import { DOMAIN_CONFIGS, DomainSlug } from '../config/domainConfig.js';

export const DomainLaunchpad: React.FC = () => {
  const { categories, setActiveCategory } = usePortfolio();

  const getDomainCategory = (slug: DomainSlug) => {
    return categories.find(
      (c) =>
        c.slug.toLowerCase().includes(slug) ||
        c.id.toLowerCase().includes(slug) ||
        c.name.toLowerCase().includes(slug)
    );
  };

  const domains: DomainSlug[] = ['networking', 'linux', 'devops'];

  const getDomainIcon = (slug: DomainSlug) => {
    switch (slug) {
      case 'networking':
        return <Network className="w-5 h-5 text-[#00d4ff]" />;
      case 'linux':
        return <Terminal className="w-5 h-5 text-[#00ff41]" />;
      case 'devops':
        return <Workflow className="w-5 h-5 text-[#06b6d4]" />;
    }
  };

  return (
    <section id="domain-launchpad-section" className="py-12 border-b border-white/10 bg-[#0a0a0c]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Title */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded text-[10px] font-mono bg-black/60 text-[#00d4ff] border border-white/10 uppercase tracking-widest mb-2">
              <Cpu className="w-3.5 h-3.5 text-[#00d4ff]" />
              <span>Operator Workspaces &bull; Choose Environment</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight uppercase">
              Domain Launchpad
            </h2>
            <p className="text-sm text-white/60 max-w-2xl mt-1">
              Select a specialized infrastructure workspace to explore hands-on labs, architectural blueprints, live configurations, and verification evidence.
            </p>
          </div>
          <div className="hidden sm:flex items-center space-x-2 text-xs font-mono text-white/40">
            <span className="w-2 h-2 rounded-full bg-[#00ff41] animate-pulse" />
            <span>3 WORKSPACES ONLINE</span>
          </div>
        </div>

        {/* 3 Domain Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {domains.map((slug) => {
            const config = DOMAIN_CONFIGS[slug];
            const cat = getDomainCategory(slug);
            const isNetworking = slug === 'networking';
            const isLinux = slug === 'linux';
            const accentColor = config.accentColor;

            return (
              <motion.div
                key={slug}
                whileHover={{ y: -5 }}
                transition={{ duration: 0.2 }}
                className="rounded-xl bg-[#111114] border border-white/10 hover:border-white/25 overflow-hidden flex flex-col justify-between transition-all p-6 relative group shadow-2xl"
                style={{
                  boxShadow: `0 0 0 1px rgba(255, 255, 255, 0.05)`,
                }}
              >
                {/* Subtle Accent Glow Top Border */}
                <div
                  className="absolute top-0 left-0 right-0 h-1 transition-all group-hover:h-1.5"
                  style={{ backgroundColor: accentColor }}
                />

                <div className="space-y-4">
                  {/* Status Indicator & Category Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span
                        className="w-2 h-2 rounded-full animate-pulse"
                        style={{ backgroundColor: accentColor, boxShadow: `0 0 8px ${accentColor}` }}
                      />
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/70">
                        {config.statusLabel}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-black border border-white/10 shrink-0">
                      {getDomainIcon(slug)}
                    </div>
                  </div>

                  {/* Title & Eyebrow */}
                  <div>
                    <span
                      className="text-[10px] font-mono font-bold uppercase tracking-widest block mb-1"
                      style={{ color: accentColor }}
                    >
                      {config.eyebrow}
                    </span>
                    <h3 className="text-lg sm:text-xl font-bold font-mono text-white group-hover:text-white transition-colors">
                      {config.operatorLabel}
                    </h3>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-white/70 leading-relaxed min-h-[48px]">
                    {config.description}
                  </p>

                  {/* System Capabilities Chips */}
                  <div className="pt-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-white/40 block mb-2 font-semibold">
                      System Capabilities:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {config.systemCapabilities.map((cap) => (
                        <span
                          key={cap}
                          className="px-2 py-0.5 rounded text-[10px] font-mono bg-black text-white/80 border border-white/10 group-hover:border-white/20 transition-colors"
                        >
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card CTA Button */}
                <div className="pt-6 mt-6 border-t border-white/10">
                  <button
                    onClick={() => {
                      if (cat) {
                        setActiveCategory(cat);
                      } else {
                        // Fallback synthesized category if not yet loaded
                        setActiveCategory({
                          id: config.categoryId,
                          slug: config.slug,
                          name: config.name,
                          tagline: config.mission,
                          description: config.description,
                          icon: isNetworking ? 'Network' : isLinux ? 'Terminal' : 'ServerCog',
                          accentColor: config.accentColor,
                          terminalTheme: isLinux ? 'green' : 'cyan',
                          sortOrder: isNetworking ? 1 : isLinux ? 2 : 3,
                          isPublished: true,
                          createdAt: new Date().toISOString(),
                          updatedAt: new Date().toISOString(),
                        });
                      }
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="w-full py-2.5 px-4 rounded-lg bg-black hover:bg-white/10 text-white font-mono font-bold text-xs uppercase tracking-wider border transition-all flex items-center justify-between group-hover:brightness-110"
                    style={{
                      borderColor: `${accentColor}60`,
                      color: accentColor,
                    }}
                  >
                    <span>ENTER {config.name.toUpperCase()} &rarr;</span>
                    <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
