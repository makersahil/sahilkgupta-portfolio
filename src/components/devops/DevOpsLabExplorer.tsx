import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Boxes,
  CloudCog,
  Database,
  FileCode2,
  GitBranch,
  GitPullRequest,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

import { api } from '../../lib/api.js';
import { ScenarioControlPanel } from '../scenarios/index.js';
import type { DevOpsLabState, DevOpsLabSummary, DevOpsPipelineStageState } from '../../types.js';
import { DevOpsOperationsPanel } from './DevOpsOperationsPanel.js';

type View = 'pipeline' | 'iac' | 'kubernetes' | 'gitops' | 'observability';

function statusTone(status: string): string {
  if (['SUCCESS', 'READY', 'SYNCED', 'HEALTHY', 'PASS', 'ENFORCED'].includes(status)) return 'border-[#00ff41]/30 bg-[#00ff41]/10 text-[#00ff41]';
  if (['FAILED', 'FAIL'].includes(status)) return 'border-red-500/30 bg-red-500/10 text-red-300';
  if (['RUNNING', 'PENDING', 'DEGRADED', 'WARN', 'OUT_OF_SYNC'].includes(status)) return 'border-amber-400/30 bg-amber-400/10 text-amber-300';
  return 'border-white/15 bg-white/5 text-white/45';
}

function StageCard({ stage }: { stage: DevOpsPipelineStageState }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/35 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-mono text-xs font-bold text-white">{stage.name}</div>
          <div className="mt-1 text-[10px] text-white/35">{stage.tool ?? 'Tool not recorded'}{stage.durationSeconds === null ? '' : ` · ${stage.durationSeconds}s recorded`}</div>
        </div>
        <span className={`rounded border px-2 py-1 font-mono text-[9px] font-bold ${statusTone(stage.status)}`}>{stage.status}</span>
      </div>
      {stage.recordedOutput && <pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-black p-3 font-mono text-[10px] leading-relaxed text-white/60">{stage.recordedOutput}</pre>}
      {stage.artifacts.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{stage.artifacts.map((artifact) => <span key={artifact} className="rounded border border-[#00d4ff]/20 bg-[#00d4ff]/5 px-2 py-1 font-mono text-[9px] text-[#00d4ff]/80">{artifact}</span>)}</div>}
    </div>
  );
}

export const DevOpsLabExplorer: React.FC = () => {
  const [labs, setLabs] = useState<DevOpsLabSummary[]>([]);
  const [activeLabSlug, setActiveLabSlug] = useState('');
  const [state, setState] = useState<DevOpsLabState | null>(null);
  const [view, setView] = useState<View>('pipeline');
  const [activeView, setActiveView] = useState<'inspect' | 'operations'>('inspect');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const visibleViews = useMemo<View[]>(() => {
    if (!state) return ['pipeline'];
    const result: View[] = [];
    if (state.pipelines.length > 0) result.push('pipeline');
    if (state.terraform?.present || state.terraform?.files.length) result.push('iac');
    if (state.kubernetes.clusters.length || state.kubernetes.workloads.length) result.push('kubernetes');
    if (state.gitops.length || state.helm.length || state.networkPolicies.length) result.push('gitops');
    if (state.observability.length || state.architecture.length) result.push('observability');
    return result.length > 0 ? result : ['pipeline'];
  }, [state]);

  async function loadLabs() {
    setLoading(true);
    setError(null);
    try {
      const nextLabs = await api.getDevOpsLabs();
      setLabs(nextLabs);
      const nextSlug = nextLabs.some((lab) => lab.slug === activeLabSlug) ? activeLabSlug : nextLabs[0]?.slug ?? '';
      setActiveLabSlug(nextSlug);
      if (!nextSlug) {
        setState(null);
        return;
      }
      const nextState = await api.getDevOpsLab(nextSlug);
      setState(nextState);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load the DevOps Lab engine.');
      setState(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadLabs(); }, []);

  useEffect(() => {
    if (!activeLabSlug || state?.lab.slug === activeLabSlug) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void api.getDevOpsLab(activeLabSlug)
      .then((nextState) => { if (!cancelled) setState(nextState); })
      .catch((cause: unknown) => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Unable to load the selected DevOps Lab.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeLabSlug, state?.lab.slug]);

  useEffect(() => {
    if (!visibleViews.includes(view)) setView(visibleViews[0] ?? 'pipeline');
  }, [view, visibleViews]);

  return (
    <section id="devops-workspace-section" className="border-b border-white/10 bg-[#09090b] py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-7 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded border border-[#00d4ff]/25 bg-[#00d4ff]/5 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[#00d4ff]"><CloudCog className="h-3.5 w-3.5" /> Dynamic DevOps Engine</div>
            <h2 className="font-mono text-2xl font-bold uppercase tracking-tight text-white sm:text-3xl">Delivery Control Plane</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/55">Inspect persisted delivery state and investigate recorded pipeline, Terraform, Kubernetes, GitOps, Helm, policy and observability signals from canonical Lab manifests. Only modules actually represented by the selected Lab are rendered.</p>
          </div>
          <button type="button" onClick={() => void loadLabs()} className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#111114] px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-white/60 hover:text-white"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh persisted state</button>
        </div>

        {error && <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-200"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
        {loading && !state ? <div className="rounded-2xl border border-white/10 bg-[#111114] p-10 text-center font-mono text-xs uppercase tracking-wider text-white/35">Loading DevOps Lab state…</div> : null}
        {!loading && labs.length === 0 && !error ? <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center font-mono text-xs text-white/35">No READY DevOps Labs belong to a published project.</div> : null}

        {state && (
          <>
            <ScenarioControlPanel labSlug={state.lab.slug} onStateChange={loadLabs} />
            <div className="mb-5 grid gap-3 rounded-2xl border border-white/10 bg-[#111114] p-4 lg:grid-cols-[1.4fr_1fr_1fr]">
              <label>
                <span className="mb-1 block font-mono text-[9px] uppercase tracking-wider text-white/35">DevOps Lab</span>
                <select value={activeLabSlug} onChange={(event) => setActiveLabSlug(event.target.value)} className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 font-mono text-xs text-white">
                  {labs.map((lab) => <option key={lab.id} value={lab.slug}>{lab.title} · {lab.pipelineCount} pipeline{lab.pipelineCount === 1 ? '' : 's'}</option>)}
                </select>
              </label>
              <div><span className="mb-1 block font-mono text-[9px] uppercase tracking-wider text-white/35">Recorded source</span><div className="rounded-lg border border-white/10 bg-black px-3 py-2 font-mono text-[10px] text-white/55">{state.repository?.branch ?? 'branch not recorded'} · {state.repository?.commitSha ?? 'revision not recorded'}</div></div>
              <div><span className="mb-1 block font-mono text-[9px] uppercase tracking-wider text-white/35">Provenance</span><div className="rounded-lg border border-white/10 bg-black px-3 py-2 font-mono text-[10px] text-white/55">{state.provenance.sourceType.replaceAll('_', ' ')} · {state.inputs.length} input{state.inputs.length === 1 ? '' : 's'}</div></div>
            </div>

            <div className="mb-5 grid gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-white/10 bg-[#111114] p-4"><div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[#00d4ff]"><GitBranch className="h-3.5 w-3.5" /> Pipelines</div><div className="mt-2 font-mono text-xl font-bold text-white">{state.pipelines.length}</div></div>
              <div className="rounded-xl border border-white/10 bg-[#111114] p-4"><div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[#00d4ff]"><FileCode2 className="h-3.5 w-3.5" /> IaC files</div><div className="mt-2 font-mono text-xl font-bold text-white">{state.terraform?.files.filter((file) => file.type === 'FILE').length ?? 0}</div></div>
              <div className="rounded-xl border border-white/10 bg-[#111114] p-4"><div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[#00d4ff]"><Boxes className="h-3.5 w-3.5" /> Workloads</div><div className="mt-2 font-mono text-xl font-bold text-white">{state.kubernetes.workloads.length}</div></div>
              <div className="rounded-xl border border-white/10 bg-[#111114] p-4"><div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[#00d4ff]"><Activity className="h-3.5 w-3.5" /> Observations</div><div className="mt-2 font-mono text-xl font-bold text-white">{state.observability.length}</div></div>
            </div>

            <div className="mb-4 flex gap-1 rounded-xl border border-white/10 bg-[#111114] p-1.5">
              <button type="button" onClick={() => setActiveView('inspect')} className={`rounded-lg px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider transition ${activeView === 'inspect' ? 'bg-[#00d4ff]/10 text-[#00d4ff]' : 'text-white/45 hover:bg-white/5 hover:text-white'}`}>Delivery Inspector</button>
              <button type="button" onClick={() => setActiveView('operations')} className={`flex items-center gap-2 rounded-lg px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider transition ${activeView === 'operations' ? 'bg-[#00ff41]/10 text-[#00ff41]' : 'text-white/45 hover:bg-white/5 hover:text-white'}`}><Activity className="h-3.5 w-3.5" /> Operations</button>
            </div>

            {activeView === 'inspect' ? (
              <>
                <div className="mb-4 flex flex-wrap gap-2 rounded-xl border border-white/10 bg-[#111114] p-2">
                  {visibleViews.map((item) => <button key={item} type="button" onClick={() => setView(item)} className={`rounded-lg px-3 py-2 font-mono text-[10px] uppercase tracking-wider ${view === item ? 'bg-[#00d4ff]/10 text-[#00d4ff] ring-1 ring-[#00d4ff]/25' : 'text-white/45 hover:text-white'}`}>{item}</button>)}
                </div>

                {view === 'pipeline' && <div className="space-y-4">{state.pipelines.map((pipeline) => <div key={pipeline.id} className="rounded-2xl border border-white/10 bg-[#111114] p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><div className="font-mono text-sm font-bold text-white">{pipeline.name}</div><div className="mt-1 text-xs text-white/40">{pipeline.framework ?? 'Framework not recorded'} · recorded pipeline snapshot</div></div><span className={`rounded border px-2 py-1 font-mono text-[9px] font-bold ${statusTone(pipeline.status)}`}>{pipeline.status}</span></div><div className="grid gap-3 lg:grid-cols-2">{pipeline.stages.map((stage) => <StageCard key={stage.id} stage={stage} />)}</div></div>)}{state.pipelines.length === 0 && <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-xs text-white/35">No normalized pipeline snapshot is attached.</div>}</div>}

            {view === 'iac' && <div className="rounded-2xl border border-white/10 bg-[#111114] p-5"><div className="mb-4 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-[#00d4ff]"><Database className="h-4 w-4" /> Terraform / IaC snapshot</div><div className="space-y-3">{state.terraform?.files.map((file) => <div key={file.path} className="rounded-xl border border-white/10 bg-black/35 p-4"><div className="flex items-center justify-between gap-3"><span className="font-mono text-xs font-bold text-white">{file.path}</span><span className="font-mono text-[9px] text-white/35">{file.type}{file.size ? ` · ${file.size}` : ''}</span></div>{file.content && <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-black p-3 font-mono text-[10px] leading-relaxed text-[#00ff41]/80">{file.content}</pre>}</div>)}{!state.terraform?.files.length && <div className="text-xs text-white/35">No Terraform/IaC file snapshot is attached.</div>}</div></div>}

            {view === 'kubernetes' && <div className="grid gap-4 lg:grid-cols-2"><div className="rounded-2xl border border-white/10 bg-[#111114] p-5"><div className="mb-3 font-mono text-[10px] uppercase tracking-wider text-[#00d4ff]">Clusters</div>{state.kubernetes.clusters.map((cluster) => <div key={cluster.name} className="mb-2 rounded-lg border border-white/10 bg-black/35 p-3"><div className="flex justify-between gap-2"><span className="font-mono text-xs font-bold text-white">{cluster.name}</span><span className={`rounded border px-2 py-0.5 font-mono text-[9px] ${statusTone(cluster.status)}`}>{cluster.status}</span></div><div className="mt-2 text-[10px] text-white/40">{cluster.provider ?? 'provider not recorded'} · {cluster.version ?? 'version not recorded'}</div></div>)}{state.kubernetes.clusters.length === 0 && <div className="text-xs text-white/35">No Kubernetes cluster snapshot is attached.</div>}</div><div className="rounded-2xl border border-white/10 bg-[#111114] p-5"><div className="mb-3 font-mono text-[10px] uppercase tracking-wider text-[#00d4ff]">Workloads</div>{state.kubernetes.workloads.map((workload) => <div key={`${workload.namespace ?? 'default'}:${workload.kind}:${workload.name}`} className="mb-2 rounded-lg border border-white/10 bg-black/35 p-3"><div className="flex justify-between gap-2"><span className="font-mono text-xs font-bold text-white">{workload.kind}/{workload.name}</span><span className={`rounded border px-2 py-0.5 font-mono text-[9px] ${statusTone(workload.status)}`}>{workload.status}</span></div><div className="mt-2 text-[10px] text-white/40">{workload.namespace ?? 'namespace not recorded'}{workload.desiredReplicas === null ? '' : ` · ${workload.readyReplicas ?? '?'} / ${workload.desiredReplicas} ready`}</div></div>)}{state.kubernetes.workloads.length === 0 && <div className="text-xs text-white/35">No Kubernetes workload snapshot is attached.</div>}</div></div>}

            {view === 'gitops' && <div className="grid gap-4 lg:grid-cols-3"><div className="rounded-2xl border border-white/10 bg-[#111114] p-5"><div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[#00d4ff]"><GitPullRequest className="h-3.5 w-3.5" /> GitOps</div>{state.gitops.map((app) => <div key={app.name} className="mb-2 rounded-lg border border-white/10 bg-black/35 p-3"><div className="font-mono text-xs font-bold text-white">{app.name}</div><div className="mt-2 flex gap-2"><span className={`rounded border px-2 py-0.5 font-mono text-[9px] ${statusTone(app.syncStatus)}`}>{app.syncStatus}</span><span className={`rounded border px-2 py-0.5 font-mono text-[9px] ${statusTone(app.healthStatus)}`}>{app.healthStatus}</span></div></div>)}{state.gitops.length === 0 && <div className="text-xs text-white/35">No GitOps application snapshot is attached.</div>}</div><div className="rounded-2xl border border-white/10 bg-[#111114] p-5"><div className="mb-3 font-mono text-[10px] uppercase tracking-wider text-[#00d4ff]">Helm</div>{state.helm.map((release) => <div key={release.name} className="mb-2 rounded-lg border border-white/10 bg-black/35 p-3"><div className="font-mono text-xs font-bold text-white">{release.name}</div><div className="mt-2 text-[10px] text-white/40">{release.chart ?? 'chart not recorded'} · {release.version ?? 'version not recorded'}</div></div>)}{state.helm.length === 0 && <div className="text-xs text-white/35">No Helm release snapshot is attached.</div>}</div><div className="rounded-2xl border border-white/10 bg-[#111114] p-5"><div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[#00d4ff]"><ShieldCheck className="h-3.5 w-3.5" /> Network policy</div>{state.networkPolicies.map((policy) => <div key={policy.name} className="mb-2 rounded-lg border border-white/10 bg-black/35 p-3"><div className="font-mono text-xs font-bold text-white">{policy.name}</div><div className="mt-2 text-[10px] text-white/40">{policy.provider ?? 'provider not recorded'} · {policy.status}</div></div>)}{state.networkPolicies.length === 0 && <div className="text-xs text-white/35">No network-policy snapshot is attached.</div>}</div></div>}

            {view === 'observability' && <div className="space-y-4"><div className="grid gap-3 lg:grid-cols-2">{state.observability.map((item) => <div key={item.id} className="rounded-xl border border-white/10 bg-[#111114] p-4"><div className="flex justify-between gap-3"><div><div className="font-mono text-xs font-bold text-white">{item.name}</div><div className="mt-1 text-[10px] text-white/35">{item.provider ?? 'provider not recorded'}</div></div><span className={`rounded border px-2 py-1 font-mono text-[9px] ${statusTone(item.status)}`}>{item.status}</span></div>{item.recordedOutput && <pre className="mt-3 whitespace-pre-wrap rounded-lg border border-white/10 bg-black p-3 font-mono text-[10px] leading-relaxed text-white/55">{item.recordedOutput}</pre>}</div>)}</div><div className="grid gap-3 md:grid-cols-2">{state.architecture.map((layer) => <div key={layer.tier} className="rounded-xl border border-white/10 bg-[#111114] p-4"><div className="font-mono text-xs font-bold text-white">{layer.tier}</div>{layer.description && <p className="mt-2 text-xs leading-relaxed text-white/45">{layer.description}</p>}<div className="mt-3 flex flex-wrap gap-2">{layer.technologies.map((tech) => <span key={tech} className="rounded border border-white/10 bg-black px-2 py-1 font-mono text-[9px] text-white/55">{tech}</span>)}</div>{layer.recordedMetric && <div className="mt-3 font-mono text-[9px] uppercase tracking-wider text-amber-300/70">Recorded fixture: {layer.recordedMetric}</div>}</div>)}</div>{state.observability.length === 0 && state.architecture.length === 0 && <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-xs text-white/35">No observability or architecture snapshot is attached. Live metrics are not fabricated.</div>}</div>}

              </>
            ) : (
              <DevOpsOperationsPanel labSlug={state.lab.slug} pipelines={state.pipelines} />
            )}

            {state.warnings.length > 0 && <div className="mt-5 rounded-xl border border-amber-400/15 bg-amber-400/5 p-4"><div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-300">Evidence boundaries</div>{state.warnings.map((warning) => <div key={warning} className="mt-1 text-xs text-amber-100/65">• {warning}</div>)}</div>}
          </>
        )}
      </div>
    </section>
  );
};
