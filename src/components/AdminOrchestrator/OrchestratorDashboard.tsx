import React from 'react';
import { Activity, Archive, Boxes, CircleDot, Database, FileWarning, Network, ServerCog, TerminalSquare } from 'lucide-react';
import type { OrchestratorDashboardSummary } from '../../types.js';

function Metric({ label, value, icon: Icon, note }: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; note: string }) {
  return <div className="rounded-xl border border-white/10 bg-black/35 p-4"><div className="flex items-center justify-between"><span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/35">{label}</span><Icon className="h-4 w-4 text-[#00d4ff]" /></div><div className="mt-2 font-mono text-2xl font-bold text-white">{value}</div><p className="mt-1 text-[10px] text-white/35">{note}</p></div>;
}

export const OrchestratorDashboard: React.FC<{ data: OrchestratorDashboardSummary | null }> = ({ data }) => {
  if (!data) return <div className="rounded-xl border border-white/10 bg-black/30 p-6 text-center text-xs text-white/35">Loading persisted Orchestrator metrics…</div>;
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Projects" value={data.projects.total} icon={Boxes} note={`${data.projects.byStatus.DRAFT} draft · ${data.projects.byStatus.PUBLISHED} published`} />
      <Metric label="Labs" value={data.labs.total} icon={Database} note={`${data.labs.byStatus.DRAFT} draft · ${data.labs.byStatus.READY} ready`} />
      <Metric label="Active runtimes" value={data.activeScenarioRuntimes} icon={Activity} note="Session-scoped Phase 7 runtime rows" />
      <Metric label="Missing primary input" value={data.labs.missingPrimaryInput} icon={FileWarning} note="Computed from persisted LabInput records" />
    </div>
    <div className="grid gap-3 lg:grid-cols-2">
      <div className="rounded-xl border border-white/10 bg-black/30 p-4"><div className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider text-white"><CircleDot className="h-4 w-4 text-[#00ff41]" />Domain inventory</div><div className="grid grid-cols-3 gap-2">{([['NETWORKING', Network], ['LINUX', TerminalSquare], ['DEVOPS', ServerCog]] as const).map(([domain, Icon]) => <div key={domain} className="rounded-lg border border-white/10 p-3"><Icon className="h-4 w-4 text-[#00d4ff]" /><div className="mt-2 font-mono text-[9px] text-white/35">{domain}</div><div className="mt-1 font-mono text-lg font-bold text-white">{data.projects.byDomain[domain]} / {data.labs.byDomain[domain]}</div><div className="text-[9px] text-white/25">projects / labs</div></div>)}</div></div>
      <div className="rounded-xl border border-white/10 bg-black/30 p-4"><div className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider text-white"><Archive className="h-4 w-4 text-[#00d4ff]" />Recent orchestration events</div><div className="max-h-48 space-y-2 overflow-auto">{data.recentAuditEvents.length === 0 && <p className="text-xs text-white/35">No persisted audit events.</p>}{data.recentAuditEvents.map((event) => <div key={event.id} className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"><div className="font-mono text-[9px] font-bold text-[#00d4ff]">{event.action}</div><div className="mt-1 flex justify-between gap-3 text-[9px] text-white/30"><span>{event.entityType} {event.entityId ?? ''}</span><span>{new Date(event.createdAt).toLocaleString()}</span></div></div>)}</div></div>
    </div>
  </div>;
};
