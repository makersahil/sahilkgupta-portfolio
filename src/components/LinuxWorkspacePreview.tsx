import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Terminal,
  ShieldCheck,
  HardDrive,
  Network,
  Activity,
  Layers,
  CheckCircle2,
  Copy,
  Check,
  FileCode,
  Server,
  Cpu,
  Lock,
  Boxes,
  ScrollText,
} from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext.js';

type LinuxArea = 'services' | 'storage' | 'selinux' | 'network' | 'logs';

export const LinuxWorkspacePreview: React.FC = () => {
  const { showToast, setIsTerminalOpen } = usePortfolio();
  const [activeArea, setActiveArea] = useState<LinuxArea>('storage');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyCode = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast('Configuration snippet copied to clipboard', 'info');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const areas: Array<{ id: LinuxArea; label: string; icon: any; summary: string }> = [
    {
      id: 'storage',
      label: 'LVM & Storage',
      icon: HardDrive,
      summary: 'Thin-provisioned LVM pools, XFS filesystems, & /etc/fstab UUID mount hardening',
    },
    {
      id: 'services',
      label: 'Systemd Units',
      icon: Cpu,
      summary: 'Custom systemd service sandboxing, restart policies, & multi-user boot targets',
    },
    {
      id: 'selinux',
      label: 'SELinux & Firewalld',
      icon: ShieldCheck,
      summary: 'Enforcing mode, semanage custom port bindings, booleans, & firewalld rich rules',
    },
    {
      id: 'network',
      label: 'Network & Podman',
      icon: Network,
      summary: 'NetworkManager team/bond interfaces, VLAN tagging, & rootless Podman containers',
    },
    {
      id: 'logs',
      label: 'Audit & Journald',
      icon: ScrollText,
      summary: 'Persistent journalctl logs, auditd rules for /etc/shadow monitoring, & Chrony NTP',
    },
  ];

  return (
    <section id="linux-workspace-section" className="py-12 border-b border-white/10 bg-[#0a0a0c]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded text-[10px] font-mono bg-black/60 text-[#00ff41] border border-white/10 uppercase tracking-widest mb-2">
              <Terminal className="w-3.5 h-3.5 text-[#00ff41]" />
              <span>RHEL 9 Administration &bull; Systems Lab State</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight uppercase">
              RHEL Systems Console Lab
            </h2>
            <p className="text-sm text-white/70 max-w-2xl mt-1">
              Inspect hardened Red Hat Enterprise Linux 9 infrastructure snapshots: storage partitioning, systemd daemon configurations, SELinux policies, and operational audit logs.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsTerminalOpen(true)}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-[#111114] hover:bg-[#1a1a1e] text-white border border-[#00ff41]/40 text-xs font-mono uppercase tracking-wider transition-colors shadow-[0_0_15px_rgba(0,255,65,0.15)]"
            >
              <Terminal className="w-3.5 h-3.5 text-[#00ff41]" />
              <span>Launch Linux Shell</span>
            </button>
          </div>
        </div>

        {/* Host Status Badge Bar */}
        <div className="p-4 rounded-xl bg-[#111114] border border-white/10 mb-6 font-mono text-xs shadow-xl">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="space-y-0.5">
              <span className="text-[10px] text-white/40 uppercase tracking-wider block">Host Node</span>
              <span className="text-white font-bold">RHEL9-LAB-01</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-white/40 uppercase tracking-wider block">OS Release</span>
              <span className="text-[#00ff41] font-bold">RHEL 9.4</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-white/40 uppercase tracking-wider block">Kernel</span>
              <span className="text-white/80">5.14.0-362.el9</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-white/40 uppercase tracking-wider block">SELinux State</span>
              <span className="text-[#00ff41] font-bold">Enforcing</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-white/40 uppercase tracking-wider block">NTP / Chrony</span>
              <span className="text-[#00d4ff] font-bold">Synchronized</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-white/40 uppercase tracking-wider block">Lab Mode</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00ff41] animate-pulse" />
                Verified
              </span>
            </div>
          </div>
        </div>

        {/* Interactive Area Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-6 font-mono text-xs">
          {areas.map((area) => {
            const Icon = area.icon;
            const isActive = activeArea === area.id;

            return (
              <button
                key={area.id}
                onClick={() => setActiveArea(area.id)}
                className={`p-3 rounded-lg border transition-all text-left flex flex-col justify-between ${
                  isActive
                    ? 'bg-[#111114] border-[#00ff41] ring-1 ring-[#00ff41]/50 text-white shadow-[0_0_15px_rgba(0,255,65,0.1)]'
                    : 'bg-black/60 border-white/10 text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#00ff41]' : 'text-white/40'}`} />
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#00ff41]" />}
                </div>
                <span className="font-bold uppercase tracking-wider text-xs block">{area.label}</span>
              </button>
            );
          })}
        </div>

        {/* Selected Area Content Panel */}
        <div className="rounded-xl bg-[#111114] border border-white/10 overflow-hidden font-mono text-xs shadow-2xl">
          {/* Panel Top Title */}
          <div className="px-6 py-4 bg-[#16161a] border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-[#00ff41]" />
              <span className="font-bold text-white uppercase tracking-wider">
                {areas.find((a) => a.id === activeArea)?.summary}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] bg-black text-[#00ff41] border border-[#00ff41]/30 uppercase font-bold">
              Configuration Snapshot
            </span>
          </div>

          {/* Area 1: LVM & Storage */}
          {activeArea === 'storage' && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* LVM Logical Volumes Status */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white/40 uppercase tracking-wider font-bold text-[10px]">
                      LVM Storage Topology (# lsblk &amp; lvs)
                    </span>
                  </div>
                  <pre className="p-3.5 rounded-lg bg-black border border-white/10 text-[#00ff41] text-[11px] overflow-x-auto leading-relaxed">
{`NAME                    MAJ:MIN RM  SIZE RO TYPE MOUNTPOINTS
sda                       8:0    0  200G  0 disk 
├─sda1                    8:1    0    1G  0 part /boot
└─sda2                    8:2    0  199G  0 part 
  └─rhel-root           253:0    0   70G  0 lvm  /
nvme0n1                 259:0    0  500G  0 disk 
└─vg_prod-pool_prod_tdata 253:1 0  400G  0 lvm  
  ├─vg_prod-lv_database 253:2    0  250G  0 lvm  /var/lib/pgsql
  └─vg_prod-lv_audit    253:3    0   50G  0 lvm  /var/log/audit`}
                  </pre>
                  <p className="text-[11px] text-white/60 font-sans">
                    Thin-provisioned storage pool on NVMe block device with dynamic metadata sizing and XFS runtime filesystem extensions.
                  </p>
                </div>

                {/* Hardened /etc/fstab */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white/40 uppercase tracking-wider font-bold text-[10px]">
                      Hardened Filesystem Table (/etc/fstab)
                    </span>
                    <button
                      onClick={() =>
                        copyCode(
                          'fstab',
                          `# /etc/fstab: Hardened Enterprise Mounts
UUID=3f92b704-58a1-41db-8c70-ea8d3b519001  /var/lib/pgsql  xfs  defaults,nodev,nosuid  0 0
UUID=7c81a293-19b4-4e2a-9921-9921b8f10022  /var/log/audit  xfs  defaults,nodev,noexec,nosuid  0 0
UUID=4e8a9112-9981-42ab-b712-aa0182910034  /tmp            xfs  defaults,nodev,nosuid,noexec  0 0`
                        )
                      }
                      className="text-[10px] text-white/40 hover:text-white flex items-center gap-1"
                    >
                      {copiedKey === 'fstab' ? <Check className="w-3 h-3 text-[#00ff41]" /> : <Copy className="w-3 h-3" />}
                      <span>Copy</span>
                    </button>
                  </div>
                  <pre className="p-3.5 rounded-lg bg-black border border-white/10 text-white/90 text-[11px] overflow-x-auto leading-relaxed">
{`# /etc/fstab: Hardened Enterprise Mounts (UUIDs)
UUID=3f92b704-58a1-41db-8c70-ea8d3b519001  /var/lib/pgsql  xfs  defaults,nodev,nosuid  0 0
UUID=7c81a293-19b4-4e2a-9921-9921b8f10022  /var/log/audit  xfs  defaults,nodev,noexec,nosuid  0 0
UUID=4e8a9112-9981-42ab-b712-aa0182910034  /tmp            xfs  defaults,nodev,nosuid,noexec  0 0`}
                  </pre>
                  <p className="text-[11px] text-white/60 font-sans">
                    Mount flags enforce <code className="text-[#00d4ff]">nodev,nosuid,noexec</code> security standards preventing binary execution from untrusted partitions.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Area 2: Systemd Units */}
          {activeArea === 'services' && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <span className="text-white/40 uppercase tracking-wider font-bold text-[10px] block">
                    Sandboxed Systemd Unit (/etc/systemd/system/app-gateway.service)
                  </span>
                  <pre className="p-3.5 rounded-lg bg-black border border-white/10 text-[#00ff41] text-[11px] overflow-x-auto leading-relaxed">
{`[Unit]
Description=Enterprise Secure API Gateway
After=network.target network-online.target firewalld.service
Wants=network-online.target

[Service]
Type=notify
ExecStart=/usr/local/bin/gateway-daemon --config=/etc/gateway/prod.yaml
Restart=on-failure
RestartSec=5s

# Security Sandboxing & Hardening
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
NoNewPrivileges=true
ProtectKernelTunables=true
ProtectControlGroups=true
CapabilityBoundingSet=CAP_NET_BIND_SERVICE
AmbientCapabilities=CAP_NET_BIND_SERVICE

[Install]
WantedBy=multi-user.target`}
                  </pre>
                </div>

                <div className="space-y-3">
                  <span className="text-white/40 uppercase tracking-wider font-bold text-[10px] block">
                    Service Verification Output (# systemctl status app-gateway)
                  </span>
                  <pre className="p-3.5 rounded-lg bg-black border border-white/10 text-white/90 text-[11px] overflow-x-auto leading-relaxed">
{`● app-gateway.service - Enterprise Secure API Gateway
     Loaded: loaded (/etc/systemd/system/app-gateway.service; enabled; preset: disabled)
     Active: active (running) since Wed 2026-08-12 09:14:22 UTC; 2 days ago
   Main PID: 4892 (gateway-daemon)
      Tasks: 8 (limit: 18942)
     Memory: 42.4M (limit: 512.0M)
        CPU: 1min 14.829s
     CGroup: /system.slice/app-gateway.service
             └─4892 /usr/local/bin/gateway-daemon --config=/etc/gateway/prod.yaml

Aug 12 09:14:22 RHEL9-LAB-01 systemd[1]: Started app-gateway.service.
Aug 12 09:14:23 RHEL9-LAB-01 gateway-daemon[4892]: [INFO] TLS 1.3 listener bound to 0.0.0.0:8443`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Area 3: SELinux & Firewalld */}
          {activeArea === 'selinux' && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <span className="text-white/40 uppercase tracking-wider font-bold text-[10px] block">
                    SELinux Policy Contexts &amp; Port Bindings
                  </span>
                  <pre className="p-3.5 rounded-lg bg-black border border-white/10 text-[#00ff41] text-[11px] overflow-x-auto leading-relaxed">
{`# 1. Audit SELinux Status
# sestatus
SELinux status:                 enabled
SELinuxfs mount:                /sys/fs/selinux
SELinux root directory:         /etc/selinux
Loaded policy name:             targeted
Current mode:                   enforcing
Mode from config file:          enforcing

# 2. Custom Port Binding Policy
# semanage port -a -t http_port_t -p tcp 8443
# semanage port -l | grep http_port_t
http_port_t                    tcp      8443, 80, 81, 443, 488, 8008, 8009, 8443

# 3. Persistent File Context Rule
# semanage fcontext -a -t httpd_sys_content_t "/var/www/gateway(/.*)?"
# restorecon -Rv /var/www/gateway`}
                  </pre>
                </div>

                <div className="space-y-3">
                  <span className="text-white/40 uppercase tracking-wider font-bold text-[10px] block">
                    Firewalld Active Zones &amp; Rich Rules
                  </span>
                  <pre className="p-3.5 rounded-lg bg-black border border-white/10 text-white/90 text-[11px] overflow-x-auto leading-relaxed">
{`# firewall-cmd --zone=dmz --list-all
dmz (active)
  target: default
  icmp-block-inversion: no
  interfaces: ens224
  sources: 
  services: ssh
  ports: 8443/tcp
  protocols: 
  forward: yes
  masquerade: no
  forward-ports: 
  source-ports: 
  icmp-blocks: 
  rich rules: 
    rule family="ipv4" source address="10.10.10.0/24" port port="8443" protocol="tcp" accept
    rule family="ipv4" source address="192.168.1.0/24" drop`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Area 4: Network & Podman */}
          {activeArea === 'network' && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <span className="text-white/40 uppercase tracking-wider font-bold text-[10px] block">
                    NetworkManager VLAN &amp; Teaming Configuration
                  </span>
                  <pre className="p-3.5 rounded-lg bg-black border border-white/10 text-[#00ff41] text-[11px] overflow-x-auto leading-relaxed">
{`# nmcli connection show
NAME                UUID                                  TYPE      DEVICE  
team0               4a1829a1-5b21-41db-9012-ea8d3b519001  team      team0   
team0.20 (VLAN 20)  7b92c102-12a4-4e2a-8819-9921b8f10022  vlan      team0.20
team0-port1         8c01d992-9981-42ab-b712-aa0182910034  ethernet  ens192  
team0-port2         9d12e883-1192-43bc-c823-bb1293021145  ethernet  ens224  

# nmcli connection show team0.20 | grep -E "ipv4.addresses|ipv4.gateway"
ipv4.addresses:                         10.10.20.15/24
ipv4.gateway:                           10.10.20.1`}
                  </pre>
                </div>

                <div className="space-y-3">
                  <span className="text-white/40 uppercase tracking-wider font-bold text-[10px] block">
                    Rootless Podman Quadlet Container Spec (/etc/containers/systemd/redis.container)
                  </span>
                  <pre className="p-3.5 rounded-lg bg-black border border-white/10 text-white/90 text-[11px] overflow-x-auto leading-relaxed">
{`[Unit]
Description=Rootless Redis Cache Container
After=network-online.target

[Container]
Image=registry.access.redhat.com/rhel9/redis-6:latest
ContainerName=redis-prod
PublishPort=6379:6379
Volume=/var/lib/redis/data:/var/lib/redis/data:Z
SecurityLabelType=container_t
UserNS=auto

[Service]
Restart=always

[Install]
WantedBy=default.target`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Area 5: Logs & Audit */}
          {activeArea === 'logs' && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <span className="text-white/40 uppercase tracking-wider font-bold text-[10px] block">
                    Auditd File Integrity Rule &amp; Verification (# ausearch)
                  </span>
                  <pre className="p-3.5 rounded-lg bg-black border border-white/10 text-[#00ff41] text-[11px] overflow-x-auto leading-relaxed">
{`# 1. Audit Rule in /etc/audit/rules.d/audit.rules
-w /etc/shadow -p wa -k shadow_modification
-w /etc/sudoers -p wa -k sudoers_modification

# 2. Query Audit Log for Modifications
# ausearch -k shadow_modification --raw
type=CONFIG_CHANGE msg=audit(1723459200.104:482): auid=1000 ses=2 op=updated_rules path="/etc/shadow" key="shadow_modification" list=4 res=1
type=SYSCALL msg=audit(1723459210.312:483): arch=c000003e syscall=257 success=yes exit=3 a0=ffffff9c a1=7ffd9421 a2=80000 exe="/usr/bin/passwd" key="shadow_modification"`}
                  </pre>
                </div>

                <div className="space-y-3">
                  <span className="text-white/40 uppercase tracking-wider font-bold text-[10px] block">
                    Chrony NTP Tracking (# chronyc tracking)
                  </span>
                  <pre className="p-3.5 rounded-lg bg-black border border-white/10 text-white/90 text-[11px] overflow-x-auto leading-relaxed">
{`Reference ID    : 80D88214 (time.nist.gov)
Stratum         : 2
Ref time (UTC)  : Wed Aug 12 09:30:14 2026
System time     : 0.000014291 seconds fast of NTP time
Last offset     : +0.000008124 seconds
RMS offset      : 0.000019482 seconds
Frequency       : 12.842 ppm fast
Residual freq   : +0.001 ppm
Skew            : 0.042 ppm
Root delay      : 0.014285219 seconds
Root dispersion : 0.000841294 seconds
Update interval : 64.2 seconds
Leap status     : Normal`}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
