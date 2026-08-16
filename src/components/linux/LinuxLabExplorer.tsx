import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Database,
  HardDrive,
  RefreshCw,
  Server,
  ShieldCheck,
  TerminalSquare,
} from 'lucide-react';

import { api } from '../../lib/api.js';
import { ScenarioControlPanel } from '../scenarios/index.js';
import type { LinuxHostState, LinuxLabState, LinuxLabSummary } from '../../types.js';
import { LinuxHostInspector } from './LinuxHostInspector.js';
import { LinuxOperationsPanel } from './LinuxOperationsPanel.js';

function statusTone(status: string): string {
  if (status === 'UP') return 'border-[#00ff41]/30 bg-[#00ff41]/10 text-[#00ff41]';
  if (status === 'DOWN') return 'border-red-500/30 bg-red-500/10 text-red-300';
  if (status === 'DEGRADED') return 'border-amber-400/30 bg-amber-400/10 text-amber-300';
  return 'border-white/15 bg-white/5 text-white/45';
}

export const LinuxLabExplorer: React.FC = () => {
  const [labs, setLabs] = useState<LinuxLabSummary[]>([]);
  const [activeLabSlug, setActiveLabSlug] = useState('');
  const [state, setState] = useState<LinuxLabState | null>(null);
  const [selectedHostKey, setSelectedHostKey] = useState('');
  const [activeView, setActiveView] = useState<'inspect' | 'operations'>('inspect');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeHost = useMemo<LinuxHostState | null>(
    () => state?.hosts.find((host) => host.key === selectedHostKey) ?? state?.hosts[0] ?? null,
    [selectedHostKey, state],
  );

  async function loadLabs() {
    setLoading(true);
    setError(null);
    try {
      const nextLabs = await api.getLinuxLabs();
      setLabs(nextLabs);
      const nextSlug = nextLabs.some((lab) => lab.slug === activeLabSlug) ? activeLabSlug : nextLabs[0]?.slug ?? '';
      setActiveLabSlug(nextSlug);
      if (!nextSlug) {
        setState(null);
        return;
      }
      const nextState = await api.getLinuxLab(nextSlug);
      setState(nextState);
      setSelectedHostKey(nextState.hosts[0]?.key ?? '');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load the Linux Lab engine.');
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
    void api.getLinuxLab(activeLabSlug)
      .then((nextState) => {
        if (cancelled) return;
        setState(nextState);
        setSelectedHostKey(nextState.hosts[0]?.key ?? '');
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Unable to load the selected Linux Lab.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeLabSlug, state?.lab.slug]);

  return (
    <section id="linux-workspace-section" className="border-b border-white/10 bg-[#09090b] py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-7 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded border border-[#00ff41]/25 bg-[#00ff41]/5 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[#00ff41]"><TerminalSquare className="h-3.5 w-3.5" /> Dynamic Linux Engine</div>
            <h2 className="font-mono text-2xl font-bold uppercase tracking-tight text-white sm:text-3xl">RHEL Systems Console</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/55">Inspect normalized Linux host state and investigate recorded service, storage, SELinux, network and log signals from persisted Lab manifests. Diagnostics remain evidence-driven and do not execute shell commands.</p>
          </div>
          <button type="button" onClick={() => void loadLabs()} className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#111114] px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-white/60 hover:text-white"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh persisted state</button>
        </div>

        {error && <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-200"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}

        {loading && !state ? <div className="rounded-2xl border border-white/10 bg-[#111114] p-10 text-center font-mono text-xs uppercase tracking-wider text-white/35">Loading Linux Lab state…</div> : null}

        {!loading && labs.length === 0 && !error ? <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center font-mono text-xs text-white/35">No READY Linux Labs belong to a published project.</div> : null}

        {state && (
          <>
            <ScenarioControlPanel labSlug={state.lab.slug} onStateChange={loadLabs} />
            <div className="mb-5 grid gap-3 rounded-2xl border border-white/10 bg-[#111114] p-4 lg:grid-cols-[1.4fr_1fr_1fr]">
              <label className="block">
                <span className="mb-1 block font-mono text-[9px] uppercase tracking-wider text-white/35">Linux Lab</span>
                <select value={activeLabSlug} onChange={(event) => setActiveLabSlug(event.target.value)} className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 font-mono text-xs text-white">
                  {labs.map((lab) => <option key={lab.id} value={lab.slug}>{lab.title} · {lab.hostCount} host{lab.hostCount === 1 ? '' : 's'}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block font-mono text-[9px] uppercase tracking-wider text-white/35">Host</span>
                <select value={activeHost?.key ?? ''} onChange={(event) => setSelectedHostKey(event.target.value)} className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 font-mono text-xs text-white">
                  {state.hosts.map((host) => <option key={host.key} value={host.key}>{host.hostname}</option>)}
                </select>
              </label>
              <div>
                <span className="mb-1 block font-mono text-[9px] uppercase tracking-wider text-white/35">Data provenance</span>
                <div className="rounded-lg border border-white/10 bg-black px-3 py-2 font-mono text-[10px] text-white/55">{state.provenance.sourceType.replaceAll('_', ' ')} · {state.inputs.length} input{state.inputs.length === 1 ? '' : 's'}</div>
              </div>
            </div>

            {activeHost && (
              <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                <div className="rounded-xl border border-white/10 bg-[#111114] p-3"><div className="text-[9px] uppercase tracking-wider text-white/35">Host</div><div className="mt-1 truncate font-mono text-xs font-bold text-white">{activeHost.hostname}</div></div>
                <div className="rounded-xl border border-white/10 bg-[#111114] p-3"><div className="text-[9px] uppercase tracking-wider text-white/35">OS</div><div className="mt-1 font-mono text-xs font-bold text-[#00ff41]">{activeHost.osVersion ?? activeHost.osName ?? 'not recorded'}</div></div>
                <div className="rounded-xl border border-white/10 bg-[#111114] p-3"><div className="text-[9px] uppercase tracking-wider text-white/35">Kernel</div><div className="mt-1 truncate font-mono text-[10px] text-white/70">{activeHost.kernelVersion ?? 'not recorded'}</div></div>
                <div className="rounded-xl border border-white/10 bg-[#111114] p-3"><div className="text-[9px] uppercase tracking-wider text-white/35">SELinux</div><div className="mt-1 font-mono text-xs font-bold text-[#00ff41]">{activeHost.selinux.mode}</div></div>
                <div className="rounded-xl border border-white/10 bg-[#111114] p-3"><div className="text-[9px] uppercase tracking-wider text-white/35">Boot target</div><div className="mt-1 truncate font-mono text-[10px] text-white/70">{activeHost.bootTarget ?? 'not recorded'}</div></div>
                <div className="rounded-xl border border-white/10 bg-[#111114] p-3"><div className="text-[9px] uppercase tracking-wider text-white/35">Host state</div><span className={`mt-1 inline-block rounded border px-2 py-1 font-mono text-[9px] font-bold ${statusTone(activeHost.status)}`}>{activeHost.status}</span></div>
              </div>
            )}

            <div className="mb-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-[#111114] p-4"><div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[#00d4ff]"><Database className="h-3.5 w-3.5" /> Canonical inputs</div><div className="mt-3 flex flex-wrap gap-2">{state.inputs.map((input) => <span key={input.id} className="rounded border border-white/10 bg-black px-2 py-1 font-mono text-[9px] text-white/55">{input.inputType}</span>)}</div></div>
              <div className="rounded-xl border border-white/10 bg-[#111114] p-4"><div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[#00d4ff]"><BookOpen className="h-3.5 w-3.5" /> Runbook</div><div className="mt-3 text-xs text-white/50">{state.runbook.length} persisted step{state.runbook.length === 1 ? '' : 's'} available for this Lab.</div></div>
              <div className="rounded-xl border border-white/10 bg-[#111114] p-4"><div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[#00d4ff]"><ShieldCheck className="h-3.5 w-3.5" /> Capability contract</div><div className="mt-3 flex flex-wrap gap-2">{state.lab.capabilities.map((capability) => <span key={capability} className="rounded border border-[#00ff41]/15 bg-[#00ff41]/5 px-2 py-1 font-mono text-[9px] text-[#00ff41]/70">{capability}</span>)}</div></div>
            </div>

            {activeHost ? (
              <>
                <div className="mb-4 flex gap-1 rounded-xl border border-white/10 bg-[#111114] p-1.5">
                  <button type="button" onClick={() => setActiveView('inspect')} className={`flex items-center gap-2 rounded-lg px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider transition ${activeView === 'inspect' ? 'bg-[#00ff41]/10 text-[#00ff41]' : 'text-white/45 hover:bg-white/5 hover:text-white'}`}><Server className="h-3.5 w-3.5" /> Host Inspector</button>
                  <button type="button" onClick={() => setActiveView('operations')} className={`flex items-center gap-2 rounded-lg px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider transition ${activeView === 'operations' ? 'bg-[#00d4ff]/10 text-[#00d4ff]' : 'text-white/45 hover:bg-white/5 hover:text-white'}`}><Activity className="h-3.5 w-3.5" /> Operations</button>
                </div>
                {activeView === 'inspect' ? <LinuxHostInspector host={activeHost} /> : <LinuxOperationsPanel labSlug={state.lab.slug} hostKey={activeHost.key} />}
              </>
            ) : <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-xs text-white/35"><Server className="mx-auto mb-2 h-5 w-5" />This Lab has no normalized host records.</div>}

            {state.warnings.length > 0 && <div className="mt-4 space-y-2">{state.warnings.map((warning) => <div key={warning} className="flex items-start gap-2 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-amber-100/70"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />{warning}</div>)}</div>}

            <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4 text-xs text-white/40"><HardDrive className="mr-2 inline h-3.5 w-3.5 text-[#00ff41]" />Diagnostics are derived from persisted recorded state. The Unified CLI reads the same state, while the Scenario Runtime can apply session-scoped simulation overlays. Suggested host commands remain guidance only and are not executed.</div>
          </>
        )}
      </div>
    </section>
  );
};
