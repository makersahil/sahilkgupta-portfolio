import React from 'react';
import {
  Cpu,
  Laptop,
  Layers,
  Network,
  Radio,
  Server,
  ShieldCheck,
} from 'lucide-react';

import type { NetworkingDeviceState, NetworkingLinkState } from '../../types.js';

interface Props {
  devices: NetworkingDeviceState[];
  links: NetworkingLinkState[];
  selectedDeviceKey: string | null;
  activeHopKeys: string[];
  activeLinkKeys: string[];
  onSelectDevice: (device: NetworkingDeviceState) => void;
}

function icon(device: NetworkingDeviceState) {
  const className = 'h-5 w-5';
  switch (device.kind) {
    case 'isp':
      return <Radio className={`${className} text-amber-300`} />;
    case 'router':
      return <Network className={`${className} text-[#00d4ff]`} />;
    case 'multilayer_switch':
    case 'switch':
      return <Layers className={`${className} text-[#00ff41]`} />;
    case 'firewall':
      return <ShieldCheck className={`${className} text-orange-400`} />;
    case 'server':
      return <Server className={`${className} text-emerald-300`} />;
    case 'workstation':
      return <Laptop className={`${className} text-violet-300`} />;
    default:
      return <Cpu className={`${className} text-zinc-300`} />;
  }
}

function nodeBorder(device: NetworkingDeviceState): string {
  if (device.status === 'DOWN') return 'border-red-500/70 shadow-[0_0_20px_rgba(239,68,68,0.18)]';
  if (device.status === 'DEGRADED') return 'border-amber-400/70 shadow-[0_0_20px_rgba(251,191,36,0.18)]';
  if (device.status === 'STANDBY') return 'border-violet-400/60 shadow-[0_0_18px_rgba(167,139,250,0.15)]';
  return 'border-[#00d4ff]/40 shadow-[0_0_18px_rgba(0,212,255,0.12)]';
}

export const NetworkTopologyCanvas: React.FC<Props> = ({
  devices,
  links,
  selectedDeviceKey,
  activeHopKeys,
  activeLinkKeys,
  onSelectDevice,
}) => {
  const byKey = new Map(devices.map((device) => [device.key, device]));

  return (
    <div className="relative min-h-[520px] overflow-hidden rounded-xl border border-white/10 bg-black/70">
      <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(0,212,255,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.2)_1px,transparent_1px)] [background-size:32px_32px]" />
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1000 560" preserveAspectRatio="none">
        {links.map((link) => {
          const source = byKey.get(link.sourceDeviceKey);
          const target = byKey.get(link.targetDeviceKey);
          if (!source || !target) return null;
          const active = activeLinkKeys.includes(link.key);
          const down = link.status === 'DOWN';
          return (
            <g key={link.key}>
              <line
                x1={source.position.x}
                y1={source.position.y}
                x2={target.position.x}
                y2={target.position.y}
                stroke={active ? '#00ff41' : down ? '#ef4444' : '#155e75'}
                strokeWidth={active ? 5 : 2}
                strokeDasharray={down ? '10 8' : undefined}
                opacity={active ? 1 : 0.75}
              />
            </g>
          );
        })}
      </svg>

      {devices.map((device) => {
        const selected = device.key === selectedDeviceKey;
        const activeHop = activeHopKeys.includes(device.key);
        return (
          <button
            key={device.key}
            type="button"
            onClick={() => onSelectDevice(device)}
            className={`absolute w-36 -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-[#101014]/95 p-3 text-left transition-all hover:z-20 hover:scale-105 ${
              selected ? 'z-20 border-[#00ff41] shadow-[0_0_25px_rgba(0,255,65,0.22)]' : nodeBorder(device)
            } ${activeHop ? 'ring-2 ring-[#00ff41]/80' : ''}`}
            style={{ left: `${device.position.x / 10}%`, top: `${device.position.y / 5.6}%` }}
            aria-label={`Inspect ${device.label}`}
          >
            <div className="flex items-center justify-between gap-2">
              {icon(device)}
              <span className={`h-2 w-2 rounded-full ${device.status === 'DOWN' ? 'bg-red-500' : device.status === 'DEGRADED' ? 'bg-amber-400' : 'bg-[#00ff41]'}`} />
            </div>
            <div className="mt-2 truncate font-mono text-[11px] font-bold text-white">{device.label}</div>
            <div className="mt-1 truncate font-mono text-[9px] uppercase tracking-wider text-white/45">
              {device.kind.replaceAll('_', ' ')} · {device.status}
            </div>
            <div className="mt-1 truncate font-mono text-[9px] text-[#00d4ff]">
              {device.managementAddress ?? 'Address not recorded'}
            </div>
          </button>
        );
      })}

      {devices.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center font-mono text-sm text-white/50">
          This lab has no persisted networking devices yet. Add LabNode records through the Lab Builder.
        </div>
      )}
    </div>
  );
};
