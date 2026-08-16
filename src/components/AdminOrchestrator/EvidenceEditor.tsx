import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../../lib/api.js';
import type { LabAggregate } from '../../types.js';
import { JsonFieldEditor } from './JsonFieldEditor.js';

export const EvidenceEditor: React.FC<{ lab: LabAggregate; disabled?: boolean; onChanged: () => Promise<unknown> }> = ({ lab, disabled, onChanged }) => {
  const [title, setTitle] = useState('Recorded verification evidence');
  const [content, setContent] = useState<unknown>({ interpretation: 'RECORDED_REFERENCE' });
  const [isPublic, setIsPublic] = useState(true);
  const create = async () => { await api.createLabEvidence(lab.id, { kind: 'OTHER', title, content, isPublic, sortOrder: lab.evidence.length }); await onChanged(); };
  return <section className="space-y-3 rounded-xl border border-white/10 bg-black/25 p-4"><div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#00d4ff]">Evidence records</div><div className="space-y-2">{lab.evidence.map((evidence) => <div key={evidence.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2"><div><div className="text-xs text-white">{evidence.title}</div><div className="font-mono text-[9px] text-white/30">{evidence.kind} · {evidence.isPublic ? 'PUBLIC' : 'PRIVATE'}</div></div><button disabled={disabled} onClick={() => void api.deleteLabEvidence(lab.id, evidence.id).then(onChanged)} className="rounded border border-red-500/20 p-2 text-red-300"><Trash2 className="h-3.5 w-3.5" /></button></div>)}</div><input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-xs text-white" /><label className="flex items-center gap-2 text-xs text-white/60"><input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} />Public evidence</label><JsonFieldEditor label="Evidence content" value={content} onChange={setContent} rows={7} /><button disabled={disabled || !title.trim()} onClick={() => void create()} className="inline-flex items-center gap-2 rounded-lg border border-[#00ff41]/25 bg-[#00ff41]/10 px-3 py-2 font-mono text-[9px] font-bold uppercase text-[#00ff41] disabled:opacity-40"><Plus className="h-3.5 w-3.5" />Add evidence</button></section>;
};
