import React, { useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { api } from '../../lib/api.js';
import type { LabAggregate, LabInputTypeDefinition } from '../../types.js';
import { JsonFieldEditor } from './JsonFieldEditor.js';

export const LabInputEditor: React.FC<{ lab: LabAggregate; disabled?: boolean; onChanged: () => Promise<unknown> }> = ({ lab, disabled, onChanged }) => {
  const [registry, setRegistry] = useState<LabInputTypeDefinition[]>([]);
  const [inputType, setInputType] = useState('');
  const [label, setLabel] = useState('Primary recorded-state input');
  const [payload, setPayload] = useState<unknown>({});
  useEffect(() => { void api.getLabInputRegistry(lab.domain).then((entries) => { setRegistry(entries); setInputType((current) => current || entries[0]?.type || ''); }); }, [lab.domain]);
  const create = async () => {
    await api.createLabInput(lab.id, { inputKey: `input-${Date.now().toString(36)}`, inputType, label, sourceKind: 'INLINE', schemaVersion: '1.0', payload, isPrimary: lab.inputs.every((entry) => !entry.isPrimary), sortOrder: lab.inputs.length });
    await onChanged();
  };
  return <section className="space-y-3 rounded-xl border border-white/10 bg-black/25 p-4"><div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#00d4ff]">Standardized LabInputs</div><div className="space-y-2">{lab.inputs.map((input) => <div key={input.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2"><div><div className="text-xs text-white">{input.label}</div><div className="mt-1 font-mono text-[9px] text-white/30">{input.inputKey} · {input.inputType} · {input.sourceKind}{input.isPrimary ? ' · PRIMARY' : ''}</div></div><button type="button" disabled={disabled} onClick={() => void api.deleteLabInput(lab.id, input.id).then(onChanged)} className="rounded border border-red-500/20 p-2 text-red-300 disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" /></button></div>)}</div><div className="grid gap-2 md:grid-cols-2"><select value={inputType} onChange={(event) => setInputType(event.target.value)} className="rounded-lg border border-white/10 bg-black px-3 py-2 text-xs text-white">{registry.map((entry) => <option key={entry.type} value={entry.type}>{entry.type}</option>)}</select><input value={label} onChange={(event) => setLabel(event.target.value)} className="rounded-lg border border-white/10 bg-black px-3 py-2 text-xs text-white" /></div><JsonFieldEditor label="New INLINE input payload" value={payload} onChange={setPayload} rows={8} /><button disabled={disabled || !inputType || !label.trim()} type="button" onClick={() => void create()} className="inline-flex items-center gap-2 rounded-lg border border-[#00ff41]/25 bg-[#00ff41]/10 px-3 py-2 font-mono text-[9px] font-bold uppercase text-[#00ff41] disabled:opacity-40"><Plus className="h-3.5 w-3.5" /><Save className="h-3.5 w-3.5" />Add input</button></section>;
};
