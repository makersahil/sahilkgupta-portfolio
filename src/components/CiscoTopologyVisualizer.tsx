import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Network,
  Radio,
  Send,
  ShieldCheck,
  Server,
  Laptop,
  CheckCircle2,
  AlertCircle,
  Terminal,
  Activity,
  Layers,
  Sparkles,
  Info,
  Cpu,
  FileCode,
  Table,
  Check,
  Copy,
  ChevronRight,
  X,
  BookOpen,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { TopologyData, TopologyNode } from '../types.js';

export const CiscoTopologyVisualizer: React.FC = () => {
  const [topology, setTopology] = useState<TopologyData | null>(null);
  const [selectedNode, setSelectedNode] = useState<TopologyNode | null>(null);
  const [sourceNodeId, setSourceNodeId] = useState<string>('pc_devops');
  const [targetNodeId, setTargetNodeId] = useState<string>('srv_k8s');
  const [protocol, setProtocol] = useState<string>('ICMP Echo (Ping)');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [activeHopIndex, setActiveHopIndex] = useState<number>(-1);
  const [activeTab, setActiveTab] = useState<'topology' | 'routing_table' | 'acls' | 'verification'>('topology');
  const [copiedConfig, setCopiedConfig] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState(false);
  const [isRunbookOpen, setIsRunbookOpen] = useState(false);
  const [isSpecsOpen, setIsSpecsOpen] = useState(false);

  useEffect(() => {
    api
      .getTopology()
      .then((data) => {
        setTopology(data);
        const r1 = data.nodes.find((n) => n.id === 'r1') || data.nodes[0];
        setSelectedNode(r1);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Failed to load network topology';
        setUploadError(true);
        setUploadStatus(`Topology unavailable: ${message}`);
      });
  }, []);

  const handleSimulate = async () => {
    setIsSimulating(true);
    setSimulationResult(null);
    setActiveHopIndex(0);
    setUploadError(false);
    setUploadStatus(null);

    try {
      const res = await api.simulatePacket(sourceNodeId, targetNodeId, protocol);
      setSimulationResult(res);

      if (res.hops && res.hops.length > 0) {
        for (let i = 0; i < res.hops.length; i++) {
          await new Promise((r) => setTimeout(r, 600));
          setActiveHopIndex(i);
        }
      }
    } catch (err) {
      console.error('Simulation error:', err);
      const message = err instanceof Error ? err.message : 'Packet simulation failed';
      setUploadError(true);
      setUploadStatus(`Simulation failed: ${message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedConfig(true);
    setTimeout(() => setCopiedConfig(false), 2000);
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'isp':
        return <Radio className="w-5 h-5 text-amber-400" />;
      case 'router':
        return <Network className="w-5 h-5 text-[#00d4ff]" />;
      case 'multilayer_switch':
        return <Layers className="w-5 h-5 text-[#00ff41]" />;
      case 'firewall':
        return <ShieldCheck className="w-5 h-5 text-[#ff4100]" />;
      case 'server':
        return <Server className="w-5 h-5 text-emerald-400" />;
      case 'workstation':
        return <Laptop className="w-5 h-5 text-violet-400" />;
      default:
        return <Cpu className="w-5 h-5 text-zinc-400" />;
    }
  };

  const getNodeCiscoConfig = (node: TopologyNode) => {
    switch (node.id) {
      case 'r1':
        return `! Cisco IOS ISR 4451-X Running Config (Primary Active)
hostname R1-HQ-Edge
ip routing
ipv6 unicast-routing
!
interface GigabitEthernet0/0/0
 description WAN_UPLINK_ISP1
 ip address 198.51.100.2 255.255.255.252
 no shutdown
!
interface GigabitEthernet0/0/1
 description TRUNK_TO_CORE_MLS
 ip address 10.10.0.2 255.255.255.0
 standby 1 ip 10.10.0.1
 standby 1 priority 110
 standby 1 preempt
 standby 1 track GigabitEthernet0/0/0 25
 no shutdown
!
router bgp 65001
 bgp router-id 1.1.1.1
 neighbor 198.51.100.1 remote-as 100
 neighbor 10.10.0.3 remote-as 65001
 neighbor 10.10.0.3 next-hop-self
!
router ospf 1
 router-id 1.1.1.1
 network 10.10.0.0 0.0.0.255 area 0`;

      case 'r2':
        return `! Cisco IOS ISR 4451-X Standby Router
hostname R2-Backup-Edge
ip routing
!
interface GigabitEthernet0/0/0
 description WAN_UPLINK_ISP2
 ip address 203.0.113.2 255.255.255.252
 no shutdown
!
interface GigabitEthernet0/0/1
 ip address 10.10.0.3 255.255.255.0
 standby 1 ip 10.10.0.1
 standby 1 priority 90
 no shutdown
!
router bgp 65001
 neighbor 203.0.113.1 remote-as 200
 neighbor 10.10.0.2 remote-as 65001`;

      case 'sw_core':
        return `! Cisco Catalyst 9500 Core Multilayer Switch
hostname Core-Switch-MLS01
vlan 10,20,30,99
!
interface Vlan10
 description SVI_ENGINEERING
 ip address 10.10.10.1 255.255.255.0
!
interface Vlan20
 description SVI_PRODUCTION_SERVERS
 ip address 10.10.20.1 255.255.255.0
!
interface Vlan30
 description SVI_SECURITY_DMZ
 ip address 10.10.30.1 255.255.255.0`;

      case 'fw_asa':
        return `! Cisco ASA 5506-X Firepower Security Appliance
interface GigabitEthernet1/1
 nameif inside_dmz
 security-level 50
 ip address 10.10.30.2 255.255.255.0
!
access-list DMZ_IN extended permit tcp any host 10.10.30.50 eq 443
access-group DMZ_IN in interface inside_dmz`;

      default:
        return `! Node IP Configuration
Host: ${node.name}
IPv4: ${node.ip}
VLAN: ${node.vlan || 'Untagged'}
Gateway: 10.10.0.1 (HSRP Virtual IP)`;
    }
  };

  const sampleRoutingTable = [
    { code: 'B', name: 'eBGP', prefix: '0.0.0.0/0', via: '198.51.100.1', iface: 'Gi0/0/0', ad: 20, metric: '0' },
    { code: 'C', name: 'Connected', prefix: '198.51.100.0/30', via: 'Direct', iface: 'Gi0/0/0', ad: 0, metric: '0' },
    { code: 'C', name: 'Connected', prefix: '10.10.0.0/24', via: 'Direct', iface: 'Gi0/0/1', ad: 0, metric: '0' },
    { code: 'O', name: 'OSPF', prefix: '10.10.10.0/24', via: '10.10.0.10', iface: 'Gi0/0/1', ad: 110, metric: '2' },
    { code: 'O', name: 'OSPF', prefix: '10.10.20.0/24', via: '10.10.0.10', iface: 'Gi0/0/1', ad: 110, metric: '2' },
    { code: 'O', name: 'OSPF', prefix: '10.10.30.0/24', via: '10.10.0.10', iface: 'Gi0/0/1', ad: 110, metric: '2' },
    { code: 'i', name: 'iBGP', prefix: '2.2.2.2/32', via: '10.10.0.3', iface: 'Gi0/0/1', ad: 200, metric: '0' },
  ];

  const verificationTasks = [
    { name: 'BGP Dual-Homed Peering', test: 'show ip bgp summary', result: 'State 1 (Established with AS 100 & AS 200)', passed: true },
    { name: 'HSRP Active Failover Redundancy', test: 'show standby brief', result: 'Active: 10.10.0.2, Standby: 10.10.0.3, Virtual IP: 10.10.0.1', passed: true },
    { name: 'OSPF Area 0 Backbone Adjacency', test: 'show ip ospf neighbor', result: 'Neighbor 2.2.2.2 in state FULL/BDR', passed: true },
    { name: 'Inter-VLAN SVI Routing & ACLs', test: 'show ip route ospf', result: '3 Intra-Area Routes via MLS01 SVI', passed: true },
  ];

  return (
    <section id="network-topology-section" className="py-14 border-b border-white/10 bg-[#0a0a0c]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded text-[10px] font-mono bg-black/60 text-[#00d4ff] border border-white/10 uppercase tracking-widest mb-2">
              <Network className="w-3.5 h-3.5 text-[#00d4ff]" />
              <span>CCNA 200-301 &bull; Cisco Packet Tracer (.PKT) Sandbox Lab</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight uppercase">
              Cisco WAN &amp; BGP Topology Lab
            </h2>
            <p className="text-sm text-white/70 max-w-2xl mt-1">
              Interactive Cisco Packet Tracer workspace featuring dual-homed eBGP carrier uplinks, OSPF Area 0, HSRP default gateway failover (VIP 10.10.0.1), and real-time packet hop tracing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsRunbookOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-[#111114] hover:bg-[#1a1a1e] text-[#00d4ff] hover:text-white border border-[#00d4ff]/40 text-xs font-mono uppercase tracking-wider transition-all shadow-[0_0_12px_rgba(0,212,255,0.15)] font-bold"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#00d4ff]" />
              <span>View Lab Runbook</span>
            </button>

            <button
              onClick={() => setIsSpecsOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-[#111114] hover:bg-[#1a1a1e] text-white/80 hover:text-white border border-white/10 text-xs font-mono uppercase tracking-wider transition-colors font-semibold"
            >
              <FileCode className="w-3.5 h-3.5 text-[#00ff41]" />
              <span>View Lab Specs</span>
            </button>
          </div>
        </div>

        {/* Operation status banner */}
        {uploadStatus && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-4 p-3 rounded-lg text-xs font-mono flex items-center justify-between ${
              uploadError
                ? 'bg-[#ff4100]/10 border border-[#ff4100]/40 text-[#ff7950]'
                : 'bg-[#00d4ff]/10 border border-[#00d4ff]/40 text-[#00d4ff]'
            }`}
          >
            <div className="flex items-center space-x-2">
              {uploadError ? <X className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{uploadStatus}</span>
            </div>
          </motion.div>
        )}

        {/* Navigation Tabs for Lab Modes */}
        <div className="flex items-center space-x-2 mb-6 border-b border-white/10 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('topology')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-colors ${
              activeTab === 'topology'
                ? 'bg-[#00d4ff]/15 text-[#00d4ff] border border-[#00d4ff]/40'
                : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>Interactive Topology Stage</span>
          </button>

          <button
            onClick={() => setActiveTab('routing_table')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-colors ${
              activeTab === 'routing_table'
                ? 'bg-[#00ff41]/15 text-[#00ff41] border border-[#00ff41]/40'
                : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>BGP/OSPF Routing Table</span>
          </button>

          <button
            onClick={() => setActiveTab('verification')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-colors ${
              activeTab === 'verification'
                ? 'bg-[#ff4100]/15 text-[#ff4100] border border-[#ff4100]/40'
                : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Lab Verification Checklist</span>
          </button>
        </div>

        {activeTab === 'topology' && (
          <>
            {/* Interactive Controls Bar */}
            <div className="mb-6 p-4 rounded-xl bg-[#111114] border border-white/10 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center space-x-2 text-xs font-mono">
                  <span className="text-white/40 uppercase tracking-wider text-[10px]">Source:</span>
                  <select
                    value={sourceNodeId}
                    onChange={(e) => setSourceNodeId(e.target.value)}
                    className="bg-black text-white/90 border border-white/10 rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-[#00d4ff]"
                  >
                    {topology?.nodes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.name}
                      </option>
                    ))}
                  </select>
                </div>

                <span className="text-white/20 font-mono hidden sm:inline">&rarr;</span>

                <div className="flex items-center space-x-2 text-xs font-mono">
                  <span className="text-white/40 uppercase tracking-wider text-[10px]">Target:</span>
                  <select
                    value={targetNodeId}
                    onChange={(e) => setTargetNodeId(e.target.value)}
                    className="bg-black text-white/90 border border-white/10 rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-[#00d4ff]"
                  >
                    {topology?.nodes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-2 text-xs font-mono">
                  <span className="text-white/40 uppercase tracking-wider text-[10px]">Protocol:</span>
                  <select
                    value={protocol}
                    onChange={(e) => setProtocol(e.target.value)}
                    className="bg-black text-white/90 border border-white/10 rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-[#00d4ff]"
                  >
                    <option value="ICMP Echo (Ping)">ICMP Echo (Ping)</option>
                    <option value="TCP SYN/ACK (Port 443)">TCP SYN/ACK (Port 443)</option>
                    <option value="BGP Route Update (TCP 179)">BGP Route Update (TCP 179)</option>
                    <option value="OSPF Hello / LSA (Multicast 224.0.0.5)">OSPF LSA Multicast</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleSimulate}
                disabled={isSimulating}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#00ff41] hover:brightness-110 disabled:opacity-50 text-black font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(0,255,65,0.15)]"
              >
                <Send className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
                <span>{isSimulating ? 'Tracing Route...' : 'Simulate Packet Flow'}</span>
              </button>
            </div>

            {/* Main Visualizer Stage & Node Inspector Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Visual Topology Stage */}
              <div className="lg:col-span-8 rounded-xl bg-black border border-white/10 p-4 sm:p-6 overflow-hidden relative min-h-[460px] flex flex-col justify-between shadow-2xl">
                <div className="absolute inset-0 bg-[radial-gradient(#00d4ff15_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

                {/* SVG Connecting Links */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                  {topology?.links.map((link, idx) => {
                    const srcNode = topology.nodes.find((n) => n.id === link.source);
                    const dstNode = topology.nodes.find((n) => n.id === link.target);
                    if (!srcNode || !dstNode) return null;

                    const x1 = `${(srcNode.x / 800) * 100}%`;
                    const y1 = `${(srcNode.y / 500) * 100}%`;
                    const x2 = `${(dstNode.x / 800) * 100}%`;
                    const y2 = `${(dstNode.y / 500) * 100}%`;

                    const isLinkActiveInSimulation =
                      simulationResult?.hops &&
                      simulationResult.hops.includes(link.source) &&
                      simulationResult.hops.includes(link.target);

                    return (
                      <g key={`link-${idx}`}>
                        <line
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke={isLinkActiveInSimulation ? '#00d4ff' : 'rgba(255,255,255,0.1)'}
                          strokeWidth={isLinkActiveInSimulation ? '3' : '1.5'}
                          strokeDasharray={link.protocol.includes('BGP') ? '4 4' : 'none'}
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* Interactive Nodes */}
                <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-4 h-full">
                  {topology?.nodes.map((node) => {
                    const isSelected = selectedNode?.id === node.id;
                    const isSource = sourceNodeId === node.id;
                    const isTarget = targetNodeId === node.id;
                    const hopIdx = simulationResult?.hops?.indexOf(node.id);
                    const isCurrentHop = hopIdx !== undefined && hopIdx !== -1 && hopIdx <= activeHopIndex;

                    return (
                      <motion.div
                        key={node.id}
                        onClick={() => setSelectedNode(node)}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.98 }}
                        className={`cursor-pointer rounded-xl p-3 sm:p-4 border transition-all ${
                          isSelected
                            ? 'bg-[#111114] border-[#00d4ff] ring-1 ring-[#00d4ff] shadow-[0_0_15px_rgba(0,212,255,0.25)]'
                            : isCurrentHop
                            ? 'bg-[#111114] border-[#00ff41] ring-1 ring-[#00ff41] shadow-[0_0_15px_rgba(0,255,65,0.25)]'
                            : 'bg-[#111114]/90 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="p-2 rounded-lg bg-black border border-white/10">
                            {getNodeIcon(node.type)}
                          </div>
                          <div className="flex items-center space-x-1">
                            {isSource && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#00ff41]/20 text-[#00ff41] border border-[#00ff41]/40 font-bold">
                                SRC
                              </span>
                            )}
                            {isTarget && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/40 font-bold">
                                DST
                              </span>
                            )}
                            <span className="w-2 h-2 rounded-full bg-[#00ff41] shadow-[0_0_8px_#00ff41] animate-pulse" />
                          </div>
                        </div>

                        <h4 className="text-xs font-mono font-bold text-white truncate">
                          {node.name}
                        </h4>
                        <p className="text-[11px] font-mono text-white/40 truncate mt-0.5">
                          {node.ip}
                        </p>
                        {node.vlan && (
                          <span className="inline-block mt-2 px-1.5 py-0.5 rounded text-[10px] font-mono bg-black text-white/60 border border-white/10">
                            {node.vlan}
                          </span>
                        )}
                      </motion.div>
                    );
                  })}
                </div>

                {/* Live Packet Telemetry Result Strip */}
                {simulationResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative z-10 mt-6 p-3 rounded-lg bg-[#111114] border border-[#00d4ff]/40 text-xs font-mono flex flex-wrap items-center justify-between gap-2 shadow-lg"
                  >
                    <div className="flex items-center space-x-2 text-[#00ff41] font-semibold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        Packet Delivered &bull; {simulationResult.roundTripMs}ms Round Trip
                      </span>
                    </div>
                    <div className="text-white/70">
                      Hops: <span className="text-white font-bold">{simulationResult.hops.join(' → ')}</span>
                    </div>
                    <div className="text-white/70">
                      TTL: <span className="text-[#00d4ff] font-bold">{simulationResult.ttl}</span> &bull; Firewall: <span className="text-[#00ff41]">Stateful PASS</span>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Node Inspector Panel */}
              <div className="lg:col-span-4 rounded-xl bg-[#111114] border border-white/10 p-5 space-y-4 font-mono text-xs shadow-2xl">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center space-x-2">
                    <Terminal className="w-4 h-4 text-[#00d4ff]" />
                    <h3 className="font-bold text-white text-sm uppercase tracking-wider">Cisco Device Inspector</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-black text-white/40 border border-white/10 uppercase tracking-widest">
                    {selectedNode?.type}
                  </span>
                </div>

                {selectedNode ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] text-white/40 uppercase tracking-widest">Hostname &amp; Management IP</label>
                      <p className="text-sm font-bold text-white mt-0.5">{selectedNode.name}</p>
                      <p className="text-xs text-[#00d4ff]">{selectedNode.ip}</p>
                    </div>

                    <div>
                      <label className="text-[10px] text-white/40 uppercase tracking-widest">Role &amp; Details</label>
                      <p className="text-xs text-white/80 mt-1 leading-relaxed bg-black/60 p-2.5 rounded border border-white/5">
                        {selectedNode.details}
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] text-white/40 uppercase tracking-widest">
                          Cisco IOS Running Config Extract
                        </label>
                        <button
                          onClick={() => copyToClipboard(getNodeCiscoConfig(selectedNode))}
                          className="flex items-center space-x-1 text-[10px] text-white/40 hover:text-white transition-colors"
                        >
                          {copiedConfig ? <Check className="w-3 h-3 text-[#00ff41]" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedConfig ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <pre className="p-3 rounded-lg bg-black border border-white/10 text-[11px] font-mono text-[#00ff41] overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[200px] overflow-y-auto">
                        {getNodeCiscoConfig(selectedNode)}
                      </pre>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-[10px] text-white/40">
                      <span>Packet Tracer V8.2.1 Compatible</span>
                      <span className="text-[#00ff41] font-bold">Adjacency: FULL/BDR</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-white/40">
                    Click any device node on the left to inspect its Cisco IOS configuration.
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'routing_table' && (
          <div className="rounded-xl bg-[#111114] border border-white/10 p-6 space-y-4 font-mono text-xs shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <h3 className="font-bold text-white text-base">Cisco IOS Routing Table (show ip route)</h3>
                <p className="text-white/40 text-xs mt-0.5">Legend: B - eBGP, i - iBGP, O - OSPF Intra-Area, C - Directly Connected</p>
              </div>
              <span className="px-2.5 py-1 rounded bg-black text-[#00d4ff] border border-white/10 font-bold">
                7 Active RIB Routes
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-white/40 text-[11px] uppercase">
                    <th className="py-2 px-3">Code</th>
                    <th className="py-2 px-3">Protocol</th>
                    <th className="py-2 px-3">Destination Prefix</th>
                    <th className="py-2 px-3">Next-Hop Gateway</th>
                    <th className="py-2 px-3">Egress Interface</th>
                    <th className="py-2 px-3">AD / Metric</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sampleRoutingTable.map((route, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      <td className="py-2.5 px-3">
                        <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                          route.code === 'B' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                          route.code === 'O' ? 'bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/40' :
                          'bg-[#00ff41]/20 text-[#00ff41] border border-[#00ff41]/40'
                        }`}>
                          {route.code}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-white/90">{route.name}</td>
                      <td className="py-2.5 px-3 text-[#00ff41] font-bold">{route.prefix}</td>
                      <td className="py-2.5 px-3 text-white/70">{route.via}</td>
                      <td className="py-2.5 px-3 text-white/60">{route.iface}</td>
                      <td className="py-2.5 px-3 text-white/40 font-mono">[{route.ad}/{route.metric}]</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'verification' && (
          <div className="rounded-xl bg-[#111114] border border-white/10 p-6 space-y-4 font-mono text-xs shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <h3 className="font-bold text-white text-base">Cisco CCNA Lab Verification Suite</h3>
                <p className="text-white/40 text-xs mt-0.5">Automated test harness verifying routing convergence and redundancy states.</p>
              </div>
              <span className="px-2.5 py-1 rounded bg-[#00ff41]/10 text-[#00ff41] border border-[#00ff41]/40 font-bold">
                LAB CHECKS COMPLETED
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {verificationTasks.map((task, i) => (
                <div key={i} className="p-4 rounded-lg bg-black border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-[#00ff41]" />
                      {task.name}
                    </span>
                    <span className="text-[10px] text-[#00ff41] font-bold uppercase">PASSED</span>
                  </div>
                  <div className="text-[11px] text-white/40">
                    Command: <code className="text-[#00d4ff]">{task.test}</code>
                  </div>
                  <div className="p-2 rounded bg-[#111114] text-[11px] text-white/80 leading-relaxed border border-white/5">
                    {task.result}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Runbook Modal */}
        <AnimatePresence>
          {isRunbookOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-[#111114] border border-white/20 rounded-xl p-6 font-mono text-xs text-white/90 space-y-5 shadow-2xl"
              >
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center space-x-2 text-[#00d4ff]">
                    <BookOpen className="w-5 h-5" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                      Cisco WAN Lab Operator Runbook
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsRunbookOpen(false)}
                    className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-[11px] font-bold text-[#00d4ff] uppercase tracking-wider mb-1">
                      MISSION
                    </h4>
                    <p className="text-white/70 leading-relaxed">
                      Build and inspect a resilient enterprise WAN using dynamic routing (eBGP AS 65001 to dual upstream ISPs) and gateway redundancy (HSRP VIP 10.10.0.1) across Cisco IOS-XE edge routers.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-[11px] font-bold text-[#00ff41] uppercase tracking-wider mb-1">
                      TOPOLOGY
                    </h4>
                    <div className="p-3 bg-black rounded-lg border border-white/10 text-white/80 space-y-1 text-[11px]">
                      <div>&bull; <strong className="text-white">ISP-1 (AS 100) &amp; ISP-2 (AS 200)</strong> — Primary &amp; secondary carrier uplinks</div>
                      <div>&bull; <strong className="text-white">R1-HQ-Edge (ISR 4451)</strong> — Active BGP router &amp; HSRP Active Gateway (Priority 110)</div>
                      <div>&bull; <strong className="text-white">R2-Backup-Edge (ISR 4451)</strong> — Standby BGP router &amp; HSRP Standby Gateway (Priority 90)</div>
                      <div>&bull; <strong className="text-white">Core-Switch-MLS01 (Catalyst 9500)</strong> — OSPF Area 0 distribution &amp; 802.1Q trunking</div>
                      <div>&bull; <strong className="text-white">ASA 5506-X Security Appliance</strong> — DMZ inspection &amp; ACL enforcement</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-1">
                      WHAT TO INSPECT
                    </h4>
                    <ul className="list-disc list-inside text-white/70 space-y-1">
                      <li>Click any node on the topology stage to inspect live interface addressing and Cisco IOS running configurations.</li>
                      <li>Run packet simulations between VLAN workloads (e.g. PC to Server) to trace exact L3 hops.</li>
                      <li>Inspect the dual-homed BGP table with eBGP (AS 100/200) and iBGP peering over OSPF Area 0.</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-[11px] font-bold text-[#00d4ff] uppercase tracking-wider mb-1">
                      VERIFICATION STEPS
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2.5 bg-black rounded border border-white/10">
                        <span className="text-white font-bold block">01 Inspect Topology</span>
                        <span className="text-white/50">Select edge routers to verify interface statuses and IP assignments.</span>
                      </div>
                      <div className="p-2.5 bg-black rounded border border-white/10">
                        <span className="text-white font-bold block">02 Review Routing State</span>
                        <span className="text-white/50">Switch to Routing Table tab to verify eBGP and OSPF convergence.</span>
                      </div>
                      <div className="p-2.5 bg-black rounded border border-white/10">
                        <span className="text-white font-bold block">03 Trace Packet Flow</span>
                        <span className="text-white/50">Execute hop-by-hop packet simulation between endpoints.</span>
                      </div>
                      <div className="p-2.5 bg-black rounded border border-white/10">
                        <span className="text-white font-bold block">04 Verify Failover</span>
                        <span className="text-white/50">Confirm HSRP tracking automatically swings traffic if R1 uplink degrades.</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 flex justify-end">
                  <button
                    onClick={() => setIsRunbookOpen(false)}
                    className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-mono text-xs uppercase tracking-wider font-bold"
                  >
                    Close Runbook
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Specs Modal */}
        <AnimatePresence>
          {isSpecsOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-[#111114] border border-white/20 rounded-xl p-6 font-mono text-xs text-white/90 space-y-5 shadow-2xl"
              >
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center space-x-2 text-[#00ff41]">
                    <FileCode className="w-5 h-5" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                      Lab Technical Specifications
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsSpecsOpen(false)}
                    className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-[11px] font-bold text-[#00ff41] uppercase tracking-wider mb-1">
                      ENVIRONMENT COMPATIBILITY
                    </h4>
                    <p className="text-white/70 leading-relaxed">
                      Cisco Packet Tracer 8.2+ compatible topology. Engineered with Cisco IOS-XE syntax for ISR 4451-X edge routers and Catalyst 9500 multilayer distribution switches.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-[11px] font-bold text-[#00d4ff] uppercase tracking-wider mb-1">
                      PROTOCOLS &amp; STANDARDS
                    </h4>
                    <div className="p-3 bg-black rounded-lg border border-white/10 grid grid-cols-2 gap-2 text-[11px]">
                      <div>&bull; <strong className="text-white">BGP:</strong> AS 65001 (eBGP + iBGP)</div>
                      <div>&bull; <strong className="text-white">IGP:</strong> OSPFv2 Single Area 0</div>
                      <div>&bull; <strong className="text-white">FHRP:</strong> HSRP v2 (VIP 10.10.0.1)</div>
                      <div>&bull; <strong className="text-white">Switching:</strong> 802.1Q Inter-VLAN SVI</div>
                      <div>&bull; <strong className="text-white">Security:</strong> Extended Named ACLs</div>
                      <div>&bull; <strong className="text-white">Telemetry:</strong> Syslog &amp; SNMPv3</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-1">
                      ADDRESSING PLAN
                    </h4>
                    <div className="p-3 bg-black rounded-lg border border-white/10 text-white/80 space-y-1 text-[11px] font-mono">
                      <div>WAN ISP1: <span className="text-[#00d4ff]">198.51.100.0/30</span> (R1: .2, ISP: .1)</div>
                      <div>WAN ISP2: <span className="text-[#00d4ff]">203.0.113.0/30</span> (R2: .2, ISP: .1)</div>
                      <div>Transit LAN: <span className="text-[#00ff41]">10.10.0.0/24</span> (VIP: .1, R1: .2, R2: .3)</div>
                      <div>VLAN 10 Workstations: <span className="text-[#00ff41]">10.10.10.0/24</span></div>
                      <div>VLAN 20 Servers: <span className="text-[#00ff41]">10.10.20.0/24</span></div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 flex justify-end">
                  <button
                    onClick={() => setIsSpecsOpen(false)}
                    className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-mono text-xs uppercase tracking-wider font-bold"
                  >
                    Close Specifications
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};
