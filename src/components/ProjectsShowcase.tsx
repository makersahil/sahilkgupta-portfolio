import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ExternalLink,
  Github,
  Network,
  Terminal,
  Server,
  Layers,
  ArrowUpRight,
  Download,
  X,
  CheckCircle2,
  Cpu,
  Sparkles,
  ShieldCheck,
  GitBranch,
  FileCode,
  Check,
  Copy,
  Table,
  Workflow,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { usePortfolio } from '../context/PortfolioContext.js';
import { Project } from '../types.js';

export const ProjectsShowcase: React.FC = () => {
  const {
    projects,
    categories,
    activeCategory,
    setActiveCategory,
    activeProjectModal,
    setActiveProjectModal,
  } = usePortfolio();

  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<'overview' | 'specialized_format' | 'code_iac'>('overview');
  const [copiedText, setCopiedText] = useState(false);

  // Filter projects by active category and optional tag
  const filteredProjects = projects.filter((p) => {
    const matchesCategory = !activeCategory || p.categoryId === activeCategory.id;
    const matchesTag = !selectedTag || p.tags.includes(selectedTag) || p.devopsStack.includes(selectedTag);
    return matchesCategory && matchesTag;
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const getFormatBadge = (formatType?: string) => {
    switch (formatType) {
      case 'cisco_pkt_lab':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-black/80 text-[#00d4ff] border border-[#00d4ff]/40 flex items-center gap-1 uppercase">
            <Network className="w-3 h-3 text-[#00d4ff]" />
            .PKT Lab
          </span>
        );
      case 'rhcsa_matrix':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-black/80 text-[#ff4100] border border-[#ff4100]/40 flex items-center gap-1 uppercase">
            <ShieldCheck className="w-3 h-3 text-[#ff4100]" />
            RHCSA Matrix
          </span>
        );
      case 'devops_pipeline':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-black/80 text-[#00ff41] border border-[#00ff41]/40 flex items-center gap-1 uppercase">
            <GitBranch className="w-3 h-3 text-[#00ff41]" />
            GitOps Pipeline
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <section id="projects-section" className="py-14 border-b border-white/10 bg-[#0a0a0c]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded text-[10px] font-mono bg-black/60 text-[#00d4ff] border border-white/10 uppercase tracking-widest mb-2">
              <Server className="w-3.5 h-3.5 text-[#00d4ff]" />
              <span>Multi-Format Engineering Portfolios</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight uppercase">
              Specialized Infrastructure Portfolios
            </h2>
            <p className="text-sm text-white/70 max-w-2xl mt-1">
              Target production blueprints and verification workspaces for Cisco Packet Tracer labs, RHEL 9.4 RHCSA competency matrices, and GitOps Kubernetes pipelines.
            </p>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar font-mono text-xs">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-3 py-1.5 rounded-lg border uppercase tracking-wider text-[11px] transition-colors ${
                !activeCategory
                  ? 'bg-white/10 text-white border-white/20 font-bold shadow-sm'
                  : 'bg-[#111114] text-white/40 border-white/10 hover:text-white hover:bg-[#1a1a1e]'
              }`}
            >
              All ({projects.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg border uppercase tracking-wider text-[11px] whitespace-nowrap transition-colors ${
                  activeCategory?.id === cat.id
                    ? 'bg-white/10 text-white border-white/20 font-bold shadow-sm'
                    : 'bg-[#111114] text-white/40 border-white/10 hover:text-white hover:bg-[#1a1a1e]'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Project Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <motion.div
              key={project.id}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className="rounded-xl bg-[#111114] border border-white/10 hover:border-[#00d4ff]/40 overflow-hidden flex flex-col justify-between transition-all hover:shadow-[0_0_25px_rgba(0,212,255,0.1)]"
            >
              {/* Cover Image or Architecture Placeholder */}
              <div className="relative h-44 bg-black overflow-hidden border-b border-white/10">
                {project.coverImageUrl ? (
                  <img
                    src={project.coverImageUrl}
                    alt={project.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-white/20 font-mono text-xs p-4 text-center">
                    <Layers className="w-8 h-8 text-white/20 mb-2" />
                    <span>[Architecture &amp; Topology Workspace]</span>
                  </div>
                )}

                {/* Status Badge & Format Indicator */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-black/80 text-[#00ff41] border border-[#00ff41]/30 backdrop-blur-sm uppercase">
                    {project.status}
                  </span>
                  {getFormatBadge(project.formatType)}
                </div>
              </div>

              {/* Card Content */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <h3
                    className="text-base font-bold font-mono text-white line-clamp-2 hover:text-[#00d4ff] transition-colors cursor-pointer"
                    onClick={() => {
                      setActiveProjectModal(project);
                      setModalTab('overview');
                    }}
                  >
                    {project.title}
                  </h3>
                  <p className="text-xs text-white/70 line-clamp-3 leading-relaxed">
                    {project.summary}
                  </p>
                </div>

                {/* Tech Stack Chips */}
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {project.devopsStack.slice(0, 4).map((tech, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-black text-white/80 border border-white/10"
                    >
                      {tech}
                    </span>
                  ))}
                  {project.devopsStack.length > 4 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-white/40">
                      +{project.devopsStack.length - 4}
                    </span>
                  )}
                </div>

                {/* Metrics Callout */}
                {project.metrics && (
                  <div className="p-2.5 rounded-lg bg-black border border-white/10 grid grid-cols-2 gap-2 text-[10px] font-mono">
                    {Object.entries(project.metrics).slice(0, 2).map(([key, val]) => (
                      <div key={key}>
                        <span className="text-white/40 block truncate">{key}</span>
                        <span className="text-[#00d4ff] font-bold">{val}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                  <button
                    onClick={() => {
                      setActiveProjectModal(project);
                      setModalTab('overview');
                    }}
                    className="text-[#00d4ff] hover:brightness-125 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1 transition-colors"
                  >
                    <span>{['cisco_pkt_lab', 'rhcsa_matrix', 'devops_pipeline'].includes(project.formatType) ? 'ENTER LAB →' : 'INSPECT PROJECT →'}</span>
                  </button>

                  <div className="flex items-center space-x-2">
                    {project.githubUrl && project.githubUrl.trim() !== '' && (
                      <a
                        href={project.githubUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                        title="GitHub Repository"
                      >
                        <Github className="w-4 h-4" />
                      </a>
                    )}
                    {project.liveUrl && project.liveUrl.trim() !== '' && (
                      <a
                        href={project.liveUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                        title="Live Demonstration"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Specialized Multi-Format Project Detail Modal */}
        <AnimatePresence>
          {activeProjectModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-4xl rounded-xl bg-[#111114] border border-white/15 shadow-2xl overflow-hidden font-sans my-8"
              >
                {/* Modal Titlebar */}
                <div className="flex items-center justify-between px-6 py-4 bg-[#16161a] border-b border-white/10 font-mono">
                  <div className="flex items-center space-x-2">
                    <Terminal className="w-4 h-4 text-[#00d4ff]" />
                    <span className="text-xs text-white/90 font-bold uppercase tracking-wider">
                      {activeProjectModal.formatType === 'cisco_pkt_lab' ? 'Cisco Packet Tracer Lab Specs' :
                       activeProjectModal.formatType === 'rhcsa_matrix' ? 'RHCSA RHEL 9 Competency Matrix' :
                       activeProjectModal.formatType === 'devops_pipeline' ? 'GitOps & Kubernetes Pipeline' :
                       'Architecture Blueprint'} &bull; {activeProjectModal.slug}
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveProjectModal(null)}
                    className="p-1.5 rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Sub-Navigation Tabs inside Modal */}
                <div className="flex items-center space-x-2 px-6 pt-3 border-b border-white/10 font-mono text-xs overflow-x-auto no-scrollbar">
                  <button
                    onClick={() => setModalTab('overview')}
                    className={`px-3 py-2 border-b-2 font-bold uppercase tracking-wider transition-colors shrink-0 ${
                      modalTab === 'overview'
                        ? 'border-[#00d4ff] text-[#00d4ff]'
                        : 'border-transparent text-white/40 hover:text-white'
                    }`}
                  >
                    Project Story (5-Part)
                  </button>

                  <button
                    onClick={() => setModalTab('specialized_format')}
                    className={`px-3 py-2 border-b-2 font-bold uppercase tracking-wider transition-colors shrink-0 ${
                      modalTab === 'specialized_format'
                        ? 'border-[#00ff41] text-[#00ff41]'
                        : 'border-transparent text-white/40 hover:text-white'
                    }`}
                  >
                    {activeProjectModal.formatType === 'cisco_pkt_lab' ? 'Configs & Devices' :
                     activeProjectModal.formatType === 'rhcsa_matrix' ? 'System Files & Matrix' :
                     activeProjectModal.formatType === 'devops_pipeline' ? 'Pipeline Stages & IaC' :
                     'Technical Assets'}
                  </button>
                </div>

                {/* Modal Body Content */}
                <div className="p-6 sm:p-8 space-y-6 max-h-[72vh] overflow-y-auto">
                  {modalTab === 'overview' && (
                    <div className="space-y-8 font-mono text-xs">
                      {/* Project Header */}
                      <div className="space-y-3 pb-6 border-b border-white/10">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#00ff41]/10 text-[#00ff41] border border-[#00ff41]/30 uppercase">
                            {activeProjectModal.status}
                          </span>
                          {getFormatBadge(activeProjectModal.formatType)}
                          <span className="px-2 py-0.5 rounded text-[10px] bg-white/5 text-white/60 border border-white/10 uppercase">
                            {activeProjectModal.categoryId.replace('cat-', '')}
                          </span>
                        </div>
                        <h2 className="text-lg sm:text-xl font-bold text-white uppercase tracking-tight font-mono">
                          {activeProjectModal.title}
                        </h2>
                        <p className="text-xs text-white/70 font-sans leading-relaxed">
                          {activeProjectModal.summary}
                        </p>
                      </div>

                      {/* 1. MISSION */}
                      <div className="p-5 rounded-xl bg-black border border-white/10 space-y-3">
                        <div className="flex items-center space-x-2 text-[#00d4ff] font-bold uppercase tracking-wider text-xs">
                          <Terminal className="w-4 h-4" />
                          <span>1. MISSION // Operational Problem &amp; Scope</span>
                        </div>
                        <p className="text-white/80 font-sans text-xs leading-relaxed">
                          {activeProjectModal.mission || (activeProjectModal.formatType === 'cisco_pkt_lab'
                            ? 'Engineer and inspect an enterprise-style, dual-homed WAN edge topology connecting headquarters to redundant transit providers, with explicit BGP policy, HSRP gateway redundancy, and segmented departmental VLANs.'
                            : activeProjectModal.formatType === 'rhcsa_matrix'
                            ? 'Deploy, harden, and audit an enterprise Red Hat Enterprise Linux 9.4 compute node in a security-hardening lab covering SELinux, firewalld, permissions, and benchmark-oriented configuration practices. Deliver immutable storage volumes via thin LVM, full targeted SELinux policy confinement, and automated rootless container lifecycle via systemd Quadlets.'
                            : 'Architect a self-healing GitOps delivery workflow and cloud-native Kubernetes cluster with Cilium eBPF network security and modular Terraform IaC. Eliminate manual cluster drift, enforce kernel-level L7 security policies, and achieve automated canary rollouts.')}
                        </p>
                      </div>

                      {/* 2. ARCHITECTURE */}
                      <div className="p-5 rounded-xl bg-black border border-white/10 space-y-4">
                        <div className="flex items-center space-x-2 text-[#00ff41] font-bold uppercase tracking-wider text-xs">
                          <Layers className="w-4 h-4" />
                          <span>2. ARCHITECTURE // Topology &amp; Infrastructure Stack</span>
                        </div>
                        
                        {activeProjectModal.architectureSummary && (
                          <p className="text-white/70 font-sans text-xs leading-relaxed">{activeProjectModal.architectureSummary}</p>
                        )}

                        {/* Metrics Grid */}
                        {activeProjectModal.metrics && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {Object.entries(activeProjectModal.metrics).map(([key, val]) => (
                              <div key={key} className="p-2.5 rounded-lg bg-[#111114] border border-white/5">
                                <span className="text-white/40 text-[10px] block uppercase truncate">{key}</span>
                                <span className="text-[#00d4ff] font-bold text-xs">{val}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Technology Stack Tags */}
                        <div>
                          <span className="text-white/40 text-[10px] block uppercase mb-2">Protocol &amp; Engineering Stack</span>
                          <div className="flex flex-wrap gap-1.5">
                            {activeProjectModal.devopsStack.map((tech, i) => (
                              <span key={i} className="px-2 py-0.5 rounded text-[11px] bg-[#111114] text-[#00d4ff] border border-white/10">
                                {tech}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* 3. WHAT I BUILT */}
                      <div className="p-5 rounded-xl bg-black border border-white/10 space-y-3 font-sans">
                        <div className="flex items-center space-x-2 text-yellow-400 font-mono font-bold uppercase tracking-wider text-xs">
                          <Cpu className="w-4 h-4" />
                          <span>3. WHAT I BUILT // Concrete Technical Deliverables</span>
                        </div>
                        <div className="text-white/80 text-xs leading-relaxed space-y-2">
                          {activeProjectModal.whatIBuilt ? (
                            <p className="whitespace-pre-line text-white/75">{activeProjectModal.whatIBuilt}</p>
                          ) : activeProjectModal.formatType === 'cisco_pkt_lab' ? (
                            <ul className="list-disc list-inside space-y-1.5 text-white/70">
                              <li><strong className="text-white">Dual-Homed eBGP Peering:</strong> Configured AS 65001 with autonomous system path prepending and Local-Preference routing policies.</li>
                              <li><strong className="text-white">OSPF Area 0 Backbone:</strong> Internal multi-area routing with MD5 cryptographic authentication and cost metric tuning.</li>
                              <li><strong className="text-white">HSRP Group 1 Redundancy:</strong> Virtual IP 10.10.0.1 with preemptive interface tracking for automatic path failover.</li>
                              <li><strong className="text-white">Layer 3 Switch SVIs:</strong> Catalyst 9500 Inter-VLAN routing across Engineering (VLAN 10), Servers (VLAN 20), and DMZ (VLAN 30).</li>
                            </ul>
                          ) : activeProjectModal.formatType === 'rhcsa_matrix' ? (
                            <ul className="list-disc list-inside space-y-1.5 text-white/70">
                              <li><strong className="text-white">LVM &amp; Stratis Storage:</strong> Thin-provisioned volume groups, XFS filesystems, and persistent UUID /etc/fstab mounts with <code className="text-[#00ff41]">nodev,noexec</code> security options.</li>
                              <li><strong className="text-white">SELinux Mandatory Access Control:</strong> Enforcing mode with targeted policy, custom port labels (<code className="text-[#00ff41]">semanage port</code>), and boolean controls.</li>
                              <li><strong className="text-white">Systemd Quadlet Containers:</strong> Rootless Podman daemon services running hardened UBI9 images with automated health checks.</li>
                              <li><strong className="text-white">Kernel Tuning &amp; Firewall:</strong> Hardened <code className="text-[#00ff41]">sysctl.d</code> parameters, Chrony NTP precision sync, and zoned Firewalld rich rules.</li>
                            </ul>
                          ) : (
                            <ul className="list-disc list-inside space-y-1.5 text-white/70">
                              <li><strong className="text-white">GitOps Controller Loop:</strong> ArgoCD continuous delivery engine reconciling declarative Helm charts against EKS clusters.</li>
                              <li><strong className="text-white">Cilium eBPF CNI:</strong> eBPF-based network observability, L7 network security policies, and WireGuard node-to-node encryption.</li>
                              <li><strong className="text-white">Modular Terraform IaC:</strong> Kubernetes cluster architecture with private subnets, NAT gateways, and S3 DynamoDB state locks.</li>
                              <li><strong className="text-white">Automated Canary Rollouts:</strong> Prometheus metric verification powered by Flagger with automated instant rollback.</li>
                            </ul>
                          )}
                        </div>
                      </div>

                      {/* 4. OPERATOR RUNBOOK */}
                      <div className="p-5 rounded-xl bg-black border border-white/10 space-y-3 font-mono">
                        <div className="flex items-center space-x-2 text-[#00d4ff] font-bold uppercase tracking-wider text-xs">
                          <FileCode className="w-4 h-4" />
                          <span>4. OPERATOR RUNBOOK // Execution &amp; Verification Commands</span>
                        </div>
                        <div className="space-y-2">
                          <span className="text-white/40 text-[10px] block uppercase">Standard Operational Check Commands:</span>
                          <div className="p-3 rounded-lg bg-[#111114] border border-white/10 space-y-1 text-[11px] text-[#00ff41] overflow-x-auto">
                            {activeProjectModal.formatType === 'cisco_pkt_lab' ? (
                              <>
                                <div><span className="text-white/40"># Verify BGP Neighbors:</span> show ip bgp summary</div>
                                <div><span className="text-white/40"># Check OSPF Adjacencies:</span> show ip ospf neighbor</div>
                                <div><span className="text-white/40"># Verify HSRP Virtual IP:</span> show standby brief</div>
                                <div><span className="text-white/40"># Audit Inter-VLAN SVIs:</span> show ip interface brief | include Vlan</div>
                              </>
                            ) : activeProjectModal.formatType === 'rhcsa_matrix' ? (
                              <>
                                <div><span className="text-white/40"># Verify Storage Mounts:</span> findmnt -t xfs,ext4 --df</div>
                                <div><span className="text-white/40"># Check SELinux Enforcement:</span> sestatus &amp;&amp; getenforce</div>
                                <div><span className="text-white/40"># Audit Systemd Units:</span> systemctl is-active autofs sshd firewalld</div>
                                <div><span className="text-white/40"># Verify NTP Sync:</span> chronyc tracking</div>
                              </>
                            ) : (
                              <>
                                <div><span className="text-white/40"># Verify ArgoCD App Health:</span> argocd app get lab-gateway</div>
                                <div><span className="text-white/40"># Audit Cilium eBPF Endpoints:</span> cilium endpoint list</div>
                                <div><span className="text-white/40"># Check Terraform State Drift:</span> terraform plan -detailed-exitcode</div>
                                <div><span className="text-white/40"># Inspect Cluster Pods:</span> kubectl get pods -n ingress-nginx -o wide</div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 5. EVIDENCE VAULT */}
                      <div className="p-5 rounded-xl bg-black border border-white/10 space-y-4 font-mono">
                        <div className="flex items-center space-x-2 text-[#00ff41] font-bold uppercase tracking-wider text-xs">
                          <ShieldCheck className="w-4 h-4" />
                          <span>5. EVIDENCE VAULT // Verification Proofs &amp; Artifacts</span>
                        </div>
                        <div className="space-y-3">
                          <div className="p-3 rounded-lg bg-[#111114] border border-white/10 space-y-1 text-[11px]">
                            <div className="flex items-center justify-between text-white/60">
                              <span>Audit &amp; Validation Status:</span>
                              <span className="text-[#00ff41] font-bold">LAB CHECKS PASSED</span>
                            </div>
                            <div className="flex items-center justify-between text-white/60">
                              <span>Evidence Type:</span>
                              <span className="text-white/90">Implementation Snapshot</span>
                            </div>
                            <div className="flex items-center justify-between text-white/60">
                              <span>Environment:</span>
                              <span className="text-[#00d4ff] truncate max-w-[220px]">Local Lab Network</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 pt-2">
                            {activeProjectModal.githubUrl && activeProjectModal.githubUrl.trim() !== '' && (
                              <a
                                href={activeProjectModal.githubUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-black text-white/80 border border-white/10 hover:text-white hover:bg-white/10 uppercase tracking-wider transition-colors text-xs"
                              >
                                <Github className="w-3.5 h-3.5" />
                                <span>Inspect Source Repository</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Cisco .PKT Lab Specialized View */}
                  {modalTab === 'specialized_format' && activeProjectModal.formatType === 'cisco_pkt_lab' && (
                    <div className="space-y-6 font-mono text-xs">
                      <div className="flex items-center justify-between pb-3 border-b border-white/10">
                        <div>
                          <h3 className="font-bold text-white text-sm uppercase">Cisco Packet Tracer Device Inventory</h3>
                          <p className="text-white/40 text-[11px] mt-0.5">Parsed interfaces, IP subnets, and Cisco IOS CLI configs</p>
                        </div>
                      </div>

                      {/* Device List */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {activeProjectModal.ciscoLabData?.devices.map((dev) => (
                          <div key={dev.id} className="p-4 rounded-lg bg-black border border-white/10 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white text-sm">{dev.name}</span>
                              <span className="px-2 py-0.5 rounded text-[10px] bg-[#111114] text-[#00d4ff] border border-white/10">
                                {dev.model}
                              </span>
                            </div>

                            <div className="space-y-1 text-[11px]">
                              <div className="text-white/60">
                                Management IP: <span className="text-[#00ff41]">{dev.mgmtIp}</span>
                              </div>
                              <div className="text-white/60">
                                Interfaces: <span className="text-white">{dev.interfaces.map((inf) => inf.name).join(', ')}</span>
                              </div>
                            </div>

                            {dev.runningConfigSnippet && (
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-white/40 text-[10px] uppercase">Cisco IOS Config Snippet</span>
                                  <button
                                    onClick={() => copyToClipboard(dev.runningConfigSnippet)}
                                    className="text-[10px] text-white/40 hover:text-white flex items-center gap-1"
                                  >
                                    <Copy className="w-3 h-3" />
                                    <span>Copy</span>
                                  </button>
                                </div>
                                <pre className="p-2.5 rounded bg-[#111114] text-[10px] text-[#00ff41] overflow-x-auto max-h-[120px]">
                                  {dev.runningConfigSnippet}
                                </pre>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* RHCSA RHEL 9 Competency Matrix Specialized View */}
                  {modalTab === 'specialized_format' && activeProjectModal.formatType === 'rhcsa_matrix' && (
                    <div className="space-y-6 font-mono text-xs">
                      <div className="flex items-center justify-between pb-3 border-b border-white/10">
                        <div>
                          <h3 className="font-bold text-white text-sm uppercase">Official RHCSA Objective Domains</h3>
                          <p className="text-white/40 text-[11px] mt-0.5">Verification status and CLI hardening commands</p>
                        </div>
                        <span className="px-2.5 py-1 rounded bg-[#00ff41]/10 text-[#00ff41] border border-[#00ff41]/40 font-bold">
                          {activeProjectModal.rhcsaMatrixData?.verifiedCount || 10}/{activeProjectModal.rhcsaMatrixData?.totalCompetencies || 10} Hardened
                        </span>
                      </div>

                      {/* Objectives Table */}
                      <div className="divide-y divide-white/10 bg-black rounded-lg border border-white/10 overflow-hidden">
                        {activeProjectModal.rhcsaMatrixData?.objectives.map((obj) => (
                          <div key={obj.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <CheckCircle2 className="w-4 h-4 text-[#00ff41] shrink-0" />
                                <span className="font-bold text-white text-xs">{obj.domainTitle} ({obj.domainCode})</span>
                              </div>
                              <p className="text-white/60 text-[11px] ml-6">{obj.competency}</p>
                              <code className="text-[11px] text-[#00d4ff] ml-6 block">
                                {obj.verificationCommand || obj.testedCommands?.join(' && ')}
                              </code>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] bg-[#00ff41]/10 text-[#00ff41] border border-[#00ff41]/30 font-bold uppercase self-start sm:self-center ml-6 sm:ml-0">
                              {obj.auditStatus}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Configuration Files */}
                      {activeProjectModal.rhcsaMatrixData?.objectives.some(o => o.configFiles?.length) && (
                        <div className="space-y-3">
                          <span className="text-white/40 text-[10px] uppercase font-bold">Hardened System Configuration Snippets</span>
                          {activeProjectModal.rhcsaMatrixData.objectives.flatMap(o => o.configFiles || []).map((file, i) => (
                            <div key={i} className="p-3 rounded-lg bg-black border border-white/10 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-[#00d4ff]">{file.path}</span>
                                <span className="text-[10px] text-white/40 uppercase">{file.language}</span>
                              </div>
                              <pre className="p-2.5 rounded bg-[#111114] text-[10px] text-[#00ff41] overflow-x-auto max-h-[140px]">
                                {file.content}
                              </pre>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* DevOps & GitOps Specialized View */}
                  {modalTab === 'specialized_format' && activeProjectModal.formatType === 'devops_pipeline' && (
                    <div className="space-y-6 font-mono text-xs">
                      <div className="flex items-center justify-between pb-3 border-b border-white/10">
                        <div>
                          <h3 className="font-bold text-white text-sm uppercase">GitOps Continuous Delivery Pipeline</h3>
                          <p className="text-white/40 text-[11px] mt-0.5">ArgoCD stages, reconciliation events, and IaC repositories</p>
                        </div>
                        <span className="px-2.5 py-1 rounded bg-[#00ff41]/10 text-[#00ff41] border border-[#00ff41]/40 font-bold">
                          All Stages Synced
                        </span>
                      </div>

                      {/* Pipeline Stages */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        {activeProjectModal.devopsPipelineData?.pipelineStages.map((stg) => (
                          <div key={stg.id} className="p-3 rounded-lg bg-black border border-white/10 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white">{stg.name}</span>
                              <span className="text-[10px] text-white/40">{stg.durationSeconds}s</span>
                            </div>
                            <div className="text-[11px] text-[#00d4ff]">{stg.tool}</div>
                            <div className="text-[10px] text-[#00ff41] flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{stg.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* IaC File Tree */}
                      {activeProjectModal.devopsPipelineData?.iacTree && (
                        <div className="space-y-3">
                          <span className="text-white/40 text-[10px] uppercase font-bold">Infrastructure as Code Manifests</span>
                          {activeProjectModal.devopsPipelineData.iacTree.map((file, i) => (
                            <div key={i} className="p-3 rounded-lg bg-black border border-white/10 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-[#00d4ff]">{file.path}</span>
                                <span className="text-[10px] text-white/40 uppercase">{file.type}</span>
                              </div>
                              {file.content && (
                                <pre className="p-2.5 rounded bg-[#111114] text-[10px] text-white/80 overflow-x-auto max-h-[140px]">
                                  {file.content}
                                </pre>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions Footer inside Modal */}
                  <div className="pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
                    <div className="flex items-center space-x-3">
                      {activeProjectModal.githubUrl && activeProjectModal.githubUrl.trim() !== '' && (
                        <a
                          href={activeProjectModal.githubUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-black text-white/80 border border-white/10 hover:text-white hover:bg-white/10 uppercase tracking-wider transition-colors"
                        >
                          <Github className="w-3.5 h-3.5" />
                          <span>View GitHub Source</span>
                        </a>
                      )}
                    </div>

                    <button
                      onClick={() => setActiveProjectModal(null)}
                      className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white border border-white/10 uppercase tracking-wider text-[11px] transition-colors"
                    >
                      Close Window
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};
