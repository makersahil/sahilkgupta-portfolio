import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import type { Category, OrchestratorProjectRecord } from '../../types.js';
import { JsonFieldEditor } from './JsonFieldEditor.js';

export const ProjectEditor: React.FC<{ project: OrchestratorProjectRecord; categories: Category[]; disabled?: boolean; onSave: (input: Record<string, unknown>) => Promise<unknown> }> = ({ project, categories, disabled, onSave }) => {
  const [draft, setDraft] = useState(project);
  useEffect(() => setDraft(project), [project]);
  const field = (name: keyof OrchestratorProjectRecord, value: unknown) => setDraft((current) => ({ ...current, [name]: value }));
  const save = () => onSave({
    expectedRevision: project.revision,
    title: draft.title,
    slug: draft.slug,
    summary: draft.summary,
    categoryId: draft.categoryId,
    domain: draft.domain,
    descriptionMarkdown: draft.descriptionMarkdown,
    mission: draft.mission,
    architectureSummary: draft.architectureSummary,
    whatIBuilt: draft.whatIBuilt,
    lifecycleStatus: draft.lifecycleStatus,
    formatType: draft.formatType,
    featured: draft.featured,
    sortOrder: draft.sortOrder,
    coverImageUrl: draft.coverImageUrl,
    liveUrl: draft.liveUrl,
    githubUrl: draft.githubUrl,
    architectureSvg: draft.architectureSvg,
    packetTracerFile: draft.packetTracerFile,
    topologyConfigJson: draft.topologyConfigJson,
    metrics: draft.metrics,
    technologies: draft.technologies,
    tags: draft.tags,
  });
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-[#111114] p-5">
    <div className="flex items-center justify-between"><div><div className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#00d4ff]">Project editor</div><p className="mt-1 text-[10px] text-white/35">Publication is controlled only by the validation and publication workflow.</p></div><button type="button" disabled={disabled} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-lg border border-[#00ff41]/30 bg-[#00ff41]/10 px-4 py-2 font-mono text-[10px] font-bold uppercase text-[#00ff41] disabled:opacity-40"><Save className="h-3.5 w-3.5" />Save r{project.revision}</button></div>
    <div className="grid gap-3 md:grid-cols-2"><label className="space-y-1"><span className="text-[10px] text-white/40">Title</span><input value={draft.title} onChange={(event) => field('title', event.target.value)} className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-xs text-white" /></label><label className="space-y-1"><span className="text-[10px] text-white/40">Slug</span><input value={draft.slug} onChange={(event) => field('slug', event.target.value)} className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 font-mono text-xs text-white" /></label><label className="space-y-1"><span className="text-[10px] text-white/40">Category / domain</span><select value={draft.categoryId ?? ''} onChange={(event) => { const next = categories.find((entry) => entry.id === event.target.value); if (next?.domain) setDraft((current) => ({ ...current, categoryId: next.id, domain: next.domain! })); }} className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-xs text-white">{categories.filter((entry) => entry.domain).map((entry) => <option key={entry.id} value={entry.id}>{entry.name} · {entry.domain}</option>)}</select></label><label className="space-y-1"><span className="text-[10px] text-white/40">Lifecycle</span><select value={draft.lifecycleStatus} onChange={(event) => field('lifecycleStatus', event.target.value)} className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-xs text-white"><option value="PLANNED">PLANNED</option><option value="IN_PROGRESS">IN_PROGRESS</option><option value="COMPLETED">COMPLETED</option></select></label></div>
    <label className="block space-y-1"><span className="text-[10px] text-white/40">Summary</span><textarea rows={3} value={draft.summary} onChange={(event) => field('summary', event.target.value)} className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-xs text-white" /></label>
    <div className="grid gap-3 lg:grid-cols-3">{([['mission','Mission'],['architectureSummary','Architecture'],['whatIBuilt','What was built']] as const).map(([key,label]) => <label key={key} className="space-y-1"><span className="text-[10px] text-white/40">{label}</span><textarea rows={5} value={draft[key] ?? ''} onChange={(event) => field(key, event.target.value || null)} className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-xs text-white" /></label>)}</div>
    <div className="grid gap-3 md:grid-cols-2"><label className="space-y-1"><span className="text-[10px] text-white/40">Technologies (comma separated)</span><input value={draft.technologies.join(', ')} onChange={(event) => field('technologies', event.target.value.split(',').map((entry) => entry.trim()).filter(Boolean))} className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-xs text-white" /></label><label className="space-y-1"><span className="text-[10px] text-white/40">Tags (comma separated)</span><input value={draft.tags.join(', ')} onChange={(event) => field('tags', event.target.value.split(',').map((entry) => entry.trim()).filter(Boolean))} className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-xs text-white" /></label></div>
    <JsonFieldEditor label="Metrics / optional advanced data" value={draft.metrics} onChange={(value) => field('metrics', value)} rows={7} />
  </div>;
};
