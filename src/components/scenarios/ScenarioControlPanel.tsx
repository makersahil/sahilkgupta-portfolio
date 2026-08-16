import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Play, RefreshCw, RotateCcw, ShieldAlert, Wrench } from 'lucide-react';

import { api } from '../../lib/api.js';
import type { ScenarioOverview } from '../../types.js';

interface ScenarioControlPanelProps {
  labSlug: string;
  onStateChange?: () => Promise<void> | void;
}

function runtimeTone(status?: string): string {
  if (status === 'ACTIVE') return 'border-red-500/30 bg-red-500/10 text-red-200';
  if (status === 'REMEDIATED') return 'border-amber-400/30 bg-amber-400/10 text-amber-200';
  if (status === 'VERIFIED') return 'border-[#00ff41]/30 bg-[#00ff41]/10 text-[#00ff41]';
  return 'border-white/10 bg-white/5 text-white/50';
}

export const ScenarioControlPanel: React.FC<ScenarioControlPanelProps> = ({ labSlug, onStateChange }) => {
  const [overview, setOverview] = useState<ScenarioOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!labSlug) return;
    setLoading(true);
    setError(null);
    try {
      setOverview(await api.getScenarioOverview(labSlug));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load scenario runtime.');
    } finally {
      setLoading(false);
    }
  }, [labSlug]);

  useEffect(() => { void load(); }, [load]);

  const mutate = async (label: string, action: () => Promise<ScenarioOverview>) => {
    setBusy(label);
    setError(null);
    try {
      const next = await action();
      setOverview(next);
      await onStateChange?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Scenario operation failed.');
    } finally {
      setBusy(null);
    }
  };

  if (!overview && loading) {
    return <div className="mb-5 rounded-xl border border-white/10 bg-[#111114] p-4 font-mono text-[10px] uppercase tracking-wider text-white/35">Loading session scenario engine…</div>;
  }

  return (
    <div className="mb-5 rounded-2xl border border-[#ffb000]/20 bg-[#111114] p-4 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#ffb000]">
            <ShieldAlert className="h-4 w-4" /> Scenario Runtime
          </div>
          <p className="mt-2 max-w-3xl text-xs leading-relaxed text-white/50">
            Start a scenario for this browser session only. The engine overlays safe recorded-state mutations or investigation selections on the canonical Lab baseline; it never executes infrastructure commands or rewrites canonical Lab state.
          </p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading || Boolean(busy)} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-[9px] uppercase tracking-wider text-white/55 disabled:opacity-40">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Runtime
        </button>
      </div>

      {error && <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-200"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{error}</div>}

      {overview?.runtime ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-mono text-xs font-bold text-white">{overview.runtime.scenarioTitle}</div>
              <div className="mt-1 font-mono text-[9px] uppercase tracking-wider text-white/35">{overview.runtime.scenarioSlug} · session runtime</div>
            </div>
            <span className={`rounded border px-2 py-1 font-mono text-[9px] font-bold ${runtimeTone(overview.runtime.status)}`}>{overview.runtime.status}</span>
          </div>

          {overview.runtime.verification && (
            <div className={`mt-3 rounded-lg border p-3 text-xs ${overview.runtime.verification.passed ? 'border-[#00ff41]/20 bg-[#00ff41]/5 text-[#00ff41]/80' : 'border-red-500/20 bg-red-500/5 text-red-200'}`}>
              <div className="font-mono text-[10px] font-bold uppercase tracking-wider">{overview.runtime.verification.phase} verification · {overview.runtime.verification.passed ? 'PASS' : 'FAIL'}</div>
              <div className="mt-2 space-y-1 text-[11px]">
                {overview.runtime.verification.checks.map((item) => <div key={item.id}>• {item.passed ? 'PASS' : 'FAIL'} — {item.summary}</div>)}
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => void mutate('verify', () => api.verifyScenario(labSlug))} disabled={Boolean(busy)} className="inline-flex items-center gap-2 rounded-lg border border-[#00d4ff]/25 bg-[#00d4ff]/5 px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-wider text-[#00d4ff] disabled:opacity-40"><CheckCircle2 className="h-3.5 w-3.5" /> Verify</button>
            {overview.runtime.status === 'ACTIVE' && <button type="button" onClick={() => void mutate('remediate', () => api.remediateScenario(labSlug))} disabled={Boolean(busy)} className="inline-flex items-center gap-2 rounded-lg border border-[#ffb000]/25 bg-[#ffb000]/5 px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-wider text-[#ffb000] disabled:opacity-40"><Wrench className="h-3.5 w-3.5" /> Remediate</button>}
            <button type="button" onClick={() => void mutate('reset', () => api.resetScenario(labSlug))} disabled={Boolean(busy)} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-wider text-white/60 disabled:opacity-40"><RotateCcw className="h-3.5 w-3.5" /> Reset</button>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {overview?.scenarios.map((scenario) => (
            <div key={scenario.id} className="rounded-xl border border-white/10 bg-black/25 p-3">
              <div className="font-mono text-[11px] font-bold text-white">{scenario.title}</div>
              <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-white/40">{scenario.summary}</p>
              <button type="button" onClick={() => void mutate(`run:${scenario.slug}`, () => api.runScenario(labSlug, scenario.slug))} disabled={Boolean(busy)} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-2.5 py-1.5 font-mono text-[9px] font-bold uppercase tracking-wider text-red-200 disabled:opacity-40"><Play className="h-3 w-3" /> Start scenario</button>
            </div>
          ))}
          {overview?.scenarios.length === 0 && <div className="text-xs text-white/35">No enabled scenarios are recorded for this Lab.</div>}
        </div>
      )}
    </div>
  );
};
