import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  GitBranch,
  Network,
  Route,
  Search,
  ShieldAlert,
  TerminalSquare,
} from 'lucide-react';

import { api } from '../../lib/api.js';
import type {
  NetworkingLabState,
  NetworkingOperationalPathAnalysis,
  NetworkingOperationsSnapshot,
  NetworkingOperatorContext,
  NetworkingRouteLookup,
} from '../../types.js';

interface NetworkOperationsPanelProps {
  state: NetworkingLabState;
  selectedDeviceKey: string | null;
}

function healthClass(value: string): string {
  if (value === 'CRITICAL' || value === 'FAIL' || value === 'DOWN') return 'border-red-500/30 bg-red-500/10 text-red-200';
  if (value === 'DEGRADED' || value === 'WARN') return 'border-amber-400/30 bg-amber-400/10 text-amber-200';
  if (value === 'HEALTHY' || value === 'PASS' || value === 'UP') return 'border-[#00ff41]/30 bg-[#00ff41]/10 text-[#00ff41]';
  return 'border-white/10 bg-white/5 text-white/55';
}

function sourceTargetDefaults(state: NetworkingLabState): [string, string] {
  const source = state.devices.find((device) => ['workstation', 'endpoint'].includes(device.kind)) ?? state.devices[0];
  const target = state.devices.find((device) => device.kind === 'isp') ?? state.devices.find((device) => device.kind === 'server') ?? state.devices.at(-1);
  return [source?.key ?? '', target?.key ?? ''];
}

export const NetworkOperationsPanel: React.FC<NetworkOperationsPanelProps> = ({ state, selectedDeviceKey }) => {
  const [operations, setOperations] = useState<NetworkingOperationsSnapshot | null>(null);
  const [context, setContext] = useState<NetworkingOperatorContext | null>(null);
  const [routeDestination, setRouteDestination] = useState('198.51.100.1');
  const [routeDeviceKey, setRouteDeviceKey] = useState(selectedDeviceKey ?? '');
  const [routeLookup, setRouteLookup] = useState<NetworkingRouteLookup | null>(null);
  const defaults = useMemo(() => sourceTargetDefaults(state), [state]);
  const [sourceKey, setSourceKey] = useState(defaults[0]);
  const [targetKey, setTargetKey] = useState(defaults[1]);
  const [protocol, setProtocol] = useState('ICMP');
  const [pathAnalysis, setPathAnalysis] = useState<NetworkingOperationalPathAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    const [source, target] = sourceTargetDefaults(state);
    setSourceKey(source);
    setTargetKey(target);
    setRouteDeviceKey(selectedDeviceKey ?? '');
    setRouteLookup(null);
    setPathAnalysis(null);
  }, [state.lab.slug]);

  useEffect(() => {
    setRouteDeviceKey(selectedDeviceKey ?? '');
  }, [selectedDeviceKey]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      api.getNetworkingOperations(state.lab.slug),
      api.getNetworkingContext(state.lab.slug, selectedDeviceKey ?? undefined),
    ])
      .then(([nextOperations, nextContext]) => {
        if (cancelled) return;
        setOperations(nextOperations);
        setContext(nextContext);
      })
      .catch((cause) => {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : 'Networking operations could not be loaded.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [state.lab.slug, selectedDeviceKey]);

  const runRouteLookup = async () => {
    if (!routeDestination.trim()) return;
    setWorking(true);
    setError(null);
    try {
      setRouteLookup(await api.lookupNetworkingRoute(state.lab.slug, routeDestination.trim(), routeDeviceKey || undefined));
    } catch (cause) {
      setRouteLookup(null);
      setError(cause instanceof Error ? cause.message : 'Route lookup failed.');
    } finally {
      setWorking(false);
    }
  };

  const analyzePath = async () => {
    if (!sourceKey || !targetKey) return;
    setWorking(true);
    setError(null);
    try {
      setPathAnalysis(await api.analyzeNetworkingPath(state.lab.slug, sourceKey, targetKey, protocol));
    } catch (cause) {
      setPathAnalysis(null);
      setError(cause instanceof Error ? cause.message : 'Operational path analysis failed.');
    } finally {
      setWorking(false);
    }
  };

  if (loading && !operations) {
    return <div className="rounded-xl border border-white/10 bg-[#111114] p-10 text-center font-mono text-xs uppercase tracking-[0.18em] text-[#00d4ff]">Loading recorded operational state...</div>;
  }

  if (!operations) {
    return <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error ?? 'No operational snapshot is available.'}</div>;
  }

  return (
    <div className="space-y-4">
      {error && <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200"><AlertTriangle className="h-4 w-4" />{error}</div>}

      <div className="grid gap-3 md:grid-cols-4">
        <div className={`rounded-xl border p-4 ${healthClass(operations.overallStatus)}`}>
          <div className="font-mono text-[9px] uppercase tracking-[0.18em] opacity-60">Recorded Health</div>
          <div className="mt-2 font-mono text-lg font-bold">{operations.overallStatus}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#111114] p-4"><div className="font-mono text-[9px] uppercase text-white/35">BGP Sessions</div><div className="mt-2 font-mono text-lg text-white">{operations.counts.bgpNeighbors}</div></div>
        <div className="rounded-xl border border-white/10 bg-[#111114] p-4"><div className="font-mono text-[9px] uppercase text-white/35">OSPF Adjacencies</div><div className="mt-2 font-mono text-lg text-white">{operations.counts.ospfNeighbors}</div></div>
        <div className="rounded-xl border border-white/10 bg-[#111114] p-4"><div className="font-mono text-[9px] uppercase text-white/35">Gateway Groups</div><div className="mt-2 font-mono text-lg text-white">{operations.counts.gatewayGroups}</div></div>
      </div>

      {context && (
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-[#00d4ff]/20 bg-[#00d4ff]/5 p-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider text-[#00d4ff]"><TerminalSquare className="h-4 w-4" /> Operator Context</div>
            <div className="mt-2 font-mono text-sm text-white">{context.prompt}</div>
            <p className="mt-1 text-xs text-white/45">Inspection contract only. This panel does not execute arbitrary device commands.</p>
          </div>
          <div className="flex max-w-xl flex-wrap gap-1.5">{context.availableInspectors.map((item) => <span key={item} className="rounded border border-white/10 bg-black/30 px-2 py-1 font-mono text-[8px] uppercase text-white/55">{item}</span>)}</div>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-white/10 bg-[#111114] p-4">
          <div className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider text-white/65"><GitBranch className="h-4 w-4 text-[#00d4ff]" /> Control Plane Neighbors</div>
          <div className="space-y-2">
            {operations.bgpNeighbors.map((neighbor) => (
              <div key={neighbor.id} className="rounded-lg border border-white/10 bg-black/35 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-mono text-xs font-bold text-white">BGP // {neighbor.deviceKey} → {neighbor.peerAddress}</span><span className={`rounded border px-2 py-1 font-mono text-[8px] ${healthClass(neighbor.health)}`}>{neighbor.state}</span></div>
                <div className="mt-2 font-mono text-[9px] text-white/40">{neighbor.sessionType} · AS {neighbor.localAs ?? '?'} → {neighbor.remoteAs ?? '?'}{neighbor.prefixesReceived !== null ? ` · PfxRcd ${neighbor.prefixesReceived}` : ''} · {neighbor.source.replaceAll('_', ' ')}</div>
              </div>
            ))}
            {operations.ospfNeighbors.map((neighbor) => (
              <div key={neighbor.id} className="rounded-lg border border-white/10 bg-black/35 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-mono text-xs font-bold text-white">OSPF // {neighbor.deviceKey} → {neighbor.neighborId}</span><span className={`rounded border px-2 py-1 font-mono text-[8px] ${healthClass(neighbor.health)}`}>{neighbor.state}</span></div>
                <div className="mt-2 font-mono text-[9px] text-white/40">Area {neighbor.area} · {neighbor.interface}{neighbor.role ? ` · ${neighbor.role}` : ''} · {neighbor.source.replaceAll('_', ' ')}</div>
              </div>
            ))}
            {operations.bgpNeighbors.length === 0 && operations.ospfNeighbors.length === 0 && <p className="py-6 text-center font-mono text-xs text-white/30">No normalized neighbor snapshot is attached.</p>}
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-[#111114] p-4">
          <div className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider text-white/65"><Network className="h-4 w-4 text-violet-300" /> First-Hop Redundancy</div>
          <div className="space-y-2">
            {operations.gatewayRedundancy.map((group) => (
              <div key={group.id} className="rounded-lg border border-white/10 bg-black/35 p-3">
                <div className="flex items-center justify-between gap-2"><span className="font-mono text-xs font-bold text-white">{group.protocol} GROUP {group.group ?? '?'}</span><span className={`rounded border px-2 py-1 font-mono text-[8px] ${healthClass(group.health)}`}>{group.health}</span></div>
                <div className="mt-1 font-mono text-[9px] text-white/35">Virtual IP // {group.virtualIp ?? 'not recorded'}</div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">{group.members.map((member) => <div key={`${group.id}-${member.deviceKey}`} className="rounded border border-white/10 p-2"><div className="font-mono text-[10px] text-white">{member.deviceKey}</div><div className="mt-1 font-mono text-[8px] uppercase text-white/40">{member.role} · priority {member.priority ?? '?'}{member.preempt === true ? ' · preempt' : ''}</div></div>)}</div>
              </div>
            ))}
            {operations.gatewayRedundancy.length === 0 && <p className="py-6 text-center font-mono text-xs text-white/30">No normalized first-hop redundancy group is attached.</p>}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-white/10 bg-[#111114] p-4">
        <div className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider text-white/65"><Activity className="h-4 w-4 text-[#00ff41]" /> Operational Health Checks</div>
        <div className="grid gap-2 md:grid-cols-2">{operations.healthChecks.map((check) => (
          <div key={check.id} className={`rounded-lg border p-3 ${healthClass(check.status)}`}>
            <div className="flex items-center justify-between gap-2"><span className="font-mono text-[10px] font-bold uppercase">{check.category} // {check.title}</span><span className="font-mono text-[8px]">{check.status}</span></div>
            <p className="mt-2 text-xs leading-relaxed opacity-70">{check.summary}</p>
          </div>
        ))}</div>
        <p className="mt-3 text-[10px] text-white/30">{operations.note}</p>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-white/10 bg-[#111114] p-4">
          <div className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider text-white/65"><Search className="h-4 w-4 text-[#00d4ff]" /> Recorded Route Lookup</div>
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input value={routeDestination} onChange={(event) => setRouteDestination(event.target.value)} placeholder="IPv4 destination" className="rounded-lg border border-white/10 bg-black px-3 py-2 font-mono text-xs text-white" />
            <select value={routeDeviceKey} onChange={(event) => setRouteDeviceKey(event.target.value)} className="rounded-lg border border-white/10 bg-black px-3 py-2 font-mono text-xs text-white"><option value="">Any recorded table</option>{state.devices.filter((device) => device.kind === 'router' || device.kind === 'multilayer_switch').map((device) => <option key={device.key} value={device.key}>{device.label}</option>)}</select>
            <button type="button" disabled={working} onClick={() => void runRouteLookup()} className="rounded-lg border border-[#00d4ff]/30 bg-[#00d4ff]/10 px-4 py-2 font-mono text-[9px] font-bold uppercase text-[#00d4ff]">Lookup</button>
          </div>
          {routeLookup && <div className="mt-3 rounded-lg border border-white/10 bg-black/35 p-3"><div className="font-mono text-xs text-white">{routeLookup.status === 'MATCH_FOUND' ? `${routeLookup.matchedRoute?.network} → ${routeLookup.matchedRoute?.nextHop}` : 'No matching recorded prefix'}</div>{routeLookup.matchedRoute && <div className="mt-1 font-mono text-[9px] text-white/40">{routeLookup.matchedRoute.protocolName} · {routeLookup.matchedRoute.interface} · /{routeLookup.prefixLength}</div>}<p className="mt-2 text-[10px] text-white/30">{routeLookup.note}</p></div>}
        </section>

        <section className="rounded-xl border border-white/10 bg-[#111114] p-4">
          <div className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider text-white/65"><Route className="h-4 w-4 text-[#00ff41]" /> Recorded-State Path Analysis</div>
          <div className="grid gap-2 sm:grid-cols-2">
            <select value={sourceKey} onChange={(event) => setSourceKey(event.target.value)} className="rounded-lg border border-white/10 bg-black px-3 py-2 font-mono text-xs text-white">{state.devices.map((device) => <option key={device.key} value={device.key}>{device.label}</option>)}</select>
            <select value={targetKey} onChange={(event) => setTargetKey(event.target.value)} className="rounded-lg border border-white/10 bg-black px-3 py-2 font-mono text-xs text-white">{state.devices.map((device) => <option key={device.key} value={device.key}>{device.label}</option>)}</select>
            <select value={protocol} onChange={(event) => setProtocol(event.target.value)} className="rounded-lg border border-white/10 bg-black px-3 py-2 font-mono text-xs text-white"><option>ICMP</option><option>TCP/443</option><option>SSH</option><option>UDP</option></select>
            <button type="button" disabled={working} onClick={() => void analyzePath()} className="rounded-lg border border-[#00ff41]/30 bg-[#00ff41]/10 px-4 py-2 font-mono text-[9px] font-bold uppercase text-[#00ff41]">Analyze</button>
          </div>
          {pathAnalysis && <div className="mt-3 rounded-lg border border-white/10 bg-black/35 p-3"><div className="flex items-center justify-between gap-2"><span className="font-mono text-xs text-white">{pathAnalysis.hops.join(' → ') || 'No operational path'}</span><span className={`rounded border px-2 py-1 font-mono text-[8px] ${healthClass(pathAnalysis.status === 'FORWARDABLE' ? 'PASS' : pathAnalysis.status === 'INDETERMINATE' ? 'WARN' : 'FAIL')}`}>{pathAnalysis.status}</span></div>{pathAnalysis.blockers.map((blocker) => <div key={`${blocker.type}-${blocker.key}`} className="mt-2 flex items-start gap-2 text-xs text-amber-200/70"><ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />{blocker.message}</div>)}<div className="mt-2 rounded border border-white/10 px-2 py-1.5 font-mono text-[9px] text-white/45">ACL assessment // {pathAnalysis.aclAssessment.status}{pathAnalysis.aclAssessment.ruleId ? ` · ${pathAnalysis.aclAssessment.ruleId}` : ''} — {pathAnalysis.aclAssessment.reason}</div><p className="mt-2 text-[10px] text-white/30">Structured ACL records are evaluated only when their attachment, addresses, direction, and protocol can be matched deterministically. This is not full IOS/ASA policy emulation. {pathAnalysis.note}</p></div>}
        </section>
      </div>

      <section className="rounded-xl border border-white/10 bg-[#111114] p-4">
        <div className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider text-white/65"><AlertTriangle className="h-4 w-4 text-amber-300" /> Scenario-Ready Definitions</div>
        <div className="grid gap-2 md:grid-cols-2">{operations.scenarioReadiness.map((scenario) => (
          <div key={scenario.id} className="rounded-lg border border-white/10 bg-black/35 p-3"><div className="flex items-center justify-between gap-2"><span className="font-mono text-xs font-bold text-white">{scenario.title}</span><span className="rounded border border-amber-400/20 bg-amber-400/5 px-2 py-1 font-mono text-[8px] uppercase text-amber-300">definition only</span></div><p className="mt-2 text-xs text-white/50">{scenario.summary}</p>{scenario.observableSignals.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{scenario.observableSignals.map((signal) => <span key={signal} className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-[8px] text-white/35">{signal}</span>)}</div>}</div>
        ))}</div>
        {operations.scenarioReadiness.length === 0 && <p className="py-6 text-center font-mono text-xs text-white/30">No enabled scenario definitions are published for this lab.</p>}
        <div className="mt-3 flex items-start gap-2 rounded border border-amber-400/15 bg-amber-400/5 p-3 text-xs text-amber-100/60"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />These contracts make the Networking state scenario-ready. Mutation, remediation and reset execution remain owned by the generic Scenario Engine phase.</div>
      </section>
    </div>
  );
};
