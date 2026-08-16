import React, { useEffect, useMemo, useState } from 'react';
import { Archive, CheckCircle2, Eye, Play, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react';
import type { OrchestratorProjectAggregate, OrchestratorValidationReport } from '../../types.js';
import { statusClasses } from './orchestrator-utils.js';

interface Props {
  aggregate: OrchestratorProjectAggregate;
  validation: OrchestratorValidationReport | null;
  disabled?: boolean;
  onValidate: () => Promise<unknown>;
  onPreview: () => Promise<unknown>;
  onPublish: (readyLabIds: string[]) => Promise<unknown>;
  onArchive: () => Promise<unknown>;
  onRestore: () => Promise<unknown>;
  canPermanentDelete?: boolean;
  onPermanentDelete?: () => Promise<unknown>;
}

export const ProjectLifecyclePanel: React.FC<Props> = ({ aggregate, validation, disabled, onValidate, onPreview, onPublish, onArchive, onRestore, canPermanentDelete, onPermanentDelete }) => {
  const candidateIds = useMemo(() => aggregate.labs.filter((lab) => lab.status !== 'ARCHIVED').map((lab) => lab.id), [aggregate]);
  const [selected, setSelected] = useState<string[]>(candidateIds);
  useEffect(() => {
    setSelected((current) => {
      const retained = current.filter((id) => candidateIds.includes(id));
      const added = candidateIds.filter((id) => !current.includes(id));
      return [...retained, ...added];
    });
  }, [candidateIds]);
  const project = aggregate.project;
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]);
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-[#111114] p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#00d4ff]">Lifecycle control plane</div><p className="mt-1 text-[10px] text-white/35">DRAFT → VALIDATE → PREVIEW → READY → PUBLISH → ARCHIVE</p></div><span className={`rounded border px-3 py-1.5 font-mono text-[10px] font-bold ${statusClasses(project.publicationStatus)}`}>{project.publicationStatus} · r{project.revision}</span></div>
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4"><button disabled={disabled} onClick={() => void onValidate()} className="flex items-center justify-center gap-2 rounded-lg border border-[#00d4ff]/25 bg-[#00d4ff]/10 px-3 py-2 font-mono text-[10px] font-bold uppercase text-[#00d4ff] disabled:opacity-40"><ShieldCheck className="h-3.5 w-3.5" />Validate</button><button disabled={disabled} onClick={() => void onPreview()} className="flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 font-mono text-[10px] font-bold uppercase text-white/70 disabled:opacity-40"><Eye className="h-3.5 w-3.5" />Preview</button>{project.publicationStatus !== 'ARCHIVED' ? <button disabled={disabled || !validation?.valid || selected.length === 0} onClick={() => void onPublish(selected)} className="flex items-center justify-center gap-2 rounded-lg border border-[#00ff41]/30 bg-[#00ff41]/10 px-3 py-2 font-mono text-[10px] font-bold uppercase text-[#00ff41] disabled:opacity-30"><Play className="h-3.5 w-3.5" />Publish</button> : <button disabled={disabled} onClick={() => void onRestore()} className="flex items-center justify-center gap-2 rounded-lg border border-[#00ff41]/30 bg-[#00ff41]/10 px-3 py-2 font-mono text-[10px] font-bold uppercase text-[#00ff41] disabled:opacity-40"><RotateCcw className="h-3.5 w-3.5" />Restore DRAFT</button>}<button disabled={disabled || project.publicationStatus === 'ARCHIVED'} onClick={() => void onArchive()} className="flex items-center justify-center gap-2 rounded-lg border border-red-500/25 bg-red-500/5 px-3 py-2 font-mono text-[10px] font-bold uppercase text-red-200 disabled:opacity-30"><Archive className="h-3.5 w-3.5" />Archive</button></div>{canPermanentDelete && ['DRAFT', 'ARCHIVED'].includes(project.publicationStatus) && onPermanentDelete && <button disabled={disabled || aggregate.labs.some((lab) => lab.activeRuntimeCount > 0)} onClick={() => void onPermanentDelete()} className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-950/30 px-3 py-2 font-mono text-[9px] font-bold uppercase text-red-100 disabled:opacity-30"><Trash2 className="h-3.5 w-3.5" />Permanent delete Project</button>}
    <div className="space-y-2"><div className="font-mono text-[9px] font-bold uppercase tracking-wider text-white/35">Labs selected for READY/public visibility</div>{aggregate.labs.length === 0 && <p className="text-xs text-white/35">No Labs configured.</p>}{aggregate.labs.map((lab) => <label key={lab.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/30 px-3 py-2"><span className="flex items-center gap-2"><input type="checkbox" disabled={lab.status === 'ARCHIVED'} checked={selected.includes(lab.id)} onChange={() => toggle(lab.id)} /><span className="text-xs text-white/70">{lab.title}</span></span><span className="font-mono text-[9px] text-white/35">{lab.status} · r{lab.revision}</span></label>)}</div>
    <div className="flex items-center gap-2 text-[10px] text-white/35"><CheckCircle2 className="h-3.5 w-3.5 text-[#00ff41]" />Publish reloads and revision-checks the aggregate; a stale snapshot returns 409 instead of overwriting.</div>
  </div>;
};
