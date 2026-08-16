import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../../lib/api.js';
import type { LabAggregate } from '../../types.js';
import { JsonFieldEditor } from './JsonFieldEditor.js';
import { slugify } from './orchestrator-utils.js';

export const ScenarioEditor: React.FC<{ lab: LabAggregate; disabled?: boolean; onChanged: () => Promise<unknown> }> = ({ lab, disabled, onChanged }) => {
  const [title, setTitle] = useState('Recorded-state investigation');
  const [actions, setActions] = useState<unknown>({ schemaVersion: `${lab.domain.toLowerCase()}.scenario.v1`, mutations: [] });
  const create = async () => { await api.createLabScenario(lab.id, { slug: `${slugify(title)}-${Date.now().toString(36)}`, title, summary: `${title} scenario`, order: lab.scenarios.length + 1, isEnabled: true, baselineState: {}, actions, expectedObservations: {}, verificationCriteria: {} }); await onChanged(); };
  return <section className="space-y-3 rounded-xl border border-white/10 bg-black/25 p-4"><div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#00d4ff]">Scenario definitions</div><p className="text-[10px] text-white/35">Actions are persisted definitions and are server-loaded through the Phase 7 whitelist. They never execute external infrastructure commands.</p><div className="space-y-2">{lab.scenarios.map((scenario) => <div key={scenario.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2"><div><div className="text-xs text-white">{scenario.title}</div><div className="font-mono text-[9px] text-white/30">{scenario.slug} · {scenario.isEnabled ? 'ENABLED' : 'DISABLED'}</div></div><button type="button" disabled={disabled} onClick={() => void api.deleteLabScenario(lab.id, scenario.id).then(onChanged)} className="rounded border border-red-500/20 p-2 text-red-300"><Trash2 className="h-3.5 w-3.5" /></button></div>)}</div><input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-xs text-white" /><JsonFieldEditor label="Scenario action contract" value={actions} onChange={setActions} rows={10} /><button type="button" disabled={disabled || !title.trim()} onClick={() => void create()} className="inline-flex items-center gap-2 rounded-lg border border-[#00ff41]/25 bg-[#00ff41]/10 px-3 py-2 font-mono text-[9px] font-bold uppercase text-[#00ff41] disabled:opacity-40"><Plus className="h-3.5 w-3.5" />Add scenario</button></section>;
};
