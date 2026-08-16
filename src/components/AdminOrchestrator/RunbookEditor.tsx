import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../../lib/api.js';
import type { LabAggregate } from '../../types.js';

export const RunbookEditor: React.FC<{ lab: LabAggregate; disabled?: boolean; onChanged: () => Promise<unknown> }> = ({ lab, disabled, onChanged }) => {
  const [title, setTitle] = useState('Inspect recorded state');
  const [description, setDescription] = useState('Use the portfolio UI and Unified CLI to inspect the persisted evidence.');
  const create = async () => { await api.createLabRunbookStep(lab.id, { order: lab.runbookSteps.length + 1, title, description, command: null, expectedObservation: null }); await onChanged(); };
  return <section className="space-y-3 rounded-xl border border-white/10 bg-black/25 p-4"><div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#00d4ff]">Runbook guidance</div><div className="space-y-2">{lab.runbookSteps.map((step) => <div key={step.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2"><div><div className="text-xs text-white">{step.order}. {step.title}</div><div className="mt-1 text-[10px] text-white/35">{step.description}</div></div><button disabled={disabled} onClick={() => void api.deleteLabRunbookStep(lab.id, step.id).then(onChanged)} className="rounded border border-red-500/20 p-2 text-red-300"><Trash2 className="h-3.5 w-3.5" /></button></div>)}</div><input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-xs text-white" /><textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-xs text-white" /><button disabled={disabled || !title.trim()} onClick={() => void create()} className="inline-flex items-center gap-2 rounded-lg border border-[#00ff41]/25 bg-[#00ff41]/10 px-3 py-2 font-mono text-[9px] font-bold uppercase text-[#00ff41] disabled:opacity-40"><Plus className="h-3.5 w-3.5" />Add guidance step</button></section>;
};
