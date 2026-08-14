import React from 'react';
import { Compass, CheckCircle2, ArrowRight } from 'lucide-react';
import { DomainExperienceConfig } from '../config/domainConfig.js';

interface OperatorPathProps {
  config?: DomainExperienceConfig | null;
  isHomeWorkflow?: boolean;
}

export const OperatorPath: React.FC<OperatorPathProps> = ({ config, isHomeWorkflow = false }) => {
  if (isHomeWorkflow) {
    const homeSteps = [
      {
        step: '01',
        title: 'SELECT DOMAIN',
        description: 'Choose Networking, Linux or DevOps workspace.',
      },
      {
        step: '02',
        title: 'ENTER LAB',
        description: 'Inspect the architecture, topology, and follow the mission.',
      },
      {
        step: '03',
        title: 'OPERATE & VERIFY',
        description: 'Use the visual controls, configuration files, console and evidence.',
      },
    ];

    return (
      <section className="py-8 border-b border-white/10 bg-[#0c0c0f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded bg-black border border-white/10 text-[#00d4ff]">
                <Compass className="w-4 h-4" />
              </span>
              <div>
                <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest block font-bold">
                  OPERATOR WORKFLOW
                </span>
                <h3 className="text-sm sm:text-base font-bold font-mono text-white uppercase tracking-wider">
                  How To Use This Portfolio
                </h3>
              </div>
            </div>
            <span className="text-xs font-mono text-white/40">
              Interactive Proof-of-Work System
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {homeSteps.map((item, idx) => (
              <div
                key={item.step}
                className="p-4 rounded-xl bg-black/60 border border-white/10 space-y-1.5 relative overflow-hidden"
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#00d4ff] font-bold">{item.step}</span>
                  <span className="text-[10px] text-white/40 uppercase tracking-wider">Step {idx + 1}</span>
                </div>
                <h4 className="text-sm font-bold font-mono text-white uppercase">{item.title}</h4>
                <p className="text-xs text-white/60 leading-relaxed font-sans">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!config) return null;

  return (
    <div className="py-4 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="p-4 rounded-xl bg-[#111114] border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Compass className="w-4 h-4" style={{ color: config.accentColor }} />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
              Operator Runbook Path
            </span>
          </div>
          <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest hidden sm:inline">
            Interactive Sequence
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {config.operatorPath.map((item, i) => (
            <div
              key={item.step}
              className="p-3 rounded-lg bg-black border border-white/5 space-y-1 text-xs font-mono"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold" style={{ color: config.accentColor }}>
                  {item.step}
                </span>
                <span className="text-[10px] text-white/30 uppercase">STAGE {i + 1}</span>
              </div>
              <h5 className="font-bold text-white text-xs">{item.title}</h5>
              <p className="text-[11px] text-white/60 font-sans leading-snug">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
