import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Copy, Plus } from 'lucide-react';
import type { OrchestratorLabRecord } from '../../types.js';
import { slugify, statusClasses } from './orchestrator-utils.js';

interface Props {
  labs: OrchestratorLabRecord[];
  selectedId: string | null;
  disabled?: boolean;
  onSelect: (id: string) => void;
  onCreate: (input: Record<string, unknown>) => Promise<unknown>;
  onDuplicate: (id: string) => Promise<unknown>;
  onReorder: (items: Array<{ id: string; sortOrder: number; expectedRevision: number }>) => Promise<unknown>;
}

export const LabNavigator: React.FC<Props> = ({ labs, selectedId, disabled, onSelect, onCreate, onDuplicate, onReorder }) => {
  const [title, setTitle] = useState('');
  const ordered = useMemo(() => [...labs].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title)), [labs]);
  useEffect(() => { if (!selectedId && ordered[0]) onSelect(ordered[0].id); }, [ordered, selectedId, onSelect]);
  const move = async (id: string, delta: -1 | 1) => {
    const index = ordered.findIndex((entry) => entry.id === id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    const next = [...ordered];
    [next[index], next[target]] = [next[target], next[index]];
    await onReorder(next.map((entry, position) => ({ id: entry.id, sortOrder: position, expectedRevision: entry.revision })));
  };
  return <div className="space-y-3 rounded-xl border border-white/10 bg-black/25 p-3"><div className="font-mono text-[9px] font-bold uppercase tracking-wider text-white/35">Labs</div><div className="space-y-2">{ordered.map((lab) => <div key={lab.id} className={`rounded-lg border p-3 ${selectedId === lab.id ? 'border-[#00d4ff]/50 bg-[#00d4ff]/10' : 'border-white/10 hover:border-white/20'}`}><button type="button" onClick={() => onSelect(lab.id)} className="w-full text-left"><div className="flex justify-between gap-2"><span className="truncate text-xs text-white">{lab.title}</span><span className={`rounded border px-1.5 py-0.5 font-mono text-[8px] ${statusClasses(lab.status)}`}>{lab.status}</span></div><div className="mt-1 flex justify-between font-mono text-[9px] text-white/30"><span>{lab.kind}</span><span>r{lab.revision}</span></div></button>{selectedId === lab.id && <div className="mt-2 flex gap-2"><button type="button" disabled={disabled} onClick={() => void onDuplicate(lab.id)} className="inline-flex items-center gap-1 text-[9px] text-[#00d4ff]"><Copy className="h-3 w-3" />Duplicate</button><button aria-label="Move Lab up" type="button" disabled={disabled || ordered[0]?.id === lab.id} onClick={() => void move(lab.id, -1)} className="rounded border border-white/10 p-1 text-white/45 disabled:opacity-20"><ArrowUp className="h-3 w-3" /></button><button aria-label="Move Lab down" type="button" disabled={disabled || ordered.at(-1)?.id === lab.id} onClick={() => void move(lab.id, 1)} className="rounded border border-white/10 p-1 text-white/45 disabled:opacity-20"><ArrowDown className="h-3 w-3" /></button></div>}</div>)}</div><div className="space-y-2 border-t border-white/10 pt-3"><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="New Lab title" className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-xs text-white" /><button type="button" disabled={disabled || !title.trim()} onClick={() => { void onCreate({ title: title.trim(), slug: slugify(title), summary: `${title.trim()} lab`, manifestVersion: '1.0', capabilities: [], normalizedState: {}, metadata: {} }).then(() => setTitle('')); }} className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#00ff41]/25 bg-[#00ff41]/10 px-3 py-2 font-mono text-[9px] font-bold uppercase text-[#00ff41] disabled:opacity-40"><Plus className="h-3.5 w-3.5" />Create DRAFT Lab</button></div></div>;
};
