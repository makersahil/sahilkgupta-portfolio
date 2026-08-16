import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  FileCode2,
  Layers3,
  Network,
  RefreshCw,
  Route,
  Send,
  ShieldCheck,
  TableProperties,
  X,
} from 'lucide-react';

import { api } from '../../lib/api.js';
import { ScenarioControlPanel } from '../scenarios/index.js';
import type {
  NetworkingDeviceState,
  NetworkingLabState,
  NetworkingLabSummary,
  NetworkingPathTrace,
} from '../../types.js';
import { NetworkDeviceInspector } from './NetworkDeviceInspector.js';
import { NetworkOperationsPanel } from './NetworkOperationsPanel.js';
import { NetworkTopologyCanvas } from './NetworkTopologyCanvas.js';

type ViewTab = 'topology' | 'operations' | 'routing' | 'vlans' | 'security' | 'verification';

const sleep = (duration: number) => new Promise((resolve) => window.setTimeout(resolve, duration));

function statusClass(status: string): string {
  if (status === 'DOWN') return 'text-red-300 border-red-500/30 bg-red-500/10';
  if (status === 'DEGRADED') return 'text-amber-300 border-amber-400/30 bg-amber-400/10';
  if (status === 'STANDBY') return 'text-violet-300 border-violet-400/30 bg-violet-400/10';
  return 'text-[#00ff41] border-[#00ff41]/30 bg-[#00ff41]/10';
}

function defaultEndpoints(state: NetworkingLabState): [string, string] {
  const source = state.devices.find((device) => device.kind === 'workstation' || device.kind === 'endpoint') ?? state.devices[0];
  const target = state.devices.find((device) => device.kind === 'server') ?? state.devices.at(-1);
  return [source?.key ?? '', target?.key ?? ''];
}

export const NetworkingLabExplorer: React.FC = () => {
  const [labs, setLabs] = useState<NetworkingLabSummary[]>([]);
  const [activeLabSlug, setActiveLabSlug] = useState('');
  const [state, setState] = useState<NetworkingLabState | null>(null);
  const [selectedDeviceKey, setSelectedDeviceKey] = useState<string | null>(null);
  const [sourceDeviceKey, setSourceDeviceKey] = useState('');
  const [targetDeviceKey, setTargetDeviceKey] = useState('');
  const [protocol, setProtocol] = useState('ICMP');
  const [trace, setTrace] = useState<NetworkingPathTrace | null>(null);
  const [activeHopIndex, setActiveHopIndex] = useState(-1);
  const [activeTab, setActiveTab] = useState<ViewTab>('topology');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tracing, setTracing] = useState(false);
  const [modal, setModal] = useState<'runbook' | 'specs' | null>(null);

  const loadLab = async (slug: string) => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    setTrace(null);
    setActiveHopIndex(-1);
    try {
      const next = await api.getNetworkingLab(slug);
      setState(next);
      const [source, target] = defaultEndpoints(next);
      setSourceDeviceKey(source);
      setTargetDeviceKey(target);
      setSelectedDeviceKey(next.devices.find((device) => device.kind === 'router')?.key ?? next.devices[0]?.key ?? null);
    } catch (cause) {
      setState(null);
      setError(cause instanceof Error ? cause.message : 'Networking lab could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.getNetworkingLabs()
      .then((items) => {
        if (cancelled) return;
        setLabs(items);
        const first = items[0]?.slug ?? '';
        setActiveLabSlug(first);
        if (!first) setLoading(false);
      })
      .catch((cause) => {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : 'Networking labs could not be loaded.');
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (activeLabSlug) void loadLab(activeLabSlug);
  }, [activeLabSlug]);

  const selectedDevice = useMemo(
    () => state?.devices.find((device) => device.key === selectedDeviceKey) ?? null,
    [state, selectedDeviceKey],
  );

  const activeHopKeys = trace && activeHopIndex >= 0 ? trace.hops.slice(0, activeHopIndex + 1) : [];
  const activeLinkKeys = trace && activeHopIndex > 0 ? trace.linkKeys.slice(0, activeHopIndex) : [];

  const runTrace = async () => {
    if (!state || !sourceDeviceKey || !targetDeviceKey) return;
    setTracing(true);
    setError(null);
    setTrace(null);
    setActiveHopIndex(-1);
    try {
      const result = await api.traceNetworkingPath(state.lab.slug, sourceDeviceKey, targetDeviceKey, protocol);
      setTrace(result);
      for (let index = 0; index < result.hops.length; index += 1) {
        await sleep(420);
        setActiveHopIndex(index);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No topology path could be calculated.');
    } finally {
      setTracing(false);
    }
  };

  const selectDevice = (device: NetworkingDeviceState) => {
    setSelectedDeviceKey(device.key);
    setActiveTab('topology');
  };

  const tabs: Array<{ id: ViewTab; label: string; icon: React.ReactNode; count?: number }> = [
    { id: 'topology', label: 'Topology', icon: <Network className="h-3.5 w-3.5" />, count: state?.devices.length },
    { id: 'operations', label: 'Operations', icon: <Activity className="h-3.5 w-3.5" />, count: state ? state.bgpNeighbors.length + state.ospfNeighbors.length + state.gatewayRedundancy.length : undefined },
    { id: 'routing', label: 'Routing', icon: <Route className="h-3.5 w-3.5" />, count: state?.routingTable.length },
    { id: 'vlans', label: 'VLANs', icon: <Layers3 className="h-3.5 w-3.5" />, count: state?.vlans.length },
    { id: 'security', label: 'ACLs', icon: <ShieldCheck className="h-3.5 w-3.5" />, count: state?.aclRules.length },
    { id: 'verification', label: 'Records', icon: <CheckCircle2 className="h-3.5 w-3.5" />, count: state?.verificationRecords.length },
  ];

  return (
    <section id="network-topology-section" className="border-b border-white/10 bg-[#0a0a0c] py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-7 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <div className="mb-2 inline-flex items-center gap-2 rounded border border-[#00d4ff]/25 bg-[#00d4ff]/5 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#00d4ff]">
              <Network className="h-3.5 w-3.5" /> Dynamic Networking Lab Engine
            </div>
            <h2 className="font-mono text-2xl font-bold uppercase tracking-tight text-white sm:text-3xl">
              {state?.lab.title ?? 'Network Control Plane'}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/65">
              {state?.overview ?? state?.lab.summary ?? 'Select a published Networking lab to inspect its persisted topology, devices, interfaces, routing, VLANs, ACLs, and recorded evidence.'}
            </p>
            {state?.project && (
              <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-white/35">
                Project // {state.project.title}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#111114] px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-white/50">
              Lab
              <select
                value={activeLabSlug}
                onChange={(event) => setActiveLabSlug(event.target.value)}
                className="max-w-64 bg-transparent text-xs font-bold text-white outline-none"
              >
                {labs.map((lab) => <option key={lab.id} value={lab.slug} className="bg-[#111114]">{lab.title}</option>)}
              </select>
            </label>
            <button type="button" onClick={() => activeLabSlug && void loadLab(activeLabSlug)} className="rounded-lg border border-white/10 bg-[#111114] p-2.5 text-white/60 hover:text-white" title="Reload lab state">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button type="button" onClick={() => setModal('runbook')} disabled={!state} className="flex items-center gap-2 rounded-lg border border-[#00d4ff]/35 bg-[#00d4ff]/5 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-[#00d4ff] disabled:opacity-40">
              <BookOpen className="h-3.5 w-3.5" /> Runbook
            </button>
            <button type="button" onClick={() => setModal('specs')} disabled={!state} className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#111114] px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-white/70 disabled:opacity-40">
              <FileCode2 className="h-3.5 w-3.5 text-[#00ff41]" /> Lab Inputs
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-5 flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 font-mono text-xs text-red-200">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {loading && !state ? (
          <div className="flex min-h-80 items-center justify-center rounded-xl border border-white/10 bg-black/50 font-mono text-xs uppercase tracking-[0.2em] text-[#00d4ff]">
            Loading persisted Networking lab state...
          </div>
        ) : labs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/15 bg-black/40 p-12 text-center">
            <Network className="mx-auto h-10 w-10 text-white/25" />
            <h3 className="mt-4 font-mono text-sm font-bold uppercase text-white">No published Networking Labs</h3>
            <p className="mt-2 text-sm text-white/50">Create and publish a NETWORK_TOPOLOGY lab through the Admin Lab Builder.</p>
          </div>
        ) : state ? (
          <>
            <ScenarioControlPanel labSlug={state.lab.slug} onStateChange={() => loadLab(state.lab.slug)} />
            <div className="mb-5 flex flex-wrap gap-2">
              {state.lab.capabilities.map((capability) => (
                <span key={capability} className="rounded border border-white/10 bg-white/5 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-white/55">
                  {capability.replaceAll('-', ' ')}
                </span>
              ))}
            </div>

            <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-[#111114] p-1.5">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider transition ${
                    activeTab === tab.id ? 'bg-[#00d4ff]/10 text-[#00d4ff]' : 'text-white/45 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {tab.icon} {tab.label}
                  {tab.count !== undefined && <span className="rounded bg-black/50 px-1.5 py-0.5 text-[8px]">{tab.count}</span>}
                </button>
              ))}
            </div>

            {activeTab === 'topology' && (
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                <NetworkTopologyCanvas
                  devices={state.devices}
                  links={state.links}
                  selectedDeviceKey={selectedDeviceKey}
                  activeHopKeys={activeHopKeys}
                  activeLinkKeys={activeLinkKeys}
                  onSelectDevice={selectDevice}
                />
                <NetworkDeviceInspector device={selectedDevice} />
              </div>
            )}

            {activeTab === 'operations' && (
              <NetworkOperationsPanel state={state} selectedDeviceKey={selectedDeviceKey} />
            )}

            {activeTab === 'routing' && (
              <div className="overflow-hidden rounded-xl border border-white/10 bg-[#111114]">
                <div className="border-b border-white/10 px-5 py-4 font-mono text-xs font-bold uppercase tracking-wider text-white">Recorded Routing State</div>
                <div className="overflow-x-auto">
                  <table className="min-w-full font-mono text-[10px]">
                    <thead className="bg-black/50 text-left uppercase tracking-wider text-white/35">
                      <tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Network</th><th className="px-4 py-3">Next Hop</th><th className="px-4 py-3">Interface</th><th className="px-4 py-3">AD / Metric</th></tr>
                    </thead>
                    <tbody>
                      {state.routingTable.map((route, index) => (
                        <tr key={`${route.network}-${index}`} className="border-t border-white/5 text-white/65">
                          <td className="px-4 py-3 font-bold text-[#00d4ff]">{route.protocol} <span className="text-white/30">{route.protocolName}</span></td>
                          <td className="px-4 py-3 text-white">{route.network}</td>
                          <td className="px-4 py-3">{route.nextHop}</td>
                          <td className="px-4 py-3">{route.interface}</td>
                          <td className="px-4 py-3">{route.administrativeDistance ?? '—'} / {route.metric ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {state.routingTable.length === 0 && <div className="p-8 text-center font-mono text-xs text-white/35">No routing snapshot is attached to this lab.</div>}
                </div>
              </div>
            )}

            {activeTab === 'vlans' && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {state.vlans.map((vlan) => (
                  <div key={vlan.vlanId} className="rounded-xl border border-white/10 bg-[#111114] p-4">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-[#00ff41]">VLAN {vlan.vlanId}</div>
                    <div className="mt-1 font-mono text-sm font-bold text-white">{vlan.name}</div>
                    <div className="mt-3 font-mono text-[10px] text-white/45">Status // {vlan.status}</div>
                    <div className="mt-2 text-xs text-white/55">{vlan.ports.join(', ') || 'Ports not recorded'}</div>
                  </div>
                ))}
                {state.vlans.length === 0 && <div className="col-span-full rounded-xl border border-dashed border-white/10 p-8 text-center font-mono text-xs text-white/35">No VLAN database is attached to this lab.</div>}
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-3">
                {state.aclRules.map((rule) => (
                  <div key={rule.id} className="grid gap-3 rounded-xl border border-white/10 bg-[#111114] p-4 font-mono text-[10px] sm:grid-cols-[120px_1fr_1fr]">
                    <div><span className={`rounded border px-2 py-1 font-bold uppercase ${rule.action === 'deny' ? 'border-red-500/30 bg-red-500/10 text-red-300' : 'border-[#00ff41]/30 bg-[#00ff41]/10 text-[#00ff41]'}`}>{rule.action}</span></div>
                    <div><div className="text-white/35">SOURCE</div><div className="mt-1 text-white">{rule.source}</div></div>
                    <div><div className="text-white/35">DESTINATION / PROTOCOL</div><div className="mt-1 text-white">{rule.destination} · {rule.protocol}</div></div>
                    <div className="sm:col-span-3 text-white/35">{rule.name} · {rule.id}</div>
                  </div>
                ))}
                {state.aclRules.length === 0 && <div className="rounded-xl border border-dashed border-white/10 p-8 text-center font-mono text-xs text-white/35">No ACL snapshot is attached to this lab.</div>}
              </div>
            )}

            {activeTab === 'verification' && (
              <div className="space-y-3">
                {state.verificationRecords.map((record) => (
                  <div key={record.id} className="rounded-xl border border-white/10 bg-[#111114] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-mono text-xs font-bold text-white">{record.title}</div>
                      <span className="rounded border border-amber-400/25 bg-amber-400/5 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-amber-300">{record.source.replaceAll('_', ' ')}</span>
                    </div>
                    {record.command && <code className="mt-3 block rounded bg-black p-2 font-mono text-[10px] text-[#00ff41]">{record.command}</code>}
                    {record.recordedObservation && <p className="mt-3 text-xs leading-relaxed text-white/55">{record.recordedObservation}</p>}
                  </div>
                ))}
                {state.verificationRecords.length === 0 && <div className="rounded-xl border border-dashed border-white/10 p-8 text-center font-mono text-xs text-white/35">No inspection checks or evidence records are attached to this lab.</div>}
              </div>
            )}

            <div className="mt-5 rounded-xl border border-white/10 bg-[#111114] p-5">
              <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#00d4ff]"><Send className="h-3.5 w-3.5" /> Topology Reachability Preview</div>
                  <p className="mt-1 text-xs text-white/45">Uses active persisted links only. Open Operations for recorded-state route, neighbor, gateway, health, and path analysis.</p>
                </div>
                {trace && <span className="font-mono text-[9px] uppercase tracking-wider text-[#00ff41]">{trace.status}</span>}
              </div>
              <div className="grid gap-2 md:grid-cols-[1fr_1fr_160px_auto]">
                <select value={sourceDeviceKey} onChange={(event) => setSourceDeviceKey(event.target.value)} className="rounded-lg border border-white/10 bg-black px-3 py-2 font-mono text-xs text-white">
                  {state.devices.map((device) => <option key={device.key} value={device.key}>{device.label}</option>)}
                </select>
                <select value={targetDeviceKey} onChange={(event) => setTargetDeviceKey(event.target.value)} className="rounded-lg border border-white/10 bg-black px-3 py-2 font-mono text-xs text-white">
                  {state.devices.map((device) => <option key={device.key} value={device.key}>{device.label}</option>)}
                </select>
                <select value={protocol} onChange={(event) => setProtocol(event.target.value)} className="rounded-lg border border-white/10 bg-black px-3 py-2 font-mono text-xs text-white">
                  <option>ICMP</option><option>TCP/443</option><option>SSH</option><option>UDP</option>
                </select>
                <button type="button" onClick={() => void runTrace()} disabled={tracing || state.devices.length === 0} className="flex items-center justify-center gap-2 rounded-lg border border-[#00ff41]/30 bg-[#00ff41]/10 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-[#00ff41] disabled:opacity-40">
                  {tracing ? <Activity className="h-4 w-4 animate-pulse" /> : <Send className="h-4 w-4" />} Trace
                </button>
              </div>
              {trace && (
                <div className="mt-4 rounded-lg border border-white/10 bg-black/50 p-3">
                  <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] text-white/60">
                    {trace.hops.map((hop, index) => <React.Fragment key={hop}><span className={index <= activeHopIndex ? 'text-[#00ff41]' : ''}>{hop}</span>{index < trace.hops.length - 1 && <span className="text-white/25">→</span>}</React.Fragment>)}
                  </div>
                  <p className="mt-2 text-[10px] text-white/35">{trace.note}</p>
                </div>
              )}
            </div>

            {state.warnings.length > 0 && (
              <div className="mt-4 space-y-2">
                {state.warnings.map((warning) => <div key={warning} className="flex items-start gap-2 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-amber-100/70"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />{warning}</div>)}
              </div>
            )}
          </>
        ) : null}
      </div>

      <AnimatePresence>
        {modal && state && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-white/15 bg-[#111114] p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-white">{modal === 'runbook' ? 'Operator Runbook' : 'Lab Inputs & Specifications'}</h3>
                <button type="button" onClick={() => setModal(null)} className="rounded p-1 text-white/40 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
              </div>
              {modal === 'runbook' ? (
                <div className="mt-5 space-y-3">
                  {state.runbook.map((step) => (
                    <div key={step.id} className="rounded-lg border border-white/10 bg-black/40 p-4">
                      <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#00d4ff]">{String(step.order).padStart(2, '0')} // {step.title}</div>
                      {step.description && <p className="mt-2 text-xs leading-relaxed text-white/60">{step.description}</p>}
                      {step.command && <code className="mt-2 block rounded bg-black p-2 font-mono text-[10px] text-[#00ff41]">{step.command}</code>}
                    </div>
                  ))}
                  {state.runbook.length === 0 && <p className="py-8 text-center font-mono text-xs text-white/35">No runbook steps are published for this lab.</p>}
                </div>
              ) : (
                <div className="mt-5 space-y-5">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-white/10 bg-black/40 p-3"><div className="font-mono text-[9px] uppercase text-white/35">Devices</div><div className="mt-1 font-mono text-lg text-white">{state.devices.length}</div></div>
                    <div className="rounded-lg border border-white/10 bg-black/40 p-3"><div className="font-mono text-[9px] uppercase text-white/35">Links</div><div className="mt-1 font-mono text-lg text-white">{state.links.length}</div></div>
                    <div className="rounded-lg border border-white/10 bg-black/40 p-3"><div className="font-mono text-[9px] uppercase text-white/35">Evidence</div><div className="mt-1 font-mono text-lg text-white">{state.evidence.length}</div></div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/40 p-4">
                    <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-white/50">Normalized Networking State</div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div><div className="font-mono text-[9px] uppercase text-white/30">Environment</div><div className="mt-1 text-xs text-white/65">{state.specifications.environment ?? 'Not recorded'}</div></div>
                      <div><div className="font-mono text-[9px] uppercase text-white/30">Protocols</div><div className="mt-1 text-xs text-white/65">{state.specifications.protocols.join(', ') || 'Not recorded'}</div></div>
                    </div>
                    {state.provenance.packetTracerReference && (
                      <div className="mt-3 rounded border border-amber-400/20 bg-amber-400/5 p-3">
                        <div className="font-mono text-[9px] uppercase tracking-wider text-amber-300">Packet Tracer reference metadata</div>
                        <div className="mt-1 font-mono text-xs text-white">{state.provenance.packetTracerReference.fileName}</div>
                        <p className="mt-1 text-xs text-white/40">The engine renders normalized persisted state and does not claim arbitrary .pkt binary parsing.</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wider text-white/50">Standardized Inputs</div>
                    <div className="space-y-2">
                      {state.inputs.map((input) => (
                        <div key={input.id} className="rounded-lg border border-white/10 bg-black/40 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-mono text-xs font-bold text-white">{input.label}</span><span className="font-mono text-[9px] text-[#00d4ff]">{input.inputType}</span></div>
                          <p className="mt-1 text-xs text-white/45">{input.description ?? 'No description provided.'}</p>
                          <div className="mt-2 font-mono text-[9px] uppercase text-white/30">{input.sourceKind} · schema {input.schemaVersion} · {input.hasPayload ? 'normalized payload present' : 'metadata only'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wider text-white/50">Capabilities</div>
                    <div className="flex flex-wrap gap-2">{state.lab.capabilities.map((capability) => <span key={capability} className="rounded border border-[#00d4ff]/20 bg-[#00d4ff]/5 px-2 py-1 font-mono text-[9px] text-[#00d4ff]">{capability}</span>)}</div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};
