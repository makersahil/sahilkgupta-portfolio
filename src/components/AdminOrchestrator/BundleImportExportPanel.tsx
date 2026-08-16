import React, { useState } from 'react';
import { Download, FileJson, Upload } from 'lucide-react';
import type { LabDomain, OrchestratorImportDryRunResult } from '../../types.js';
import { JsonFieldEditor } from './JsonFieldEditor.js';
import { downloadJson } from './orchestrator-utils.js';

interface Props {
  selectedProjectId: string | null;
  selectedLabId: string | null;
  selectedLabDomain?: LabDomain | null;
  disabled?: boolean;
  onProjectExport: (id: string) => Promise<unknown>;
  onLabExport: (id: string) => Promise<unknown>;
  onNetworkingCompanionExport: (id: string) => Promise<unknown>;
  onDryRun: (bundle: unknown, mode: 'REJECT' | 'RENAME', targetProjectId?: string) => Promise<OrchestratorImportDryRunResult>;
  onImport: (bundle: unknown, mode: 'REJECT' | 'RENAME', targetProjectId?: string) => Promise<unknown>;
}

export const BundleImportExportPanel: React.FC<Props> = ({ selectedProjectId, selectedLabId, selectedLabDomain, disabled, onProjectExport, onLabExport, onNetworkingCompanionExport, onDryRun, onImport }) => {
  const [bundle, setBundle] = useState<unknown>({ schemaVersion: 'portfolio.project-bundle.v1' });
  const [mode, setMode] = useState<'REJECT' | 'RENAME'>('REJECT');
  const [dryRun, setDryRun] = useState<OrchestratorImportDryRunResult | null>(null);
  const exportProject = async () => { if (selectedProjectId) downloadJson(await onProjectExport(selectedProjectId), 'portfolio-project-bundle.json'); };
  const exportLab = async () => { if (selectedLabId) downloadJson(await onLabExport(selectedLabId), 'portfolio-lab-bundle.json'); };
  const exportCompanion = async () => { if (selectedLabId) downloadJson(await onNetworkingCompanionExport(selectedLabId), 'networking-companion-manifest.json'); };
  const validate = async () => setDryRun(await onDryRun(bundle, mode, selectedProjectId ?? undefined));
  return <section className="space-y-4 rounded-xl border border-white/10 bg-black/25 p-4"><div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider text-[#00d4ff]"><FileJson className="h-4 w-4" />Versioned bundle import / export</div><p className="text-[10px] text-white/35">JSON only · 2 MiB service limit · bounded depth/counts · no external URL fetch · imported content remains DRAFT. Packet Tracer references remain metadata only.</p><div className="flex flex-wrap gap-2"><button disabled={disabled || !selectedProjectId} onClick={() => void exportProject()} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 font-mono text-[9px] uppercase text-white/65 disabled:opacity-30"><Download className="h-3.5 w-3.5" />Export Project</button><button disabled={disabled || !selectedLabId} onClick={() => void exportLab()} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 font-mono text-[9px] uppercase text-white/65 disabled:opacity-30"><Download className="h-3.5 w-3.5" />Export Lab</button>{selectedLabDomain === 'NETWORKING' && <button disabled={disabled || !selectedLabId} onClick={() => void exportCompanion()} className="inline-flex items-center gap-2 rounded-lg border border-[#00d4ff]/20 px-3 py-2 font-mono text-[9px] uppercase text-[#00d4ff] disabled:opacity-30"><Download className="h-3.5 w-3.5" />Networking companion</button>}<select value={mode} onChange={(event) => setMode(event.target.value as 'REJECT' | 'RENAME')} className="rounded-lg border border-white/10 bg-black px-3 py-2 font-mono text-[9px] text-white"><option value="REJECT">CONFLICT: REJECT</option><option value="RENAME">CONFLICT: RENAME</option></select></div><JsonFieldEditor label="Bundle JSON" value={bundle} onChange={(value) => { setBundle(value); setDryRun(null); }} rows={15} /><div className="flex gap-2"><button disabled={disabled} onClick={() => void validate()} className="inline-flex items-center gap-2 rounded-lg border border-[#00d4ff]/25 bg-[#00d4ff]/10 px-3 py-2 font-mono text-[9px] font-bold uppercase text-[#00d4ff] disabled:opacity-40"><Upload className="h-3.5 w-3.5" />Dry run</button><button disabled={disabled || !dryRun?.valid} onClick={() => void onImport(bundle, mode, selectedProjectId ?? undefined)} className="inline-flex items-center gap-2 rounded-lg border border-[#00ff41]/25 bg-[#00ff41]/10 px-3 py-2 font-mono text-[9px] font-bold uppercase text-[#00ff41] disabled:opacity-30"><Upload className="h-3.5 w-3.5" />Import DRAFT</button></div>{dryRun && <div className={`rounded-lg border p-3 text-xs ${dryRun.valid ? 'border-[#00ff41]/20 bg-[#00ff41]/5 text-[#00ff41]' : 'border-red-500/20 bg-red-500/5 text-red-200'}`}><div className="font-mono text-[10px] font-bold">{dryRun.valid ? 'DRY RUN VALID' : 'DRY RUN REJECTED'} · {dryRun.schemaVersion ?? 'UNKNOWN'}</div>{dryRun.errors.map((error) => <div key={error} className="mt-1">ERROR: {error}</div>)}{dryRun.warnings.map((warning) => <div key={warning} className="mt-1 text-amber-200">WARN: {warning}</div>)}</div>}</section>;
};
