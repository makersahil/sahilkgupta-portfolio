import React, { useState } from 'react';
import { Network, Save } from 'lucide-react';
import { api } from '../../lib/api.js';
import type { LabAggregate, LabLinkRecord, LabNodeRecord } from '../../types.js';
import { JsonFieldEditor } from './JsonFieldEditor.js';

function nodePayload(nodes: LabNodeRecord[]) { return nodes.map(({ nodeKey, label, kind, description, position, configuration, metadata }) => ({ nodeKey, label, kind, description, position, configuration, metadata })); }
function linkPayload(links: LabLinkRecord[]) { return links.map(({ linkKey, sourceNodeKey, targetNodeKey, label, kind, configuration, metadata }) => ({ linkKey, sourceNodeKey, targetNodeKey, label, kind, configuration, metadata })); }

export const TopologyEditor: React.FC<{ lab: LabAggregate; disabled?: boolean; onChanged: () => Promise<unknown> }> = ({ lab, disabled, onChanged }) => {
  const [nodes, setNodes] = useState<unknown>(nodePayload(lab.nodes));
  const [links, setLinks] = useState<unknown>(linkPayload(lab.links));
  const save = async () => {
    if (!Array.isArray(nodes) || !Array.isArray(links)) throw new Error('Nodes and links must be arrays');
    await api.replaceLabTopology(lab.id, nodes as Array<Partial<LabNodeRecord>>, links as Array<Partial<LabLinkRecord>>);
    await onChanged();
  };
  return <section className="space-y-3 rounded-xl border border-white/10 bg-black/25 p-4"><div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider text-[#00d4ff]"><Network className="h-4 w-4" />Topology editor · {lab.nodes.length} nodes · {lab.links.length} links</div><p className="text-[10px] text-white/35">Maximum 500 nodes and 2,000 links. Linux and DevOps Labs may legitimately have no graph links.</p><div className="grid gap-3 xl:grid-cols-2"><JsonFieldEditor label="Nodes" value={nodes} onChange={setNodes} rows={14} /><JsonFieldEditor label="Links" value={links} onChange={setLinks} rows={14} /></div><button disabled={disabled} onClick={() => void save()} type="button" className="inline-flex items-center gap-2 rounded-lg border border-[#00ff41]/25 bg-[#00ff41]/10 px-3 py-2 font-mono text-[9px] font-bold uppercase text-[#00ff41] disabled:opacity-40"><Save className="h-3.5 w-3.5" />Replace topology atomically</button></section>;
};
