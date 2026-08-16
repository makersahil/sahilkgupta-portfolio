import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Copy, Plus, Search } from 'lucide-react';
import type { Category, LabDomain, OrchestratorProjectRecord } from '../../types.js';
import { slugify, statusClasses } from './orchestrator-utils.js';

interface ProjectNavigatorProps {
  projects: OrchestratorProjectRecord[];
  categories: Category[];
  selectedId: string | null;
  disabled?: boolean;
  onSelect: (id: string) => void;
  onCreate: (input: Record<string, unknown>) => Promise<unknown>;
  onDuplicate: (id: string) => Promise<unknown>;
  onReorder: (items: Array<{ id: string; sortOrder: number; expectedRevision: number }>) => Promise<unknown>;
}

export const ProjectNavigator: React.FC<ProjectNavigatorProps> = ({ projects, categories, selectedId, disabled, onSelect, onCreate, onDuplicate, onReorder }) => {
  const [query, setQuery] = useState('');
  const [title, setTitle] = useState('');
  const [domain, setDomain] = useState<LabDomain>('NETWORKING');
  const ordered = useMemo(() => [...projects].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title)), [projects]);
  const filtered = useMemo(() => ordered.filter((project) => `${project.title} ${project.slug} ${project.domain}`.toLowerCase().includes(query.toLowerCase())), [ordered, query]);
  const category = categories.find((entry) => entry.domain === domain);

  const create = async () => {
    if (!title.trim() || !category) return;
    await onCreate({ title: title.trim(), slug: slugify(title), domain, summary: `${title.trim()} portfolio project`, categoryId: category.id, lifecycleStatus: 'PLANNED', formatType: 'STANDARD' });
    setTitle('');
  };

  const move = async (id: string, delta: -1 | 1) => {
    const index = ordered.findIndex((entry) => entry.id === id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    const next = [...ordered];
    [next[index], next[target]] = [next[target], next[index]];
    await onReorder(next.map((entry, position) => ({ id: entry.id, sortOrder: position, expectedRevision: entry.revision })));
  };

  return <aside className="space-y-3 rounded-2xl border border-white/10 bg-[#111114] p-4">
    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black px-3"><Search className="h-3.5 w-3.5 text-white/30" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects" className="w-full bg-transparent py-2 font-mono text-xs text-white outline-none placeholder:text-white/25" /></div>
    <div className="max-h-[420px] space-y-2 overflow-auto pr-1">{filtered.map((project) => <div key={project.id} className={`rounded-xl border p-3 transition ${selectedId === project.id ? 'border-[#00d4ff]/50 bg-[#00d4ff]/10' : 'border-white/10 bg-black/25 hover:border-white/20'}`}><button type="button" onClick={() => onSelect(project.id)} className="w-full text-left"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="truncate text-xs font-semibold text-white">{project.title}</div><div className="mt-1 truncate font-mono text-[9px] text-white/30">{project.slug}</div></div><span className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[8px] ${statusClasses(project.publicationStatus)}`}>{project.publicationStatus}</span></div><div className="mt-2 flex items-center justify-between font-mono text-[9px] text-white/30"><span>{project.domain}</span><span>r{project.revision}</span></div></button>{selectedId === project.id && <div className="mt-2 flex flex-wrap gap-2"><button type="button" disabled={disabled} onClick={() => void onDuplicate(project.id)} className="inline-flex items-center gap-1 text-[9px] text-[#00d4ff] hover:text-white disabled:opacity-40"><Copy className="h-3 w-3" />Duplicate</button><button aria-label="Move project up" type="button" disabled={disabled || ordered[0]?.id === project.id} onClick={() => void move(project.id, -1)} className="rounded border border-white/10 p-1 text-white/45 disabled:opacity-20"><ArrowUp className="h-3 w-3" /></button><button aria-label="Move project down" type="button" disabled={disabled || ordered.at(-1)?.id === project.id} onClick={() => void move(project.id, 1)} className="rounded border border-white/10 p-1 text-white/45 disabled:opacity-20"><ArrowDown className="h-3 w-3" /></button></div>}</div>)}</div>
    <div className="space-y-2 border-t border-white/10 pt-3"><div className="font-mono text-[9px] font-bold uppercase tracking-wider text-white/35">New draft project</div><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Project title" className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-xs text-white outline-none focus:border-[#00d4ff]/40" /><select value={domain} onChange={(event) => setDomain(event.target.value as LabDomain)} className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 font-mono text-xs text-white"><option value="NETWORKING">NETWORKING</option><option value="LINUX">LINUX</option><option value="DEVOPS">DEVOPS</option></select><button type="button" disabled={disabled || !title.trim() || !category} onClick={() => void create()} className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#00ff41]/30 bg-[#00ff41]/10 px-3 py-2 font-mono text-[10px] font-bold uppercase text-[#00ff41] disabled:opacity-40"><Plus className="h-3.5 w-3.5" />Create DRAFT</button>{!category && <p className="text-[9px] text-red-300">A persisted Category for {domain} is required.</p>}</div>
  </aside>;
};
