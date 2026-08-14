import React from 'react';
import { HeroSection } from './HeroSection.js';
import { DomainLaunchpad } from './DomainLaunchpad.js';
import { OperatorPath } from './OperatorPath.js';
import { FeaturedProofOfWork } from './FeaturedProofOfWork.js';
import { CertificationMatrix } from './CertificationMatrix.js';
import { TechnicalBlog } from './TechnicalBlog.js';
import { ContactSection } from './ContactSection.js';

export const SystemIndex: React.FC = () => {
  return (
    <div className="space-y-0">
      {/* 1. Hero Overview */}
      <HeroSection />

      {/* 2. Three Domain Launchpad Cards */}
      <DomainLaunchpad />

      {/* 3. Operator Workflow Guide */}
      <OperatorPath isHomeWorkflow={true} />

      {/* 4. Featured Proof of Work (Flagship Systems) */}
      <FeaturedProofOfWork />

      {/* 5. Skills & Learning Progress */}
      <CertificationMatrix />

      {/* 6. Technical Engineering Notes */}
      <TechnicalBlog />

      {/* 7. Direct Uplink & Contact */}
      <ContactSection />
    </div>
  );
};
