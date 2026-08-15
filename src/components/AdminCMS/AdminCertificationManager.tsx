import React, { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';

import { api } from '../../lib/api.js';
import type { Category, Certification } from '../../types.js';

interface Props {
  certifications: Certification[];
  categories: Category[];
  refreshData: () => Promise<void>;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const inputClass = 'w-full bg-black border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-[#00d4ff]';
const labelClass = 'text-white/50 block mb-1 uppercase tracking-wider text-[10px]';

function errorMessage(error: unknown): string { return error instanceof Error ? error.message : 'Certification operation failed'; }

export const AdminCertificationManager: React.FC<Props> = ({ certifications, categories, refreshData, showToast }) => {
  const [draft, setDraft] = useState<Partial<Certification> | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (!draft) return;
    setSaving(true);
    try {
      const payload: Partial<Certification> = {
        ...draft,
        title: draft.title?.trim(), code: draft.code?.trim() ?? '', issuer: draft.issuer?.trim(),
        credentialId: draft.credentialId?.trim() ?? '', verificationUrl: draft.verificationUrl?.trim() || undefined,
        badgeIcon: draft.badgeIcon?.trim() || 'Award', skillsValidated: draft.skillsValidated ?? [],
        sortOrder: Number(draft.sortOrder ?? 0), isFeatured: Boolean(draft.isFeatured),
      };
      draft.id ? await api.updateCertification(draft.id, payload) : await api.createCertification(payload);
      setDraft(null); await refreshData(); showToast('Certification saved', 'success');
    } catch (error) { showToast(errorMessage(error), 'error'); } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this certification/preparation track?')) return;
    try { await api.deleteCertification(id); await refreshData(); showToast('Certification deleted', 'info'); }
    catch (error) { showToast(errorMessage(error), 'error'); }
  };

  return <div className="space-y-4">
    <div className="flex items-center justify-between gap-3"><div><div className="text-white font-semibold">Certification & Preparation Tracks</div><div className="text-white/40 text-[10px] mt-1">Persistent CMS management for the cards rendered by the portfolio.</div></div><button onClick={() => setDraft({ title: '', code: '', issuer: '', credentialId: '', badgeIcon: 'Award', issueDate: new Date().toISOString().slice(0,10), categoryId: categories[0]?.id ?? '', skillsValidated: [], isFeatured: true, sortOrder: certifications.length })} className="px-3 py-2 rounded bg-[#00d4ff] text-black font-bold uppercase tracking-wider"><Plus className="w-3.5 h-3.5 inline mr-1" />Add</button></div>
    <div className="divide-y divide-white/10 rounded-xl bg-black border border-white/10 overflow-hidden">{certifications.length === 0 ? <div className="p-6 text-center text-white/35">No certifications configured.</div> : certifications.map((item) => <div key={item.id} className="p-4 flex items-center justify-between gap-3"><div><div className="text-white font-bold">{item.title}</div><div className="text-[10px] text-white/40 mt-1">{item.issuer} · {item.code || 'No code'} · {item.skillsValidated.length} skills</div></div><div className="flex gap-2"><button onClick={() => setDraft(item)} className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10">Edit</button><button onClick={() => void remove(item.id)} className="text-red-300"><Trash2 className="w-4 h-4" /></button></div></div>)}</div>
    {draft && <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm overflow-y-auto"><div className="w-full max-w-2xl bg-[#111114] border border-white/15 rounded-xl p-5 my-8"><div className="flex justify-between items-center pb-3 border-b border-white/10"><h4 className="text-white font-bold uppercase">{draft.id ? 'Edit Certification' : 'Add Certification'}</h4><button onClick={() => setDraft(null)} className="text-white/40"><X className="w-5 h-5" /></button></div><form onSubmit={save} className="space-y-3 mt-4 text-xs"><div className="grid sm:grid-cols-2 gap-3"><div><label className={labelClass}>Title</label><input required value={draft.title ?? ''} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className={inputClass} /></div><div><label className={labelClass}>Code</label><input value={draft.code ?? ''} onChange={(e) => setDraft({ ...draft, code: e.target.value })} className={inputClass} /></div></div><div className="grid sm:grid-cols-2 gap-3"><div><label className={labelClass}>Issuer</label><input required value={draft.issuer ?? ''} onChange={(e) => setDraft({ ...draft, issuer: e.target.value })} className={inputClass} /></div><div><label className={labelClass}>Credential / Track ID</label><input required value={draft.credentialId ?? ''} onChange={(e) => setDraft({ ...draft, credentialId: e.target.value })} className={inputClass} /></div></div><div className="grid sm:grid-cols-2 gap-3"><div><label className={labelClass}>Issue Date</label><input type="date" required value={(draft.issueDate ?? '').slice(0,10)} onChange={(e) => setDraft({ ...draft, issueDate: e.target.value })} className={inputClass} /></div><div><label className={labelClass}>Category</label><select value={draft.categoryId ?? ''} onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })} className={inputClass}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div></div><div><label className={labelClass}>Verification URL</label><input value={draft.verificationUrl ?? ''} onChange={(e) => setDraft({ ...draft, verificationUrl: e.target.value })} className={inputClass} /></div><div><label className={labelClass}>Skills Validated (comma separated)</label><input value={(draft.skillsValidated ?? []).join(', ')} onChange={(e) => setDraft({ ...draft, skillsValidated: e.target.value.split(',').map((value) => value.trim()).filter(Boolean) })} className={inputClass} /></div><div className="grid grid-cols-2 gap-3"><div><label className={labelClass}>Sort Order</label><input type="number" value={draft.sortOrder ?? 0} onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) })} className={inputClass} /></div><label className="flex items-center gap-2 text-white/70 pt-5"><input type="checkbox" checked={Boolean(draft.isFeatured)} onChange={(e) => setDraft({ ...draft, isFeatured: e.target.checked })} />Featured</label></div><div className="flex justify-end gap-2 pt-3 border-t border-white/10"><button type="button" onClick={() => setDraft(null)} className="px-3 py-2 rounded bg-white/5">Cancel</button><button disabled={saving} className="px-4 py-2 rounded bg-[#00d4ff] text-black font-bold">{saving ? 'Saving…' : 'Save'}</button></div></form></div></div>}
  </div>;
};
