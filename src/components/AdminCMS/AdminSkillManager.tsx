import React, { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';

import { api } from '../../lib/api.js';
import type { Category, Skill } from '../../types.js';

interface Props {
  skills: Skill[];
  categories: Category[];
  refreshData: () => Promise<void>;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const inputClass = 'w-full bg-black border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-[#00d4ff]';
const labelClass = 'text-white/50 block mb-1 uppercase tracking-wider text-[10px]';
function errorMessage(error: unknown): string { return error instanceof Error ? error.message : 'Skill operation failed'; }

export const AdminSkillManager: React.FC<Props> = ({ skills, categories, refreshData, showToast }) => {
  const [draft, setDraft] = useState<Partial<Skill> | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (!draft) return;
    setSaving(true);
    try {
      const payload: Partial<Skill> = { ...draft, name: draft.name?.trim(), proficiencyPercent: Number(draft.proficiencyPercent ?? 0), yearsOfExperience: Number(draft.yearsOfExperience ?? 0), sortOrder: Number(draft.sortOrder ?? 0), iconName: draft.iconName?.trim() || undefined, terminalSnippet: draft.terminalSnippet ?? '' };
      draft.id ? await api.updateSkill(draft.id, payload) : await api.createSkill(payload);
      setDraft(null); await refreshData(); showToast('Skill saved', 'success');
    } catch (error) { showToast(errorMessage(error), 'error'); } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this skill?')) return;
    try { await api.deleteSkill(id); await refreshData(); showToast('Skill deleted', 'info'); }
    catch (error) { showToast(errorMessage(error), 'error'); }
  };

  return <div className="space-y-4">
    <div className="flex items-center justify-between gap-3"><div><div className="text-white font-semibold">Technical Competencies</div><div className="text-white/40 text-[10px] mt-1">Persistent skill management for portfolio competency cards.</div></div><button onClick={() => setDraft({ name: '', level: 'Advanced', proficiencyPercent: 80, yearsOfExperience: 1, categoryId: categories[0]?.id ?? '', iconName: 'Code', terminalSnippet: '', sortOrder: skills.length })} className="px-3 py-2 rounded bg-[#00d4ff] text-black font-bold uppercase tracking-wider"><Plus className="w-3.5 h-3.5 inline mr-1" />Add</button></div>
    <div className="divide-y divide-white/10 rounded-xl bg-black border border-white/10 overflow-hidden">{skills.length === 0 ? <div className="p-6 text-center text-white/35">No skills configured.</div> : skills.map((item) => <div key={item.id} className="p-4 flex items-center justify-between gap-3"><div><div className="text-white font-bold">{item.name}</div><div className="text-[10px] text-white/40 mt-1">{item.level} · {item.proficiencyPercent}% · {item.yearsOfExperience} yrs</div></div><div className="flex gap-2"><button onClick={() => setDraft(item)} className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10">Edit</button><button onClick={() => void remove(item.id)} className="text-red-300"><Trash2 className="w-4 h-4" /></button></div></div>)}</div>
    {draft && <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm overflow-y-auto"><div className="w-full max-w-xl bg-[#111114] border border-white/15 rounded-xl p-5 my-8"><div className="flex justify-between items-center pb-3 border-b border-white/10"><h4 className="text-white font-bold uppercase">{draft.id ? 'Edit Skill' : 'Add Skill'}</h4><button onClick={() => setDraft(null)} className="text-white/40"><X className="w-5 h-5" /></button></div><form onSubmit={save} className="space-y-3 mt-4 text-xs"><div><label className={labelClass}>Name</label><input required value={draft.name ?? ''} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={inputClass} /></div><div className="grid sm:grid-cols-2 gap-3"><div><label className={labelClass}>Level</label><select value={draft.level ?? 'Advanced'} onChange={(e) => setDraft({ ...draft, level: e.target.value as Skill['level'] })} className={inputClass}><option>Expert</option><option>Advanced</option><option>Proficient</option></select></div><div><label className={labelClass}>Category</label><select value={draft.categoryId ?? ''} onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })} className={inputClass}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div></div><div className="grid sm:grid-cols-3 gap-3"><div><label className={labelClass}>Proficiency %</label><input type="number" min={0} max={100} value={draft.proficiencyPercent ?? 0} onChange={(e) => setDraft({ ...draft, proficiencyPercent: Number(e.target.value) })} className={inputClass} /></div><div><label className={labelClass}>Years</label><input type="number" min={0} step="0.5" value={draft.yearsOfExperience ?? 0} onChange={(e) => setDraft({ ...draft, yearsOfExperience: Number(e.target.value) })} className={inputClass} /></div><div><label className={labelClass}>Sort Order</label><input type="number" value={draft.sortOrder ?? 0} onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) })} className={inputClass} /></div></div><div><label className={labelClass}>Icon Name</label><input value={draft.iconName ?? ''} onChange={(e) => setDraft({ ...draft, iconName: e.target.value })} className={inputClass} /></div><div><label className={labelClass}>Terminal Snippet</label><textarea rows={4} value={draft.terminalSnippet ?? ''} onChange={(e) => setDraft({ ...draft, terminalSnippet: e.target.value })} className={`${inputClass} font-mono`} /></div><div className="flex justify-end gap-2 pt-3 border-t border-white/10"><button type="button" onClick={() => setDraft(null)} className="px-3 py-2 rounded bg-white/5">Cancel</button><button disabled={saving} className="px-4 py-2 rounded bg-[#00d4ff] text-black font-bold">{saving ? 'Saving…' : 'Save'}</button></div></form></div></div>}
  </div>;
};
