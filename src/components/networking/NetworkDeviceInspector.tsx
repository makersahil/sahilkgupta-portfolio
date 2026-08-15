import React, { useState } from 'react';
import { Check, Copy, Router, TerminalSquare } from 'lucide-react';

import type { NetworkingDeviceState } from '../../types.js';

interface Props {
  device: NetworkingDeviceState | null;
}

export const NetworkDeviceInspector: React.FC<Props> = ({ device }) => {
  const [copied, setCopied] = useState(false);

  if (!device) {
    return (
      <aside className="rounded-xl border border-white/10 bg-[#111114] p-5 font-mono text-xs text-white/50">
        Select a device from the topology to inspect its persisted state.
      </aside>
    );
  }

  const copyConfiguration = async () => {
    if (!device.configurationSnippet) return;
    await navigator.clipboard.writeText(device.configurationSnippet);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <aside className="space-y-4 rounded-xl border border-white/10 bg-[#111114] p-5">
      <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#00d4ff]">
            <Router className="h-4 w-4" /> Device Inspector
          </div>
          <h3 className="mt-2 font-mono text-sm font-bold uppercase text-white">{device.label}</h3>
          <p className="mt-1 text-xs text-white/55">{device.role ?? device.description ?? 'Role not recorded'}</p>
        </div>
        <span className={`rounded border px-2 py-1 font-mono text-[9px] font-bold ${
          device.status === 'DOWN'
            ? 'border-red-500/40 bg-red-500/10 text-red-300'
            : device.status === 'DEGRADED'
              ? 'border-amber-400/40 bg-amber-400/10 text-amber-300'
              : 'border-[#00ff41]/30 bg-[#00ff41]/10 text-[#00ff41]'
        }`}>
          {device.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 font-mono text-[10px]">
        <div className="rounded-lg border border-white/5 bg-black/40 p-3">
          <div className="uppercase tracking-wider text-white/35">Kind</div>
          <div className="mt-1 text-white">{device.kind.replaceAll('_', ' ')}</div>
        </div>
        <div className="rounded-lg border border-white/5 bg-black/40 p-3">
          <div className="uppercase tracking-wider text-white/35">Model</div>
          <div className="mt-1 truncate text-white">{device.model ?? 'Not recorded'}</div>
        </div>
        <div className="col-span-2 rounded-lg border border-white/5 bg-black/40 p-3">
          <div className="uppercase tracking-wider text-white/35">Management Address</div>
          <div className="mt-1 text-[#00d4ff]">{device.managementAddress ?? 'Not recorded'}</div>
        </div>
      </div>

      <div>
        <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">Interfaces</div>
        <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
          {device.interfaces.length > 0 ? device.interfaces.map((entry) => (
            <div key={`${device.key}-${entry.name}`} className="rounded-lg border border-white/5 bg-black/40 p-3 font-mono text-[10px]">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-white">{entry.name}</span>
                <span className={entry.status === 'DOWN' ? 'text-red-300' : 'text-[#00ff41]'}>{entry.status}</span>
              </div>
              <div className="mt-1 text-white/55">{entry.address ?? 'No address'} {entry.subnet ? `/ ${entry.subnet}` : ''}</div>
              <div className="mt-1 text-white/35">{[entry.type, entry.vlan ? `VLAN ${entry.vlan}` : null].filter(Boolean).join(' · ') || 'Interface metadata not recorded'}</div>
            </div>
          )) : (
            <div className="rounded-lg border border-dashed border-white/10 p-3 font-mono text-[10px] text-white/35">No interfaces recorded.</div>
          )}
        </div>
      </div>

      <div>
        <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">Protocols / Functions</div>
        <div className="flex flex-wrap gap-1.5">
          {device.routingProtocols.length > 0 ? device.routingProtocols.map((protocol) => (
            <span key={protocol} className="rounded border border-[#00d4ff]/20 bg-[#00d4ff]/5 px-2 py-1 font-mono text-[9px] text-[#00d4ff]">
              {protocol}
            </span>
          )) : <span className="font-mono text-[10px] text-white/35">No routing protocols recorded.</span>}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">
            <TerminalSquare className="h-3.5 w-3.5" /> Configuration Snapshot
          </div>
          {device.configurationSnippet && (
            <button type="button" onClick={copyConfiguration} className="rounded border border-white/10 p-1.5 text-white/45 hover:text-white" title="Copy configuration">
              {copied ? <Check className="h-3.5 w-3.5 text-[#00ff41]" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-black p-3 font-mono text-[10px] leading-relaxed text-[#00ff41]">
          {device.configurationSnippet ?? '! No configuration snapshot is attached to this device.'}
        </pre>
      </div>
    </aside>
  );
};
