import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  GitBranch,
  Play,
  CheckCircle2,
  AlertTriangle,
  Server,
  Box,
  Layers,
  Cpu,
  Terminal,
  Activity,
  ShieldAlert,
  Cloud,
  FileCode,
  Sparkles,
} from 'lucide-react';

interface PipelineStage {
  id: string;
  name: string;
  tool: string;
  status: 'IDLE' | 'RUNNING' | 'SUCCESS' | 'FAILED';
  duration: string;
  logSummary: string;
}

export const DevOpsPipelineVisualizer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'k8s' | 'terraform'>('pipeline');
  const [isRunning, setIsRunning] = useState(false);
  const [activeStageIdx, setActiveStageIdx] = useState<number>(5); // default completed
  const [selectedStage, setSelectedStage] = useState<PipelineStage | null>(null);

  const [stages, setStages] = useState<PipelineStage[]>([
    {
      id: 'stg-1',
      name: 'Source & Git Hook',
      tool: 'GitHub Actions',
      status: 'SUCCESS',
      duration: '4s',
      logSummary: 'Commit a49f82c validated. Branch: main. Triggered by Sahil K Gupta.',
    },
    {
      id: 'stg-2',
      name: 'Security & SAST Audit',
      tool: 'Trivy & SonarQube',
      status: 'SUCCESS',
      duration: '18s',
      logSummary: 'LAB SECURITY SCAN SNAPSHOT: Base images passed policy evaluation.',
    },
    {
      id: 'stg-3',
      name: 'Terraform IaC Plan',
      tool: 'HashiCorp Terraform',
      status: 'SUCCESS',
      duration: '22s',
      logSummary: 'S3 state lock acquired. Plan: 0 to add, 1 to change (Cilium CNI rules), 0 to destroy.',
    },
    {
      id: 'stg-4',
      name: 'OCI Container Build',
      tool: 'Docker BuildKit',
      status: 'SUCCESS',
      duration: '35s',
      logSummary: 'Multi-stage alpine build cached. Container image produced by the lab pipeline replay.',
    },
    {
      id: 'stg-5',
      name: 'GitOps Continuous Sync',
      tool: 'ArgoCD v2.11',
      status: 'SUCCESS',
      duration: '14s',
      logSummary: 'Synced commit HEAD to lab namespace. Healthy / Synced (0 out-of-sync).',
    },
    {
      id: 'stg-6',
      name: 'Canary & eBPF Telemetry',
      tool: 'Cilium & Prometheus',
      status: 'SUCCESS',
      duration: '12s',
      logSummary: 'CILIUM FLOW TELEMETRY SNAPSHOT: Automated canary promotion approved.',
    },
  ]);

  const triggerPipeline = async () => {
    setIsRunning(true);
    setActiveStageIdx(0);

    const updated = stages.map((s) => ({ ...s, status: 'IDLE' as const }));
    setStages(updated);

    for (let i = 0; i < stages.length; i++) {
      setActiveStageIdx(i);
      setStages((prev) =>
        prev.map((stg, idx) =>
          idx === i ? { ...stg, status: 'RUNNING' } : idx < i ? { ...stg, status: 'SUCCESS' } : stg
        )
      );
      await new Promise((r) => setTimeout(r, 700));
    }

    setStages((prev) => prev.map((s) => ({ ...s, status: 'SUCCESS' })));
    setIsRunning(false);
  };

  return (
    <section id="devops-pipeline-section" className="py-14 border-b border-white/10 bg-[#0a0a0c]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded text-[10px] font-mono bg-black/60 text-[#00ff41] border border-white/10 uppercase tracking-widest mb-2">
              <GitBranch className="w-3.5 h-3.5 text-[#00ff41]" />
              <span>GITOPS CI/CD &amp; KUBERNETES LAB</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight uppercase">
              GitOps CI/CD &amp; Kubernetes Mesh Visualizer
            </h2>
            <p className="text-sm text-white/60 max-w-2xl mt-1">
              Cloud-native delivery lab showing the path from source control through security checks, infrastructure planning, GitOps reconciliation and Kubernetes runtime.
            </p>
          </div>

          {/* View Toggles */}
          <div className="flex items-center p-1 rounded-lg bg-black/50 border border-white/10 font-mono text-xs">
            <button
              onClick={() => setActiveTab('pipeline')}
              className={`px-3 py-1.5 rounded-md uppercase tracking-wider text-[11px] transition-colors ${
                activeTab === 'pipeline'
                  ? 'bg-white/10 border border-white/15 text-white font-bold shadow-sm'
                  : 'text-white/40 hover:text-white/80'
              }`}
            >
              Pipeline Matrix
            </button>
            <button
              onClick={() => setActiveTab('k8s')}
              className={`px-3 py-1.5 rounded-md uppercase tracking-wider text-[11px] transition-colors ${
                activeTab === 'k8s'
                  ? 'bg-white/10 border border-white/15 text-white font-bold shadow-sm'
                  : 'text-white/40 hover:text-white/80'
              }`}
            >
              K8s Cluster State
            </button>
            <button
              onClick={() => setActiveTab('terraform')}
              className={`px-3 py-1.5 rounded-md uppercase tracking-wider text-[11px] transition-colors ${
                activeTab === 'terraform'
                  ? 'bg-white/10 border border-white/15 text-white font-bold shadow-sm'
                  : 'text-white/40 hover:text-white/80'
              }`}
            >
              Terraform HCL
            </button>
          </div>
        </div>

        {/* Tab 1: CI/CD Pipeline Flow */}
        {activeTab === 'pipeline' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-xl bg-[#111114] border border-white/10 flex-wrap gap-3 font-mono text-xs">
              <div className="flex items-center space-x-3">
                <span className="flex items-center gap-1.5 text-white/80">
                  <span className="w-2 h-2 rounded-full bg-[#00ff41] shadow-[0_0_8px_#00ff41]" />
                  Branch: <span className="text-white font-bold">main</span>
                </span>
                <span className="text-white/20">&bull;</span>
                <span className="text-white/40">
                  Latest Commit: <code className="text-[#00d4ff]">a49f82c</code> (Zero-Trust mTLS Policy update)
                </span>
              </div>

              <button
                onClick={triggerPipeline}
                disabled={isRunning}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#00ff41] hover:brightness-110 disabled:opacity-50 text-black font-bold uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(0,255,65,0.15)]"
              >
                <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
                <span>{isRunning ? 'Replaying Automated Loop...' : 'REPLAY PIPELINE RUN'}</span>
              </button>
            </div>

            {/* Pipeline Stage Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
              {stages.map((stg, idx) => {
                const isSelected = selectedStage?.id === stg.id;
                const isCurrent = idx === activeStageIdx && isRunning;

                return (
                  <motion.div
                    key={stg.id}
                    onClick={() => setSelectedStage(stg)}
                    whileHover={{ scale: 1.02 }}
                    className={`cursor-pointer rounded-xl p-4 border transition-all flex flex-col justify-between font-mono text-xs ${
                      isSelected
                        ? 'bg-[#111114] border-[#00d4ff] ring-1 ring-[#00d4ff] shadow-[0_0_15px_rgba(0,212,255,0.2)]'
                        : isCurrent
                        ? 'bg-[#111114] border-[#00ff41] ring-1 ring-[#00ff41] shadow-[0_0_15px_rgba(0,255,65,0.2)] animate-pulse'
                        : stg.status === 'SUCCESS'
                        ? 'bg-[#111114] border-white/10 hover:border-white/20'
                        : 'bg-black border-white/5 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">
                          Stage {idx + 1}
                        </span>
                        {stg.status === 'SUCCESS' ? (
                          <CheckCircle2 className="w-4 h-4 text-[#00ff41]" />
                        ) : stg.status === 'RUNNING' ? (
                          <Activity className="w-4 h-4 text-[#00d4ff] animate-spin" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-white/20" />
                        )}
                      </div>
                      <h4 className="font-bold text-white text-sm">{stg.name}</h4>
                      <p className="text-[11px] text-[#00d4ff] mt-1">{stg.tool}</p>
                    </div>

                    <div className="mt-4 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-white/40">
                      <span>{stg.duration}</span>
                      <span className={stg.status === 'SUCCESS' ? 'text-[#00ff41] font-bold' : 'text-white/40'}>
                        {stg.status}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Stage Log Viewer */}
            <div className="p-4 rounded-xl bg-black border border-white/10 font-mono text-xs space-y-2 shadow-2xl">
              <div className="flex items-center justify-between text-white/40 pb-2 border-b border-white/10">
                <span className="flex items-center gap-1.5 text-white/80">
                  <Terminal className="w-4 h-4 text-[#00ff41]" />
                  Stage Audit Log Stream &bull;{' '}
                  <span className="text-[#00d4ff] font-bold">{selectedStage?.name || 'Full Run Summary'}</span>
                </span>
                <span className="text-[11px] text-[#00ff41] font-bold">Exit Code: 0 (PASSED)</span>
              </div>
              <pre className="text-[#00ff41] text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap p-2">
                {selectedStage
                  ? `[${selectedStage.tool}] Executing stage: ${selectedStage.name}\n${selectedStage.logSummary}\n✔ Stage verified with 0 regressions.`
                  : `[GitOps Runner] Pipeline finished successfully across all 6 stages.\n- Image security: Lab security scan stage completed.\n- ArgoCD: Target revision a49f82c synced to cluster target.\n- Cilium eBPF: Network flow observation established on Layer 7 ingress.`}
              </pre>
            </div>
          </div>
        )}

        {/* Tab 2: Kubernetes Cluster State */}
        {activeTab === 'k8s' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-mono text-xs">
            <div className="lg:col-span-8 rounded-xl bg-[#111114] border border-white/10 p-5 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center space-x-2">
                  <Server className="w-4 h-4 text-[#00d4ff]" />
                  <h3 className="font-bold text-white text-sm uppercase tracking-wider">Cluster Node Pool (v1.30.2+k3s1)</h3>
                </div>
                <span className="text-[#00ff41] font-bold">4/4 Nodes Ready</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { name: 'k8s-control-01', role: 'Control Plane / etcd', cpu: '18%', mem: '4.2GB / 16GB', ip: '192.168.10.10' },
                  { name: 'k8s-worker-01', role: 'Worker (App Workloads)', cpu: '34%', mem: '11.8GB / 32GB', ip: '192.168.10.11' },
                  { name: 'k8s-worker-02', role: 'Worker (Vault & Security)', cpu: '22%', mem: '8.4GB / 32GB', ip: '192.168.10.12' },
                  { name: 'k8s-worker-03', role: 'Worker (Observability)', cpu: '41%', mem: '14.1GB / 32GB', ip: '192.168.10.13' },
                ].map((node, i) => (
                  <div key={i} className="p-3.5 rounded-lg bg-black/60 border border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{node.name}</span>
                      <span className="w-2 h-2 rounded-full bg-[#00ff41] shadow-[0_0_8px_#00ff41]" />
                    </div>
                    <p className="text-[11px] text-[#00d4ff]">{node.role}</p>
                    <div className="flex items-center justify-between text-[10px] text-white/40 pt-1 border-t border-white/5">
                      <span>CPU: {node.cpu}</span>
                      <span>RAM: {node.mem}</span>
                      <span>{node.ip}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-4 rounded-xl bg-[#111114] border border-white/10 p-5 space-y-4 shadow-2xl">
              <div className="flex items-center space-x-2 pb-3 border-b border-white/10">
                <Box className="w-4 h-4 text-[#00ff41]" />
                <h3 className="font-bold text-white text-sm uppercase tracking-wider">Active Namespaces &amp; Pods</h3>
              </div>

              <div className="space-y-2.5 text-[11px]">
                <div className="p-2.5 rounded bg-black/60 border border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-white font-bold block">cilium-ebpf-agent</span>
                    <span className="text-white/40">DaemonSet &bull; kube-system</span>
                  </div>
                  <span className="text-[#00ff41] font-semibold">4/4 Running</span>
                </div>

                <div className="p-2.5 rounded bg-black/60 border border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-white font-bold block">vault-cluster-ha</span>
                    <span className="text-white/40">StatefulSet &bull; security</span>
                  </div>
                  <span className="text-[#00ff41] font-semibold">3/3 Active</span>
                </div>

                <div className="p-2.5 rounded bg-black/60 border border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-white font-bold block">argocd-server</span>
                    <span className="text-white/40">Deployment &bull; argocd</span>
                  </div>
                  <span className="text-[#00ff41] font-semibold">2/2 Healthy</span>
                </div>

                <div className="p-2.5 rounded bg-black/60 border border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-white font-bold block">prometheus-operator</span>
                    <span className="text-white/40">Deployment &bull; monitoring</span>
                  </div>
                  <span className="text-[#00ff41] font-semibold">1/1 Active</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Terraform HCL */}
        {activeTab === 'terraform' && (
          <div className="p-5 rounded-xl bg-black border border-white/10 font-mono text-xs space-y-3 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="text-white font-bold flex items-center gap-2">
                <FileCode className="w-4 h-4 text-[#00d4ff]" />
                infrastructure/terraform/modules/cilium_ebpf/main.tf
              </span>
              <span className="text-white/40">Terraform v1.8.4 &bull; AWS Provider v5.45</span>
            </div>
            <pre className="text-[#00ff41] text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap p-2">
{`resource "helm_release" "cilium" {
  name       = "cilium"
  repository = "https://helm.cilium.io/"
  chart      = "cilium"
  version    = "1.16.0"
  namespace  = "kube-system"

  set {
    name  = "kubeProxyReplacement"
    value = "true"
  }
  set {
    name  = "bpf.masquerade"
    value = "true"
  }
  set {
    name  = "bgpControlPlane.enabled"
    value = "true"
  }
  set {
    name  = "securityLabels.enabled"
    value = "true"
  }
}`}
            </pre>
          </div>
        )}
      </div>
    </section>
  );
};
