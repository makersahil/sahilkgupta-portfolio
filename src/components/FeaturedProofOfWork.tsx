import React from 'react';
import { motion } from 'motion/react';
import {
  Server,
  Network,
  Terminal,
  Workflow,
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  Cpu,
  Layers,
  FileCode,
} from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext.js';
import { DOMAIN_CONFIGS, DomainSlug } from '../config/domainConfig.js';
import { Project } from '../types.js';

export const FeaturedProofOfWork: React.FC = () => {
  const { projects, categories, setActiveCategory, setActiveProjectModal } = usePortfolio();

  const getDomainCategory = (slug: DomainSlug) => {
    return categories.find(
      (c) =>
        c.slug.toLowerCase().includes(slug) ||
        c.id.toLowerCase().includes(slug) ||
        c.name.toLowerCase().includes(slug)
    );
  };

  const domainProjects: Array<{
    slug: DomainSlug;
    project: Project | undefined;
    icon: any;
    accentColor: string;
    mission: string;
  }> = [
    {
      slug: 'networking',
      project: projects.find((p) => p.formatType === 'cisco_pkt_lab' || p.categoryId.includes('networking')),
      icon: Network,
      accentColor: '#00d4ff',
      mission: 'Multi-site Cisco WAN topology with dual eBGP carrier uplinks, OSPF Area 0 backbone, and HSRP gateway failover.',
    },
    {
      slug: 'linux',
      project: projects.find((p) => p.formatType === 'rhcsa_matrix' || p.categoryId.includes('linux')),
      icon: Terminal,
      accentColor: '#00ff41',
      mission: 'Hardened RHEL 9 administration matrix covering LVM thin storage pools, targeted SELinux mandatory access controls, and systemd units.',
    },
    {
      slug: 'devops',
      project: projects.find((p) => p.formatType === 'devops_pipeline' || p.categoryId.includes('devops')),
      icon: Workflow,
      accentColor: '#06b6d4',
      mission: 'Continuous GitOps delivery pipeline with Terraform VPC provisioning, ArgoCD reconciliation, and Cilium eBPF telemetry mesh.',
    },
  ];

  return (
    <section className="py-12 border-b border-white/10 bg-[#0a0a0c]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded text-[10px] font-mono bg-black/60 text-[#00d4ff] border border-white/10 uppercase tracking-widest mb-2">
              <Server className="w-3.5 h-3.5 text-[#00d4ff]" />
              <span>Core Proof of Work &bull; Flagship Systems</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight uppercase">
              Featured Domain Blueprints
            </h2>
            <p className="text-sm text-white/60 max-w-2xl mt-1">
              One flagship implementation for each engineering discipline. Each blueprint includes verified architectures, configuration files, and lab runbooks.
            </p>
          </div>
        </div>

        {/* 3 Project Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {domainProjects.map(({ slug, project, icon: Icon, accentColor, mission }) => {
            const config = DOMAIN_CONFIGS[slug];
            const cat = getDomainCategory(slug);

            if (!project) return null;

            return (
              <motion.div
                key={slug}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className="rounded-xl bg-[#111114] border border-white/10 hover:border-white/20 overflow-hidden flex flex-col justify-between transition-all group p-5 shadow-xl"
              >
                <div className="space-y-4">
                  {/* Card Header: Domain Badge & Status */}
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 rounded bg-black border border-white/10" style={{ color: accentColor }}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: accentColor }}>
                        {config.name}
                      </span>
                    </div>

                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-black text-[#00ff41] border border-[#00ff41]/30 uppercase">
                      {project.status}
                    </span>
                  </div>

                  {/* Title */}
                  <h3
                    className="text-base font-bold font-mono text-white group-hover:text-white transition-colors cursor-pointer line-clamp-2"
                    onClick={() => setActiveProjectModal(project)}
                  >
                    {project.title}
                  </h3>

                  {/* One-Sentence Mission Statement */}
                  <div className="p-3 rounded-lg bg-black border border-white/5 space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-white/40 block font-bold">
                      Mission Scope:
                    </span>
                    <p className="text-xs text-white/80 leading-relaxed font-sans">
                      {project.mission || mission}
                    </p>
                  </div>

                  {/* DevOps Stack Chips */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-white/40 block">
                      Key Technologies:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {project.devopsStack.slice(0, 4).map((tech, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded text-[10px] font-mono bg-black text-white/80 border border-white/10"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="pt-4 mt-5 border-t border-white/10 flex items-center justify-between gap-3 text-xs font-mono">
                  <button
                    onClick={() => {
                      if (cat) setActiveCategory(cat);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-black text-white hover:bg-white/10 font-bold uppercase tracking-wider border transition-all"
                    style={{ borderColor: `${accentColor}50`, color: accentColor }}
                  >
                    <span>ENTER LAB →</span>
                  </button>

                  <button
                    onClick={() => setActiveProjectModal(project)}
                    className="text-white/60 hover:text-white font-bold uppercase tracking-wider text-[11px] flex items-center gap-1 transition-colors"
                  >
                    <span>INSPECT PROJECT →</span>
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
