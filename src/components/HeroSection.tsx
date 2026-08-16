import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Terminal,
  Server,
  Network,
  ShieldCheck,
  Award,
  ChevronRight,
  ChevronDown,
  ArrowUpRight,
  GitBranch,
  Cpu,
  Layers,
  Sparkles,
  Workflow,
} from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext.js';

export const HeroSection: React.FC = () => {
  const {
    setIsTerminalOpen,
  } = usePortfolio();

  const [previewOutput, setPreviewOutput] = useState<string>(
    `[sahil@rhel9-infra ~]$ sestatus
SELinux status:                 enabled
SELinuxfs mount:                /sys/fs/selinux
Current mode:                   enforcing
Mode from config file:          enforcing

[sahil@cisco-edge]# show ip bgp summary
BGP router identifier 198.51.100.2, local AS 65001
Neighbor        V    AS MsgRcvd MsgSent   TblVer  InQ OutQ Up/Down  State/PfxRcd
198.51.100.1    4   100   14820   14822       24    0    0 4d18h           12 (ESTABLISHED)`
  );
  const [activeSnippet, setActiveSnippet] = useState<string>('rhcsa');

  const runHeroSnippet = (snippet: string) => {
    setActiveSnippet(snippet);
    if (snippet === 'rhcsa') {
      setPreviewOutput(
        `[sahil@rhel9-infra ~]$ stratis pool list && lsblk -f
Name              Total / Free / Used        Properties
pool_prod         500 GiB / 340 GiB / 160 GiB  ~dedup,~comp
NAME              FSTYPE LABEL UUID                                 MOUNTPOINT
├─vg_prod-lv_data xfs          3f92b704-58a1-41db-8c70-ea8d3b519001 /data/db
RECORDED LAB SNAPSHOT: LVM storage and systemd state shown for inspection`
      );
    } else if (snippet === 'cisco') {
      setPreviewOutput(
        `R1-HQ-Edge# show standby brief
                     P indicates configured to preempt.
Interface   Grp  Pri P State   Active          Standby         Virtual IP
Gi0/0/1     1    110 P Active  local           10.10.0.3       10.10.0.1
R1-HQ-Edge# show ip route ospf
O   10.10.20.0/24 [110/2] via 10.10.0.10, GigabitEthernet0/0/1
RECORDED LAB SNAPSHOT: OSPF and HSRP state shown for inspection`
      );
    } else if (snippet === 'devops') {
      setPreviewOutput(
        `sahil@devops-runner:~$ argocd app sync platform-lab --prune
TIMESTAMP                  GROUP      KIND       NAMESPACE  NAME               STATUS    HEALTH   HOOK  MESSAGE
2025-02-15T14:22:01Z      apps       Deployment default    core-gateway       Synced    Healthy        deployment.apps/core-gateway updated
2025-02-15T14:22:04Z      cilium.io  CiliumNP   default    isolate-db-mesh    Synced    Healthy        ciliumnetworkpolicy.cilium.io created
RECORDED LAB SNAPSHOT: GitOps reconciliation state shown for inspection`
      );
    }
  };

  return (
    <section className="relative overflow-hidden pt-8 pb-12 border-b border-white/10 bg-[#0a0a0c]">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Headline & Intro */}
          <div className="lg:col-span-7 space-y-6">
            {/* Eyebrow */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-mono bg-black/80 border border-white/15 text-white/90">
                <span className="w-2 h-2 rounded-full bg-[#00ff41] shadow-[0_0_8px_#00ff41] mr-0.5 animate-pulse" />
                <span className="text-[11px] uppercase tracking-wider font-bold">SYSTEMS &amp; INFRASTRUCTURE // PROOF OF WORK</span>
              </div>
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-black/60 border border-[#00d4ff]/40 text-[#00d4ff]">
                <Network className="w-3.5 h-3.5 text-[#00d4ff]" />
                <span className="text-[11px] font-bold">CCNA Track 70%</span>
              </div>
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-black/60 border border-[#00ff41]/40 text-[#00ff41]">
                <Terminal className="w-3.5 h-3.5 text-[#00ff41]" />
                <span className="text-[11px] font-bold">RHCSA Track 50%</span>
              </div>
            </div>

            {/* Main Headline */}
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white font-mono uppercase">
                Sahil K Gupta
              </h1>
              <p className="text-lg sm:text-xl text-[#00d4ff] font-mono font-bold flex items-center gap-2 tracking-wider uppercase">
                <Layers className="w-5 h-5 text-[#00d4ff] shrink-0" />
                <span>Interactive Infrastructure Portfolio</span>
              </p>
              <p className="text-sm sm:text-base text-white/70 leading-relaxed font-sans max-w-2xl pt-1">
                Explore three operator workspaces built around Networking, Enterprise Linux and DevOps. Inspect the architecture, enter the labs, examine configurations and verify how each system works.
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href="#domain-launchpad-section"
                className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-[#00d4ff] hover:brightness-110 text-black font-mono font-bold text-xs sm:text-sm uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(0,212,255,0.25)]"
              >
                <span>Explore Workspaces</span>
                <ChevronDown className="w-4 h-4" />
              </a>

              <button
                id="hero-btn-open-terminal"
                onClick={() => setIsTerminalOpen(true)}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-[#111114] hover:bg-[#1a1a1e] text-[#00ff41] hover:text-white font-mono font-bold text-xs sm:text-sm border border-[#00ff41]/30 uppercase tracking-wider transition-all"
              >
                <Terminal className="w-4 h-4" />
                <span>CLI Terminal</span>
              </button>

              <a
                href="#certifications-section"
                className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-[#111114] hover:bg-[#1a1a1e] text-white/90 hover:text-white font-mono text-xs sm:text-sm border border-white/10 uppercase tracking-wider transition-all"
              >
                <Award className="w-4 h-4 text-[#00d4ff]" />
                <span>Skills &amp; Progress</span>
              </a>
            </div>

            {/* Core Competencies Ticker */}
            <div className="pt-3 border-t border-white/10 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] font-mono text-white/40">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00d4ff] shadow-[0_0_6px_#00d4ff]" />
                Cisco BGP / OSPF / VLANs / Packet Tracer
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00ff41] shadow-[0_0_6px_#00ff41]" />
                RHEL 9 / LVM Storage / Systemd / SELinux
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#06b6d4] shadow-[0_0_6px_#06b6d4]" />
                Kubernetes / Cilium eBPF / ArgoCD / Terraform
              </span>
            </div>
          </div>

          {/* Right Column: Live Interactive CLI Card */}
          <div className="lg:col-span-5">
            <div className="rounded-xl bg-black border border-white/10 shadow-2xl overflow-hidden">
              {/* Window Titlebar */}
              <div className="h-9 bg-[#16161a] flex items-center justify-between px-4 border-b border-white/5">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                  <span className="text-[10px] font-mono text-white/40 ml-2">
                    sahil@infra-cli: ~
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => runHeroSnippet('cisco')}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold transition-colors ${
                      activeSnippet === 'cisco'
                        ? 'bg-white/15 text-[#00d4ff] border border-[#00d4ff]/40'
                        : 'text-white/40 hover:text-white/80'
                    }`}
                  >
                    Networking
                  </button>
                  <button
                    onClick={() => runHeroSnippet('rhcsa')}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold transition-colors ${
                      activeSnippet === 'rhcsa'
                        ? 'bg-white/15 text-[#00ff41] border border-[#00ff41]/40'
                        : 'text-white/40 hover:text-white/80'
                    }`}
                  >
                    Linux
                  </button>
                  <button
                    onClick={() => runHeroSnippet('devops')}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold transition-colors ${
                      activeSnippet === 'devops'
                        ? 'bg-white/15 text-[#06b6d4] border border-[#06b6d4]/40'
                        : 'text-white/40 hover:text-white/80'
                    }`}
                  >
                    DevOps
                  </button>
                </div>
              </div>

              {/* Terminal Body */}
              <div className="p-5 font-mono text-xs text-white/90 bg-black min-h-[240px] flex flex-col justify-between">
                <pre className="whitespace-pre-wrap leading-relaxed text-[#00ff41] font-mono">
                  {previewOutput}
                </pre>
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-white/40">
                  <span className="flex items-center gap-1.5 text-white/60 font-mono">
                    <span className="w-2 h-2 rounded-full bg-[#00ff41] shadow-[0_0_8px_#00ff41] animate-pulse" />
                    {activeSnippet === 'cisco'
                      ? 'NETWORK RECORDED STATE • NOT LIVE TELEMETRY'
                      : activeSnippet === 'rhcsa'
                      ? 'RHEL RECORDED STATE • NOT LIVE TELEMETRY'
                      : 'DELIVERY RECORDED STATE • NOT LIVE TELEMETRY'}
                  </span>
                  <button
                    onClick={() => setIsTerminalOpen(true)}
                    className="text-[#00d4ff] hover:underline flex items-center gap-1 font-bold uppercase tracking-wider font-mono"
                  >
                    Launch Full CLI <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
