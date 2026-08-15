import React, { useMemo, useState } from 'react';
import {
  Activity,
  FileCode2,
  HardDrive,
  Network,
  ScrollText,
  ServerCog,
  ShieldCheck,
  TableProperties,
} from 'lucide-react';

import type { LinuxHostState } from '../../types.js';

type LinuxInspectorTab = 'services' | 'storage' | 'selinux' | 'network' | 'logs' | 'configs' | 'verification';

const tabs: Array<{ id: LinuxInspectorTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'services', label: 'Services', icon: ServerCog },
  { id: 'storage', label: 'Storage', icon: HardDrive },
  { id: 'selinux', label: 'SELinux', icon: ShieldCheck },
  { id: 'network', label: 'Network', icon: Network },
  { id: 'logs', label: 'Logs', icon: ScrollText },
  { id: 'configs', label: 'Configs', icon: FileCode2 },
  { id: 'verification', label: 'Checks', icon: TableProperties },
];

function empty(message: string) {
  return <div className="rounded-xl border border-dashed border-white/10 p-8 text-center font-mono text-xs text-white/35">{message}</div>;
}

function serviceTone(state: string): string {
  if (state === 'ACTIVE') return 'border-[#00ff41]/30 bg-[#00ff41]/10 text-[#00ff41]';
  if (state === 'FAILED') return 'border-red-500/30 bg-red-500/10 text-red-300';
  if (state === 'INACTIVE') return 'border-amber-400/30 bg-amber-400/10 text-amber-300';
  return 'border-white/15 bg-white/5 text-white/50';
}

export const LinuxHostInspector: React.FC<{ host: LinuxHostState }> = ({ host }) => {
  const [activeTab, setActiveTab] = useState<LinuxInspectorTab>('services');
  const summary = useMemo(() => ({
    services: host.services.length,
    mounts: host.mounts.length,
    configs: host.configurations.length,
    checks: host.verificationRecords.length,
  }), [host]);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0d10] shadow-2xl">
      <div className="border-b border-white/10 p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#00ff41]">Host Inspector // {host.key}</div>
            <h3 className="mt-1 font-mono text-xl font-bold text-white">{host.hostname}</h3>
            <p className="mt-1 text-xs text-white/50">{host.description ?? 'Persisted Linux host state from the canonical Lab manifest.'}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-lg border border-white/10 bg-black/40 px-3 py-2"><div className="text-[9px] uppercase text-white/35">Services</div><div className="font-mono text-sm text-white">{summary.services}</div></div>
            <div className="rounded-lg border border-white/10 bg-black/40 px-3 py-2"><div className="text-[9px] uppercase text-white/35">Mounts</div><div className="font-mono text-sm text-white">{summary.mounts}</div></div>
            <div className="rounded-lg border border-white/10 bg-black/40 px-3 py-2"><div className="text-[9px] uppercase text-white/35">Configs</div><div className="font-mono text-sm text-white">{summary.configs}</div></div>
            <div className="rounded-lg border border-white/10 bg-black/40 px-3 py-2"><div className="text-[9px] uppercase text-white/35">Checks</div><div className="font-mono text-sm text-white">{summary.checks}</div></div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-white/10 p-3">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            type="button"
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider transition ${activeTab === id ? 'border-[#00ff41]/40 bg-[#00ff41]/10 text-[#00ff41]' : 'border-white/10 bg-black/30 text-white/45 hover:text-white'}`}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      <div className="p-5">
        {activeTab === 'services' && (
          <div className="space-y-3">
            {host.services.map((service) => (
              <div key={service.unit} className="rounded-xl border border-white/10 bg-[#111114] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-mono text-sm font-bold text-white">{service.unit}</div>
                    <div className="mt-1 text-xs text-white/45">{service.description ?? 'No description recorded'}</div>
                  </div>
                  <span className={`rounded border px-2 py-1 font-mono text-[9px] font-bold uppercase ${serviceTone(service.activeState)}`}>{service.activeState}</span>
                </div>
                <div className="mt-3 grid gap-2 text-[10px] text-white/50 sm:grid-cols-4">
                  <div>Enabled: <span className="text-white">{service.enabled === null ? 'not recorded' : service.enabled ? 'yes' : 'no'}</span></div>
                  <div>Substate: <span className="text-white">{service.subState ?? '—'}</span></div>
                  <div>Restart: <span className="text-white">{service.restartPolicy ?? '—'}</span></div>
                  <div>User: <span className="text-white">{service.user ?? '—'}</span></div>
                </div>
                {service.configurationSnippet && <pre className="mt-3 max-h-64 overflow-auto rounded-lg border border-white/10 bg-black p-3 font-mono text-[10px] leading-relaxed text-[#00ff41]">{service.configurationSnippet}</pre>}
              </div>
            ))}
            {host.services.length === 0 && empty('No normalized systemd service snapshot is attached to this host.')}
          </div>
        )}

        {activeTab === 'storage' && (
          <div className="space-y-5">
            <div>
              <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wider text-[#00d4ff]">Block devices</div>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {host.blockDevices.map((device) => (
                  <div key={`${device.parent ?? 'root'}:${device.name}`} className="rounded-xl border border-white/10 bg-[#111114] p-4">
                    <div className="font-mono text-sm font-bold text-white">{device.name}</div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-white/45"><span>Type <b className="text-white">{device.type}</b></span><span>Size <b className="text-white">{device.size ?? '—'}</b></span><span>FS <b className="text-white">{device.filesystem ?? '—'}</b></span><span>Mount <b className="text-white">{device.mountPoint ?? '—'}</b></span></div>
                  </div>
                ))}
              </div>
              {host.blockDevices.length === 0 && empty('No block-device snapshot is attached.')}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wider text-[#00d4ff]">LVM</div>
                <div className="space-y-2">
                  {host.logicalVolumes.map((lv) => <div key={`${lv.volumeGroup}/${lv.name}`} className="rounded-lg border border-white/10 bg-black/30 p-3 text-xs text-white/55"><span className="font-mono font-bold text-white">{lv.volumeGroup}/{lv.name}</span><span className="ml-2">{lv.size ?? 'size not recorded'} · {lv.filesystem ?? 'fs not recorded'} · {lv.mountPoint ?? 'unmounted'}</span></div>)}
                  {host.logicalVolumes.length === 0 && <div className="text-xs text-white/35">No normalized logical volumes recorded.</div>}
                </div>
              </div>
              <div>
                <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wider text-[#00d4ff]">/etc/fstab</div>
                <div className="space-y-2">
                  {host.fstab.map((entry, index) => <div key={`${entry.source}-${entry.target}-${index}`} className="rounded-lg border border-white/10 bg-black/30 p-3 font-mono text-[10px] text-white/60"><span className="text-white">{entry.source}</span> → <span className="text-[#00ff41]">{entry.target}</span><div className="mt-1 text-white/35">{entry.filesystem} · {entry.options.join(', ') || 'defaults'}</div></div>)}
                  {host.fstab.length === 0 && <div className="text-xs text-white/35">No normalized fstab entries recorded.</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'selinux' && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-[#111114] p-4"><div className="text-[9px] uppercase text-white/35">Status</div><div className="mt-1 font-mono font-bold text-white">{host.selinux.status}</div></div>
              <div className="rounded-xl border border-white/10 bg-[#111114] p-4"><div className="text-[9px] uppercase text-white/35">Current mode</div><div className="mt-1 font-mono font-bold text-[#00ff41]">{host.selinux.mode}</div></div>
              <div className="rounded-xl border border-white/10 bg-[#111114] p-4"><div className="text-[9px] uppercase text-white/35">Policy</div><div className="mt-1 font-mono font-bold text-white">{host.selinux.policy ?? 'not recorded'}</div></div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-[#111114] p-4"><div className="mb-3 font-mono text-[10px] uppercase tracking-wider text-[#00d4ff]">Booleans</div>{host.selinux.booleans.map((item) => <div key={item.name} className="flex justify-between border-t border-white/5 py-2 font-mono text-[10px]"><span className="text-white/60">{item.name}</span><span className={item.enabled ? 'text-[#00ff41]' : 'text-amber-300'}>{item.enabled ? 'on' : 'off'}</span></div>)}{host.selinux.booleans.length === 0 && <div className="text-xs text-white/35">No SELinux boolean snapshot recorded.</div>}</div>
              <div className="rounded-xl border border-white/10 bg-[#111114] p-4"><div className="mb-3 font-mono text-[10px] uppercase tracking-wider text-[#00d4ff]">Contexts</div>{host.selinux.contexts.map((item) => <div key={`${item.path}:${item.context}`} className="border-t border-white/5 py-2 font-mono text-[10px]"><div className="text-white">{item.path}</div><div className="mt-1 text-white/40">{item.context}</div></div>)}{host.selinux.contexts.length === 0 && <div className="text-xs text-white/35">No SELinux context snapshot recorded.</div>}</div>
            </div>
          </div>
        )}

        {activeTab === 'network' && (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              {host.interfaces.map((iface) => <div key={iface.name} className="rounded-xl border border-white/10 bg-[#111114] p-4"><div className="flex justify-between"><span className="font-mono text-sm font-bold text-white">{iface.name}</span><span className={`font-mono text-[9px] ${iface.state === 'UP' ? 'text-[#00ff41]' : iface.state === 'DOWN' ? 'text-red-300' : 'text-white/40'}`}>{iface.state}</span></div><div className="mt-3 text-xs text-white/50">{iface.addresses.join(', ') || 'No address recorded'}</div><div className="mt-1 text-[10px] text-white/35">Gateway: {iface.gateway ?? '—'} · DNS: {iface.dns.join(', ') || '—'}</div></div>)}
            </div>
            {host.interfaces.length === 0 && empty('No normalized NetworkManager/interface snapshot is attached.')}
            {host.routes.length > 0 && <div className="overflow-x-auto rounded-xl border border-white/10"><table className="w-full text-left font-mono text-[10px]"><thead className="bg-black text-white/35"><tr><th className="px-3 py-2">Destination</th><th className="px-3 py-2">Gateway</th><th className="px-3 py-2">Interface</th><th className="px-3 py-2">Protocol</th></tr></thead><tbody>{host.routes.map((route, index) => <tr key={`${route.destination}-${index}`} className="border-t border-white/5"><td className="px-3 py-2 text-white">{route.destination}</td><td className="px-3 py-2 text-white/55">{route.gateway ?? '—'}</td><td className="px-3 py-2 text-white/55">{route.interface ?? '—'}</td><td className="px-3 py-2 text-white/55">{route.protocol ?? '—'}</td></tr>)}</tbody></table></div>}
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-2">
            {host.logs.map((entry) => <div key={entry.id} className="rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-[10px]"><div className="flex justify-between text-white/35"><span>{entry.source}{entry.priority ? ` · ${entry.priority}` : ''}</span><span>{entry.timestamp ?? 'recorded snapshot'}</span></div><div className="mt-2 text-white/70">{entry.message}</div></div>)}
            {host.logs.length === 0 && empty('No JOURNAL_EXTRACT/log snapshot is attached. Live logs are not fabricated.')}
          </div>
        )}

        {activeTab === 'configs' && (
          <div className="space-y-3">
            {host.configurations.map((config) => <div key={config.path} className="rounded-xl border border-white/10 bg-[#111114] p-4"><div className="flex items-center gap-2 font-mono text-xs"><FileCode2 className="h-3.5 w-3.5 text-[#00d4ff]" /><span className="font-bold text-white">{config.path}</span><span className="text-white/30">{config.format}</span></div>{config.description && <p className="mt-2 text-xs text-white/45">{config.description}</p>}<pre className="mt-3 max-h-72 overflow-auto rounded-lg border border-white/10 bg-black p-3 font-mono text-[10px] leading-relaxed text-[#00ff41]">{config.content}</pre></div>)}
            {host.configurations.length === 0 && empty('No normalized configuration snapshot is attached.')}
          </div>
        )}

        {activeTab === 'verification' && (
          <div className="space-y-3">
            {host.verificationRecords.map((record) => <div key={record.id} className="rounded-xl border border-white/10 bg-[#111114] p-4"><div className="flex items-center gap-2"><Activity className="h-3.5 w-3.5 text-[#00ff41]" /><span className="font-mono text-xs font-bold text-white">{record.title}</span></div>{record.command && <code className="mt-3 block rounded bg-black p-2 font-mono text-[10px] text-[#00ff41]">{record.command}</code>}{record.recordedObservation && <p className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-white/55">{record.recordedObservation}</p>}<div className="mt-2 font-mono text-[9px] uppercase tracking-wider text-amber-300/70">{record.source.replaceAll('_', ' ')}</div></div>)}
            {host.verificationRecords.length === 0 && empty('No recorded verification checks are attached to this host.')}
          </div>
        )}
      </div>
    </div>
  );
};
