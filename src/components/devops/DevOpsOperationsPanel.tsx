import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  GitPullRequest,
  ShieldAlert,
  TerminalSquare,
  Wrench,
} from 'lucide-react';

import { api } from '../../lib/api.js';
import type {
  DevOpsHealthCheck,
  DevOpsInvestigationFinding,
  DevOpsOperationsSnapshot,
  DevOpsOperatorContext,
  DevOpsPipelineState,
} from '../../types.js';

function healthClass(status: string): string {
  if (status === 'PASS' || status === 'HEALTHY') return 'border-[#00ff41]/30 bg-[#00ff41]/10 text-[#00ff41]';
  if (status === 'FAIL' || status === 'CRITICAL') return 'border-red-500/30 bg-red-500/10 text-red-300';
  if (status === 'WARN' || status === 'DEGRADED') return 'border-amber-400/30 bg-amber-400/10 text-amber-300';
  return 'border-white/15 bg-white/5 text-white/45';
}

function severityClass(severity: string): string {
  if (severity === 'CRITICAL') return 'border-red-500/30 bg-red-500/10 text-red-300';
  if (severity === 'WARN') return 'border-amber-400/30 bg-amber-400/10 text-amber-300';
  return 'border-[#00d4ff]/25 bg-[#00d4ff]/5 text-[#00d4ff]';
}

function HealthCheckCard({ check }: { check: DevOpsHealthCheck }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/35 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-mono text-xs font-bold text-white">{check.title}</div>
          <div className="mt-1 font-mono text-[9px] uppercase tracking-wider text-white/30">{check.category}</div>
        </div>
        <span className={`rounded border px-2 py-1 font-mono text-[9px] font-bold ${healthClass(check.status)}`}>{check.status}</span>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-white/55">{check.summary}</p>
      {check.evidence.length > 0 && (
        <div className="mt-3 space-y-1">
          {check.evidence.slice(0, 5).map((entry) => <div key={entry} className="font-mono text-[9px] text-white/35">• {entry}</div>)}
        </div>
      )}
    </div>
  );
}

function FindingCard({ finding }: { finding: DevOpsInvestigationFinding }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/35 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-mono text-xs font-bold text-white">{finding.title}</div>
          <div className="mt-1 font-mono text-[9px] uppercase tracking-wider text-white/30">{finding.category}</div>
        </div>
        <span className={`rounded border px-2 py-1 font-mono text-[9px] font-bold ${severityClass(finding.severity)}`}>{finding.severity}</span>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-white/55">{finding.summary}</p>
      {finding.evidence.length > 0 && (
        <div className="mt-3 rounded-lg border border-white/10 bg-black p-3">
          <div className="mb-2 font-mono text-[9px] uppercase tracking-wider text-white/30">Recorded evidence</div>
          {finding.evidence.filter(Boolean).slice(0, 5).map((entry) => <div key={entry} className="font-mono text-[9px] text-white/45">• {entry}</div>)}
        </div>
      )}
      {finding.suggestedCommands.length > 0 && (
        <div className="mt-3">
          <div className="mb-2 flex items-center gap-2 font-mono text-[9px] uppercase tracking-wider text-[#00d4ff]"><TerminalSquare className="h-3 w-3" /> Suggested inspection commands</div>
          <div className="space-y-1">{finding.suggestedCommands.map((command) => <code key={command} className="block overflow-auto rounded border border-white/10 bg-black px-2 py-1.5 font-mono text-[9px] text-white/55">{command}</code>)}</div>
        </div>
      )}
      {finding.remediationGuidance.length > 0 && (
        <div className="mt-3">
          <div className="mb-2 flex items-center gap-2 font-mono text-[9px] uppercase tracking-wider text-amber-300"><Wrench className="h-3 w-3" /> Remediation guidance</div>
          {finding.remediationGuidance.map((entry) => <div key={entry} className="mt-1 text-xs text-amber-100/60">• {entry}</div>)}
        </div>
      )}
    </div>
  );
}

export const DevOpsOperationsPanel: React.FC<{ labSlug: string; pipelines: DevOpsPipelineState[] }> = ({ labSlug, pipelines }) => {
  const [operations, setOperations] = useState<DevOpsOperationsSnapshot | null>(null);
  const [context, setContext] = useState<DevOpsOperatorContext | null>(null);
  const [pipelineId, setPipelineId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void Promise.all([
      api.getDevOpsOperations(labSlug),
      api.getDevOpsContext(labSlug, pipelineId || undefined),
    ])
      .then(([nextOperations, nextContext]) => {
        if (cancelled) return;
        setOperations(nextOperations);
        setContext(nextContext);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Unable to load DevOps operations state.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [labSlug, pipelineId]);

  if (loading && !operations) return <div className="rounded-xl border border-white/10 bg-[#111114] p-8 text-center font-mono text-xs uppercase tracking-wider text-white/35">Loading DevOps operations…</div>;
  if (error) return <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-200"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>;
  if (!operations) return null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-5">
        <div className="rounded-xl border border-white/10 bg-[#111114] p-4"><div className="font-mono text-[9px] uppercase tracking-wider text-white/35">Overall</div><span className={`mt-2 inline-block rounded border px-2 py-1 font-mono text-[9px] font-bold ${healthClass(operations.overallStatus)}`}>{operations.overallStatus}</span></div>
        <div className="rounded-xl border border-white/10 bg-[#111114] p-4"><div className="font-mono text-[9px] uppercase tracking-wider text-white/35">Pipelines</div><div className="mt-2 font-mono text-xl font-bold text-white">{operations.counts.pipelines}</div><div className="mt-1 text-[9px] text-white/30">{operations.counts.failedPipelines} failed</div></div>
        <div className="rounded-xl border border-white/10 bg-[#111114] p-4"><div className="font-mono text-[9px] uppercase tracking-wider text-white/35">Workloads</div><div className="mt-2 font-mono text-xl font-bold text-white">{operations.counts.workloads}</div><div className="mt-1 text-[9px] text-white/30">{operations.counts.problemWorkloads} problem</div></div>
        <div className="rounded-xl border border-white/10 bg-[#111114] p-4"><div className="font-mono text-[9px] uppercase tracking-wider text-white/35">GitOps apps</div><div className="mt-2 font-mono text-xl font-bold text-white">{operations.counts.gitopsApplications}</div><div className="mt-1 text-[9px] text-white/30">{operations.counts.outOfSyncApplications} out/degraded</div></div>
        <div className="rounded-xl border border-white/10 bg-[#111114] p-4"><div className="font-mono text-[9px] uppercase tracking-wider text-white/35">Findings</div><div className="mt-2 font-mono text-xl font-bold text-white">{operations.counts.findings}</div></div>
      </div>

      <section className="rounded-xl border border-white/10 bg-[#111114] p-4">
        <div className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider text-white/65"><Activity className="h-4 w-4 text-[#00d4ff]" /> Recorded-state health</div>
        <div className="grid gap-3 lg:grid-cols-2">{operations.healthChecks.map((check) => <HealthCheckCard key={check.id} check={check} />)}</div>
      </section>

      <section className="rounded-xl border border-white/10 bg-[#111114] p-4">
        <div className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider text-white/65"><ShieldAlert className="h-4 w-4 text-amber-300" /> Investigation findings</div>
        {operations.findings.length > 0 ? <div className="grid gap-3 lg:grid-cols-2">{operations.findings.map((finding) => <FindingCard key={finding.id} finding={finding} />)}</div> : <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-xs text-white/35">No recorded failure or warning condition produced an investigation finding. UNKNOWN checks remain unknown rather than being treated as healthy.</div>}
      </section>

      <section className="rounded-xl border border-white/10 bg-[#111114] p-4">
        <div className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider text-white/65"><TerminalSquare className="h-4 w-4 text-[#00ff41]" /> Operator context</div>
        <div className="grid gap-3 lg:grid-cols-[1fr_1.4fr]">
          <label>
            <span className="mb-1 block font-mono text-[9px] uppercase tracking-wider text-white/35">Context scope</span>
            <select value={pipelineId} onChange={(event) => setPipelineId(event.target.value)} className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 font-mono text-xs text-white">
              <option value="">Lab</option>
              {pipelines.map((pipeline) => <option key={pipeline.id} value={pipeline.id}>Pipeline · {pipeline.name}</option>)}
            </select>
          </label>
          <div>
            <span className="mb-1 block font-mono text-[9px] uppercase tracking-wider text-white/35">Future CLI prompt</span>
            <div className="rounded-lg border border-[#00ff41]/20 bg-black px-3 py-2 font-mono text-xs text-[#00ff41]">{context?.prompt ?? 'GITOPS/...>'}</div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1">{context?.availableInspectors.map((entry) => <span key={entry} className="rounded border border-white/10 px-2 py-1 font-mono text-[8px] text-white/35">{entry}</span>)}</div>
        <p className="mt-3 text-xs text-white/35">{context?.note ?? operations.note}</p>
      </section>

      <section className="rounded-xl border border-white/10 bg-[#111114] p-4">
        <div className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider text-white/65"><GitPullRequest className="h-4 w-4 text-amber-300" /> Scenario-ready definitions</div>
        <div className="grid gap-2 md:grid-cols-2">{operations.scenarioReadiness.map((scenario) => (
          <div key={scenario.id} className="rounded-lg border border-white/10 bg-black/35 p-3">
            <div className="flex items-center justify-between gap-2"><span className="font-mono text-xs font-bold text-white">{scenario.title}</span><span className="rounded border border-amber-400/20 bg-amber-400/5 px-2 py-1 font-mono text-[8px] uppercase text-amber-300">definition only</span></div>
            <p className="mt-2 text-xs text-white/50">{scenario.summary}</p>
            {scenario.observableSignals.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{scenario.observableSignals.map((signal) => <span key={signal} className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-[8px] text-white/35">{signal}</span>)}</div>}
          </div>
        ))}</div>
        {operations.scenarioReadiness.length === 0 && <p className="py-6 text-center font-mono text-xs text-white/30">No enabled scenario definitions are published for this Lab.</p>}
        <div className="mt-3 flex items-start gap-2 rounded border border-amber-400/15 bg-amber-400/5 p-3 text-xs text-amber-100/60"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />These contracts are non-mutating. Scenario run, remediation and reset remain Phase 7; command execution remains Phase 6.</div>
      </section>
    </div>
  );
};
