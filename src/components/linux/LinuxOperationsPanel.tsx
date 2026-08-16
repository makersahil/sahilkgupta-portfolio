import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CircleHelp,
  ClipboardList,
  RefreshCw,
  ShieldAlert,
  TerminalSquare,
  Wrench,
} from 'lucide-react';

import { api } from '../../lib/api.js';
import type {
  LinuxHealthStatus,
  LinuxOperationsSnapshot,
  LinuxOperatorContext,
} from '../../types.js';

interface LinuxOperationsPanelProps {
  labSlug: string;
  hostKey: string;
}

function statusClasses(status: LinuxOperationsSnapshot['overallStatus']): string {
  if (status === 'CRITICAL') return 'border-red-500/30 bg-red-500/10 text-red-300';
  if (status === 'DEGRADED') return 'border-amber-400/30 bg-amber-400/10 text-amber-300';
  if (status === 'HEALTHY') return 'border-[#00ff41]/30 bg-[#00ff41]/10 text-[#00ff41]';
  return 'border-white/15 bg-white/5 text-white/45';
}

function healthClasses(status: LinuxHealthStatus): string {
  if (status === 'FAIL') return 'border-red-500/25 bg-red-500/5 text-red-200';
  if (status === 'WARN') return 'border-amber-400/25 bg-amber-400/5 text-amber-200';
  if (status === 'PASS') return 'border-[#00ff41]/20 bg-[#00ff41]/5 text-[#00ff41]';
  return 'border-white/10 bg-white/[0.03] text-white/45';
}

function HealthIcon({ status }: { status: LinuxHealthStatus }) {
  if (status === 'PASS') return <CheckCircle2 className="h-4 w-4" />;
  if (status === 'FAIL' || status === 'WARN') return <AlertTriangle className="h-4 w-4" />;
  return <CircleHelp className="h-4 w-4" />;
}

export const LinuxOperationsPanel: React.FC<LinuxOperationsPanelProps> = ({ labSlug, hostKey }) => {
  const [operations, setOperations] = useState<LinuxOperationsSnapshot | null>(null);
  const [context, setContext] = useState<LinuxOperatorContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!labSlug || !hostKey) return;
    setLoading(true);
    setError(null);
    try {
      const [nextOperations, nextContext] = await Promise.all([
        api.getLinuxOperations(labSlug, hostKey),
        api.getLinuxContext(labSlug, hostKey),
      ]);
      setOperations(nextOperations);
      setContext(nextContext);
    } catch (cause) {
      setOperations(null);
      setContext(null);
      setError(cause instanceof Error ? cause.message : 'Unable to load Linux recorded-state operations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      api.getLinuxOperations(labSlug, hostKey),
      api.getLinuxContext(labSlug, hostKey),
    ])
      .then(([nextOperations, nextContext]) => {
        if (cancelled) return;
        setOperations(nextOperations);
        setContext(nextContext);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setOperations(null);
        setContext(null);
        setError(cause instanceof Error ? cause.message : 'Unable to load Linux recorded-state operations.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [hostKey, labSlug]);

  if (loading && !operations) {
    return <div className="rounded-2xl border border-white/10 bg-[#111114] p-10 text-center font-mono text-xs uppercase tracking-wider text-white/35">Loading recorded-state Linux operations…</div>;
  }

  if (error) {
    return <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-200"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>;
  }

  if (!operations) return null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-white/10 bg-[#111114] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#00d4ff]"><Activity className="h-4 w-4" /> Recorded-State Operations</div>
              <h3 className="mt-2 font-mono text-lg font-bold text-white">{operations.hostname}</h3>
              <p className="mt-2 max-w-2xl text-xs leading-relaxed text-white/50">Health and investigation guidance are derived from persisted normalized Lab state. No shell command is executed and no live host telemetry is claimed.</p>
            </div>
            <button type="button" onClick={() => void load()} className="rounded-lg border border-white/10 bg-black p-2 text-white/45 hover:text-white" title="Reload operations"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-lg border border-white/10 bg-black/50 p-3"><div className="text-[9px] uppercase tracking-wider text-white/30">Services</div><div className="mt-1 font-mono text-lg font-bold text-white">{operations.counts.services}</div><div className="text-[9px] text-white/35">{operations.counts.failedServices} failed</div></div>
            <div className="rounded-lg border border-white/10 bg-black/50 p-3"><div className="text-[9px] uppercase tracking-wider text-white/30">Mount records</div><div className="mt-1 font-mono text-lg font-bold text-white">{operations.counts.mounts}</div><div className="text-[9px] text-white/35">{operations.counts.problemMounts} flagged</div></div>
            <div className="rounded-lg border border-white/10 bg-black/50 p-3"><div className="text-[9px] uppercase tracking-wider text-white/30">Interfaces</div><div className="mt-1 font-mono text-lg font-bold text-white">{operations.counts.interfaces}</div><div className="text-[9px] text-white/35">{operations.counts.downInterfaces} down</div></div>
            <div className="rounded-lg border border-white/10 bg-black/50 p-3"><div className="text-[9px] uppercase tracking-wider text-white/30">Findings</div><div className="mt-1 font-mono text-lg font-bold text-white">{operations.counts.findings}</div><div className="text-[9px] text-white/35">{operations.counts.recordedLogs} recorded logs</div></div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111114] p-5">
          <div className="text-[9px] uppercase tracking-wider text-white/35">Derived status</div>
          <div className={`mt-2 inline-flex rounded border px-2.5 py-1.5 font-mono text-xs font-bold ${statusClasses(operations.overallStatus)}`}>{operations.overallStatus}</div>
          <div className="mt-5 text-[9px] uppercase tracking-wider text-white/35">Operator context</div>
          <div className="mt-2 rounded-lg border border-[#00ff41]/20 bg-black p-3 font-mono text-xs font-bold text-[#00ff41]">{context?.prompt ?? 'RHEL/CONTEXT>'}</div>
          <p className="mt-2 text-[10px] leading-relaxed text-white/35">This context is active in the Unified CLI. Scenario overlays are session-scoped, while this Operations view remains read-only and does not execute host commands.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#111114] p-5">
        <div className="mb-4 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-white"><ShieldAlert className="h-4 w-4 text-[#00d4ff]" /> Health Analysis</div>
        <div className="grid gap-3 md:grid-cols-2">
          {operations.healthChecks.map((check) => (
            <div key={check.id} className={`rounded-xl border p-4 ${healthClasses(check.status)}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider"><HealthIcon status={check.status} />{check.category}</div>
                <span className="font-mono text-[9px] font-bold">{check.status}</span>
              </div>
              <div className="mt-2 text-sm font-semibold text-white">{check.title}</div>
              <p className="mt-1 text-xs leading-relaxed text-white/50">{check.summary}</p>
              {check.evidence.length > 0 && <div className="mt-3 space-y-1">{check.evidence.slice(0, 4).map((line) => <div key={line} className="rounded bg-black/40 px-2 py-1 font-mono text-[9px] text-white/45">{line}</div>)}</div>}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#111114] p-5">
        <div className="mb-4 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-white"><Wrench className="h-4 w-4 text-amber-300" /> Investigation & Remediation Guidance</div>
        {operations.findings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-white/35">No explicit failure/degradation finding can be derived from the recorded host state. Unknown/missing data remains visible in Health Analysis.</div>
        ) : (
          <div className="space-y-3">
            {operations.findings.map((finding) => (
              <div key={finding.id} className={`rounded-xl border p-4 ${finding.severity === 'CRITICAL' ? 'border-red-500/25 bg-red-500/5' : finding.severity === 'WARN' ? 'border-amber-400/20 bg-amber-400/5' : 'border-white/10 bg-black/20'}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#00d4ff]">{finding.category} // {finding.severity}</div>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-white/30">Recorded-state diagnostic</span>
                </div>
                <div className="mt-2 text-sm font-semibold text-white">{finding.title}</div>
                <p className="mt-1 text-xs leading-relaxed text-white/55">{finding.summary}</p>

                {finding.evidence.length > 0 && <div className="mt-3"><div className="mb-1 text-[9px] uppercase tracking-wider text-white/30">Evidence</div><div className="space-y-1">{finding.evidence.map((line) => <div key={line} className="rounded bg-black/50 px-2 py-1 font-mono text-[9px] text-white/50">{line}</div>)}</div></div>}

                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <div>
                    <div className="mb-1 flex items-center gap-1 text-[9px] uppercase tracking-wider text-white/30"><TerminalSquare className="h-3 w-3" /> Suggested inspection commands</div>
                    <div className="space-y-1">{finding.suggestedCommands.map((command) => <code key={command} className="block overflow-x-auto rounded bg-black px-2 py-1.5 font-mono text-[9px] text-[#00ff41]">{command}</code>)}</div>
                  </div>
                  <div>
                    <div className="mb-1 text-[9px] uppercase tracking-wider text-white/30">Guidance</div>
                    <div className="space-y-1.5">{finding.remediationGuidance.map((step) => <div key={step} className="flex gap-2 text-[10px] leading-relaxed text-white/50"><span className="text-[#00d4ff]">›</span><span>{step}</span></div>)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#111114] p-5">
        <div className="mb-4 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-white"><ClipboardList className="h-4 w-4 text-violet-300" /> Scenario Readiness</div>
        {operations.scenarioReadiness.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 p-5 text-xs text-white/35">No enabled/disabled Linux scenario definitions are attached to this Lab yet.</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {operations.scenarioReadiness.map((scenario) => (
              <div key={scenario.id} className="rounded-xl border border-white/10 bg-black/30 p-4">
                <div className="flex items-center justify-between gap-2"><div className="font-mono text-xs font-bold text-white">{scenario.title}</div><span className={`rounded border px-2 py-1 font-mono text-[8px] uppercase ${scenario.enabled ? 'border-[#00ff41]/20 text-[#00ff41]' : 'border-white/10 text-white/30'}`}>{scenario.executionAvailable ? 'session runnable' : scenario.enabled ? 'ready contract' : 'disabled'}</span></div>
                <p className="mt-2 text-xs leading-relaxed text-white/45">{scenario.summary}</p>
                {scenario.observableSignals.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{scenario.observableSignals.map((signal) => <span key={signal} className="rounded border border-violet-400/15 bg-violet-400/5 px-2 py-1 font-mono text-[8px] text-violet-200/70">{signal}</span>)}</div>}
                <div className="mt-3 font-mono text-[8px] uppercase tracking-wider text-amber-300/60">{scenario.executionAvailable ? 'Run from the Scenario Runtime panel' : 'Execution unavailable'}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-[10px] leading-relaxed text-white/35">{operations.note}</div>
    </div>
  );
};
