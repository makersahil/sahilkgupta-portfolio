import React from 'react';
import { Check, Eye, ListChecks, Rocket, ShieldCheck } from 'lucide-react';
import type { OrchestratorProjectAggregate, OrchestratorValidationReport } from '../../types.js';

export const PublicationWizard: React.FC<{ aggregate: OrchestratorProjectAggregate; validation: OrchestratorValidationReport | null; previewReady?: boolean }> = ({ aggregate, validation, previewReady = false }) => {
  const steps = [
    ['Review Draft', true, ListChecks],
    ['Validate', Boolean(validation), ShieldCheck],
    ['Resolve Errors', Boolean(validation?.valid), Check],
    ['Preview Public Shape', previewReady, Eye],
    ['Confirm READY Labs', aggregate.labs.some((lab) => lab.status === 'READY'), Check],
    ['Publish', aggregate.project.publicationStatus === 'PUBLISHED', Rocket],
  ] as const;
  return <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">{steps.map(([label, complete, Icon], index) => <div key={label} className={`rounded-lg border p-3 ${complete ? 'border-[#00ff41]/20 bg-[#00ff41]/5' : 'border-white/10 bg-black/30'}`}><div className="flex items-center justify-between"><span className="font-mono text-[9px] text-white/30">{index + 1}</span><Icon className={`h-3.5 w-3.5 ${complete ? 'text-[#00ff41]' : 'text-white/25'}`} /></div><div className={`mt-2 text-[10px] font-semibold ${complete ? 'text-[#00ff41]' : 'text-white/45'}`}>{label}</div></div>)}</div>;
};
