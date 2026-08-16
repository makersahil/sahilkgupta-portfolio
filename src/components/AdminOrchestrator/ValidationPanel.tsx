import React from 'react';
import { AlertTriangle, CheckCircle2, Info, ShieldCheck } from 'lucide-react';
import type { OrchestratorValidationReport } from '../../types.js';
import { statusClasses } from './orchestrator-utils.js';

export const ValidationPanel: React.FC<{ report: OrchestratorValidationReport | null }> = ({ report }) => {
  if (!report) return <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-white/35">Run validation to inspect the current persisted aggregate. Validation is computed and never stored as a stale pass.</div>;
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 p-4">
      <div><div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider text-[#00d4ff]"><ShieldCheck className="h-4 w-4" />Validation report</div><p className="mt-1 text-[10px] text-white/35">Generated {new Date(report.generatedAt).toLocaleString()} · Project revision {report.projectRevision}</p></div>
      <span className={`rounded border px-3 py-1.5 font-mono text-xs font-bold ${statusClasses(report.valid ? 'PASS' : 'ERROR')}`}>{report.valid ? 'VALID' : 'BLOCKED'} · {report.errors} errors · {report.warnings} warnings</span>
    </div>
    <div className="space-y-2">
      {report.findings.length === 0 && <div className="rounded-xl border border-[#00ff41]/20 bg-[#00ff41]/5 p-4 text-xs text-[#00ff41]">No findings.</div>}
      {report.findings.map((finding, index) => {
        const Icon = finding.severity === 'ERROR' ? AlertTriangle : finding.severity === 'WARNING' ? Info : CheckCircle2;
        return <div key={`${finding.code}-${index}`} className={`rounded-xl border p-4 ${finding.severity === 'ERROR' ? 'border-red-500/25 bg-red-500/5' : finding.severity === 'WARNING' ? 'border-amber-400/20 bg-amber-400/5' : 'border-white/10 bg-white/[0.02]'}`}>
          <div className="flex items-start gap-3"><Icon className={`mt-0.5 h-4 w-4 shrink-0 ${finding.severity === 'ERROR' ? 'text-red-300' : finding.severity === 'WARNING' ? 'text-amber-300' : 'text-[#00d4ff]'}`} /><div><div className="font-mono text-[10px] font-bold uppercase tracking-wider text-white/70">{finding.scope} · {finding.code}</div><p className="mt-1 text-xs text-white/60">{finding.message}</p><p className="mt-1 font-mono text-[9px] text-white/30">{finding.path}</p>{finding.remediation && <p className="mt-2 text-[10px] text-[#00d4ff]/70">Resolution: {finding.remediation}</p>}</div></div>
        </div>;
      })}
    </div>
  </div>;
};
