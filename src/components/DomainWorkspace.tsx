import React from 'react';
import { usePortfolio } from '../context/PortfolioContext.js';
import { getDomainConfigBySlug, DOMAIN_CONFIGS, DomainSlug } from '../config/domainConfig.js';
import { WorkspaceHeader } from './WorkspaceHeader.js';
import { OperatorPath } from './OperatorPath.js';
import { CiscoTopologyVisualizer } from './CiscoTopologyVisualizer.js';
import { LinuxWorkspacePreview } from './LinuxWorkspacePreview.js';
import { DevOpsPipelineVisualizer } from './DevOpsPipelineVisualizer.js';
import { ProjectsShowcase } from './ProjectsShowcase.js';
import { CertificationMatrix } from './CertificationMatrix.js';
import { TechnicalBlog } from './TechnicalBlog.js';
import { ContactSection } from './ContactSection.js';

interface DomainWorkspaceProps {
  domainSlug: DomainSlug;
}

export const DomainWorkspace: React.FC<DomainWorkspaceProps> = ({ domainSlug }) => {
  const config = DOMAIN_CONFIGS[domainSlug] || getDomainConfigBySlug(domainSlug) || DOMAIN_CONFIGS.networking;

  return (
    <div className="space-y-0">
      {/* 1. Workspace Header */}
      <WorkspaceHeader config={config} />

      {/* 2. Operator Runbook Path */}
      <div className="bg-[#0c0c0f] border-b border-white/10">
        <OperatorPath config={config} />
      </div>

      {/* 3. Domain Core Lab / Visualizer */}
      {config.slug === 'networking' && <CiscoTopologyVisualizer />}
      {config.slug === 'linux' && <LinuxWorkspacePreview />}
      {config.slug === 'devops' && <DevOpsPipelineVisualizer />}

      {/* 4. Domain Projects */}
      <ProjectsShowcase />

      {/* 5. Domain Lab & Learning Progress */}
      <CertificationMatrix />

      {/* 6. Domain Technical Articles */}
      <TechnicalBlog />

      {/* 7. Contact Section */}
      <ContactSection />
    </div>
  );
};
