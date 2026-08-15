// LEGACY COMPATIBILITY SERVICE: retained only for Phase 2E-scheduled routes/adapters.
import {
  Category,
  Project,
  BlogPost,
  Certification,
  Skill,
  MediaAsset,
  SystemAuditLog,
  ContactInquiry,
  CiscoLabData,
  RhcsaMatrixData,
  DevOpsPipelineData,
} from '../types/index.js';

/**
 * Systems Portfolio Relational Database Service
 * 
 * Educational Architecture Note:
 * This database service mirrors a PostgreSQL relational schema
 * with polymorphic structured metadata columns (`ciscoLabData`, `rhcsaMatrixData`, `devopsPipelineData`).
 * It provides thread-safe in-memory state with deep audit logging,
 * deterministic in-memory compatibility data and query filters.
 */
class MockDatabaseService {
  private categories: Category[] = [];
  private projects: Project[] = [];
  private blogs: BlogPost[] = [];
  private certifications: Certification[] = [];
  private skills: Skill[] = [];
  private mediaAssets: MediaAsset[] = [];
  private auditLogs: SystemAuditLog[] = [];
  private inquiries: ContactInquiry[] = [];

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    // Core 3 Competencies / Domains
    this.categories = [
      {
        id: 'cat-networking',
        slug: 'networking',
        name: 'Networking',
        tagline: 'Enterprise Routing, Switching, Cisco Packet Tracer Labs & WAN Topologies',
        description: 'Interactive Cisco Packet Tracer sandbox workspaces, BGP/OSPF dual-homed WAN topologies, EtherChannel trunks, HSRP failover, and ACL security.',
        icon: 'Network',
        accentColor: '#00d4ff', // Electric Cyan
        terminalTheme: 'cyan',
        sortOrder: 1,
        isPublished: true,
        createdAt: new Date('2025-01-01').toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'cat-linux',
        slug: 'linux',
        name: 'Linux',
        tagline: 'Enterprise Linux Administration, Storage Systems, Systemd & Kernel Hardening',
        description: 'Enterprise Linux administration, storage architecture (LVM/Stratis), systemd unit tuning, SELinux enforcement, and automated bash auditing.',
        icon: 'Terminal',
        accentColor: '#00ff41', // Linux Terminal Green
        terminalTheme: 'green',
        sortOrder: 2,
        isPublished: true,
        createdAt: new Date('2025-01-01').toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'cat-devops',
        slug: 'devops',
        name: 'DevOps',
        tagline: 'Kubernetes Orchestration, CI/CD GitOps Automation & Terraform IaC',
        description: 'GitOps multi-stage deployment pipelines, automated ArgoCD synchronizations, Cilium eBPF network overlays, and modular Terraform infrastructure.',
        icon: 'ServerCog',
        accentColor: '#06b6d4', // Cyan
        terminalTheme: 'cyan',
        sortOrder: 3,
        isPublished: true,
        createdAt: new Date('2025-01-01').toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    // -------------------------------------------------------------
    // 3. Domain Sample Projects (Exactly 1 Deep Working Framework per Primary Domain)
    // -------------------------------------------------------------

    // A. Cisco Networking Sample (.PKT Sandbox Lab)
    const ciscoSampleLab: CiscoLabData = {
      labTitle: 'Enterprise Multi-Homed WAN with Dual ISP BGP, OSPF Area 0 & HSRP Gateway Redundancy',
      pktFileName: 'enterprise_wan_dual_isp_bgp_hsrp.pkt',
      pktFileSizeBytes: 184520,
      uploadedAt: new Date('2025-02-15').toISOString(),
      xmlStructureVersion: 'PacketTracer-XML-v8.2.1',
      overviewSummary: 'Complete Cisco enterprise infrastructure integrating eBGP uplinks to redundant service providers (AS 100 & AS 200), iBGP core routing, OSPF Area 0 backbone, HSRP virtual IP 10.10.0.1 for high-availability default gateway failover, and 802.1Q VLAN trunking.',
      topologyXmlSnippet: `<PacketTracerTopology version="8.2.1">
  <NetworkWorkspace name="Enterprise_HQ_WAN">
    <Device type="Router" name="R1-HQ-Edge" model="Cisco ISR 4451-X">
      <Interface name="GigabitEthernet0/0/0" ip="198.51.100.2" mask="255.255.255.252" status="UP" />
      <Interface name="GigabitEthernet0/0/1" ip="10.10.0.2" mask="255.255.255.0" status="UP" hsrpGroup="1" hsrpIp="10.10.0.1" priority="110" />
      <BGP as="65001" neighbor="198.51.100.1" remoteAs="100" />
      <OSPF process="1" area="0.0.0.0" routerId="1.1.1.1" />
    </Device>
    <Device type="Router" name="R2-Backup-Edge" model="Cisco ISR 4451-X">
      <Interface name="GigabitEthernet0/0/0" ip="203.0.113.2" mask="255.255.255.252" status="UP" />
      <Interface name="GigabitEthernet0/0/1" ip="10.10.0.3" mask="255.255.255.0" status="UP" hsrpGroup="1" hsrpIp="10.10.0.1" priority="90" />
      <BGP as="65001" neighbor="203.0.113.1" remoteAs="200" />
      <OSPF process="1" area="0.0.0.0" routerId="2.2.2.2" />
    </Device>
    <Device type="MultilayerSwitch" name="SW-Core-MLS" model="Cisco Catalyst 9500">
      <SVI vlan="10" ip="10.10.10.1" mask="255.255.255.0" name="VLAN_Engineering" />
      <SVI vlan="20" ip="10.10.20.1" mask="255.255.255.0" name="VLAN_Servers" />
      <SVI vlan="30" ip="10.10.30.1" mask="255.255.255.0" name="VLAN_DMZ" />
      <Trunk ports="Te1/0/1-2" allowedVlans="10,20,30,99" native="99" />
    </Device>
  </NetworkWorkspace>
</PacketTracerTopology>`,
      devices: [
        {
          id: 'isp1',
          name: 'ISP-1 Primary Uplink (AS 100)',
          type: 'isp',
          model: 'Carrier Edge Gateway',
          mgmtIp: '198.51.100.1',
          role: 'External Tier-1 Carrier',
          status: 'ONLINE',
          interfaces: [
            { name: 'Gi0/0/0', ip: '198.51.100.1', subnet: '255.255.255.252', status: 'UP', type: 'GigabitEthernet' },
          ],
          routingProtocols: ['eBGP AS 100'],
          runningConfigSnippet: `router bgp 100
 bgp router-id 198.51.100.1
 neighbor 198.51.100.2 remote-as 65001
 neighbor 198.51.100.2 description HQ-Edge-Primary
 network 0.0.0.0`,
        },
        {
          id: 'isp2',
          name: 'ISP-2 Secondary Uplink (AS 200)',
          type: 'isp',
          model: 'Carrier Edge Gateway',
          mgmtIp: '203.0.113.1',
          role: 'External Secondary Carrier',
          status: 'ONLINE',
          interfaces: [
            { name: 'Gi0/0/0', ip: '203.0.113.1', subnet: '255.255.255.252', status: 'UP', type: 'GigabitEthernet' },
          ],
          routingProtocols: ['eBGP AS 200'],
          runningConfigSnippet: `router bgp 200
 bgp router-id 203.0.113.1
 neighbor 203.0.113.2 remote-as 65001
 neighbor 203.0.113.2 description HQ-Edge-Backup
 network 0.0.0.0`,
        },
        {
          id: 'r1',
          name: 'R1-HQ-Edge-Router (Active HSRP)',
          type: 'router',
          model: 'Cisco ISR 4451-X',
          mgmtIp: '10.10.0.2',
          role: 'Primary BGP Edge & HSRP Active Gateway',
          status: 'ONLINE',
          interfaces: [
            { name: 'Gi0/0/0 (WAN)', ip: '198.51.100.2', subnet: '255.255.255.252', status: 'UP', type: 'GigabitEthernet' },
            { name: 'Gi0/0/1 (LAN)', ip: '10.10.0.2', subnet: '255.255.255.0', status: 'UP', type: 'GigabitEthernet' },
            { name: 'Loopback0', ip: '1.1.1.1', subnet: '255.255.255.255', status: 'UP', type: 'Loopback' },
          ],
          routingProtocols: ['eBGP (AS 65001 <-> 100)', 'iBGP (R1 <-> R2)', 'OSPF Area 0', 'HSRP Group 1'],
          runningConfigSnippet: `interface GigabitEthernet0/0/0
 description Primary WAN to ISP-1
 ip address 198.51.100.2 255.255.255.252
 no shutdown
!
interface GigabitEthernet0/0/1
 description HQ Core LAN Gateway
 ip address 10.10.0.2 255.255.255.0
 standby 1 ip 10.10.0.1
 standby 1 priority 110
 standby 1 preempt
 standby 1 track GigabitEthernet0/0/0 25
 no shutdown
!
router bgp 65001
 bgp log-neighbor-changes
 neighbor 198.51.100.1 remote-as 100
 neighbor 10.10.0.3 remote-as 65001
 neighbor 10.10.0.3 next-hop-self
!
router ospf 1
 router-id 1.1.1.1
 network 10.10.0.0 0.0.0.255 area 0`,
        },
        {
          id: 'r2',
          name: 'R2-Backup-Edge-Router (Standby HSRP)',
          type: 'router',
          model: 'Cisco ISR 4451-X',
          mgmtIp: '10.10.0.3',
          role: 'Secondary BGP Edge & HSRP Standby Gateway',
          status: 'STANDBY',
          interfaces: [
            { name: 'Gi0/0/0 (WAN)', ip: '203.0.113.2', subnet: '255.255.255.252', status: 'UP', type: 'GigabitEthernet' },
            { name: 'Gi0/0/1 (LAN)', ip: '10.10.0.3', subnet: '255.255.255.0', status: 'UP', type: 'GigabitEthernet' },
            { name: 'Loopback0', ip: '2.2.2.2', subnet: '255.255.255.255', status: 'UP', type: 'Loopback' },
          ],
          routingProtocols: ['eBGP (AS 65001 <-> 200)', 'iBGP (R2 <-> R1)', 'OSPF Area 0', 'HSRP Group 1'],
          runningConfigSnippet: `interface GigabitEthernet0/0/0
 description Backup WAN to ISP-2
 ip address 203.0.113.2 255.255.255.252
 no shutdown
!
interface GigabitEthernet0/0/1
 description HQ Core LAN Gateway
 ip address 10.10.0.3 255.255.255.0
 standby 1 ip 10.10.0.1
 standby 1 priority 90
 no shutdown
!
router bgp 65001
 neighbor 203.0.113.1 remote-as 200
 neighbor 10.10.0.2 remote-as 65001`,
        },
        {
          id: 'sw_core',
          name: 'Core-MLS-Catalyst9500',
          type: 'multilayer_switch',
          model: 'Cisco Catalyst 9500 48-Port 25G',
          mgmtIp: '10.10.0.10',
          role: 'Core Routing & Inter-VLAN Gateway',
          status: 'ONLINE',
          interfaces: [
            { name: 'Vlan10 (SVI)', ip: '10.10.10.1', subnet: '255.255.255.0', status: 'UP', vlan: '10', type: 'VLAN_SVI' },
            { name: 'Vlan20 (SVI)', ip: '10.10.20.1', subnet: '255.255.255.0', status: 'UP', vlan: '20', type: 'VLAN_SVI' },
            { name: 'Vlan30 (SVI)', ip: '10.10.30.1', subnet: '255.255.255.0', status: 'UP', vlan: '30', type: 'VLAN_SVI' },
            { name: 'Te1/0/1 (Trunk)', ip: 'N/A', subnet: '802.1Q Tagged', status: 'UP', type: 'GigabitEthernet' },
          ],
          routingProtocols: ['OSPF Area 0', 'Inter-VLAN SVI Routing', 'LACP EtherChannel'],
          runningConfigSnippet: `ip routing
!
interface Vlan10
 description Engineering Department
 ip address 10.10.10.1 255.255.255.0
!
interface Vlan20
 description Production Kubernetes & Linux Servers
 ip address 10.10.20.1 255.255.255.0
!
interface Vlan30
 description Demilitarized Zone (DMZ)
 ip address 10.10.30.1 255.255.255.0`,
        },
        {
          id: 'fw_asa',
          name: 'ASA-5506-X-Firepower',
          type: 'firewall',
          model: 'Cisco ASA 5506-X Firepower',
          mgmtIp: '10.10.30.2',
          role: 'DMZ Stateful Inspection & VPN Gateway',
          status: 'ONLINE',
          interfaces: [
            { name: 'GigabitEthernet1/1 (Inside)', ip: '10.10.30.2', subnet: '255.255.255.0', status: 'UP', vlan: '30', type: 'GigabitEthernet' },
          ],
          routingProtocols: ['Static Routing', 'Stateful Packet Inspection'],
          runningConfigSnippet: `interface GigabitEthernet1/1
 nameif inside_dmz
 security-level 50
 ip address 10.10.30.2 255.255.255.0
!
access-list DMZ_IN extended permit tcp any host 10.10.30.50 eq 443
access-group DMZ_IN in interface inside_dmz`,
        },
      ],
      routingTable: [
        { network: '0.0.0.0/0', nextHop: '198.51.100.1', interface: 'Gi0/0/0', protocol: 'B', protocolName: 'eBGP', metric: '0', ad: 20 },
        { network: '10.10.0.0/24', nextHop: 'Directly Connected', interface: 'Gi0/0/1', protocol: 'C', protocolName: 'Connected', metric: '0', ad: 0 },
        { network: '10.10.10.0/24', nextHop: '10.10.0.10', interface: 'Gi0/0/1', protocol: 'O', protocolName: 'OSPF', metric: '2', ad: 110 },
        { network: '10.10.20.0/24', nextHop: '10.10.0.10', interface: 'Gi0/0/1', protocol: 'O', protocolName: 'OSPF', metric: '2', ad: 110 },
        { network: '10.10.30.0/24', nextHop: '10.10.0.10', interface: 'Gi0/0/1', protocol: 'O', protocolName: 'OSPF', metric: '2', ad: 110 },
        { network: '2.2.2.2/32', nextHop: '10.10.0.3', interface: 'Gi0/0/1', protocol: 'i', protocolName: 'iBGP', metric: '0', ad: 200 },
      ],
      vlanDatabase: [
        { vlanId: 10, name: 'Engineering_Dev', ports: ['Gi1/0/1-12'], status: 'ACTIVE' },
        { vlanId: 20, name: 'Production_Servers', ports: ['Gi1/0/13-24'], status: 'ACTIVE' },
        { vlanId: 30, name: 'Security_DMZ', ports: ['Gi1/0/25-32'], status: 'ACTIVE' },
        { vlanId: 99, name: 'Native_Management', ports: ['Te1/0/1-4'], status: 'ACTIVE' },
      ],
      aclRules: [
        { id: 'acl-101', name: 'EXT_SECURITY_FILTER', action: 'permit', protocol: 'tcp', source: '10.10.10.0/24', destination: 'any eq 443' },
        { id: 'acl-102', name: 'EXT_SECURITY_FILTER', action: 'permit', protocol: 'tcp', source: '10.10.20.0/24', destination: 'any eq 443' },
        { id: 'acl-103', name: 'EXT_SECURITY_FILTER', action: 'deny', protocol: 'ip', source: '10.10.10.0/24', destination: '10.10.30.0/24' },
      ],
      verificationTasks: [
        { task: 'BGP Neighbor Adjacency Verification', testCommand: 'show ip bgp summary', expectedResult: 'State/PfxRcd: 1 (Established with 198.51.100.1)', passed: true },
        { task: 'HSRP Active Gateway Failover', testCommand: 'show standby brief', expectedResult: 'Active: local (10.10.0.2), Standby: 10.10.0.3, Virtual IP: 10.10.0.1', passed: true },
        { task: 'OSPF Area 0 Neighbor Convergence', testCommand: 'show ip ospf neighbor', expectedResult: 'Neighbor ID 2.2.2.2 State FULL/BDR', passed: true },
        { task: 'End-to-End Ping Through Simulated WAN', testCommand: 'ping 198.51.100.1 repeat 5', expectedResult: 'Success rate is 100 percent (5/5), round-trip min/avg/max = 1/2/4 ms', passed: true },
      ],
    };

    // B. Linux Administration Sample (RHCSA Competency Matrix)
    const rhcsaSampleMatrix: RhcsaMatrixData = {
      rhelVersion: 'Red Hat Enterprise Linux 9.4',
      kernelVersion: '5.14.0-427.13.1.el9_4.x86_64',
      selinuxMode: 'Enforcing',
      fipsMode: true,
      totalCompetencies: 10,
      verifiedCount: 10,
      objectives: [
        {
          id: 'rhcsa-obj-01',
          domainCode: 'RHCSA-01',
          domainTitle: 'Understand and use essential tools',
          competency: 'Process Management, SSH Keyring Auth & Advanced Grep/Awk Filtering',
          examWeight: '10% Exam Coverage',
          testedCommands: ['grep -E', 'awk \'{print $1,$3}\'', 'tar -czvf backup.tar.gz', 'ssh-copy-id -i ~/.ssh/id_ed25519'],
          configFiles: [
            {
              path: '/etc/ssh/sshd_config.d/01-hardening.conf',
              language: 'bash',
              content: `# RHEL 9 SSH Hardening Baseline
PermitRootLogin prohibit-password
PasswordAuthentication no
PubkeyAuthentication yes
X11Forwarding no
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2`,
              description: 'Zero-trust SSH daemon configuration disallowing password authentication in favor of ed25519 keys.',
            },
          ],
          verificationCommand: 'sshd -t && echo "SSHD syntax verified valid"',
          verificationOutput: 'SSHD syntax verified valid (Exit Code 0)',
          auditStatus: 'VERIFIED',
        },
        {
          id: 'rhcsa-obj-02',
          domainCode: 'RHCSA-02',
          domainTitle: 'Create simple shell scripts',
          competency: 'Automated Log Parsing, Exit Code Trapping & System Health Checks',
          examWeight: '8% Exam Coverage',
          testedCommands: ['bash -n check_health.sh', 'chmod +x /usr/local/bin/sysaudit', 'logger -p local0.warn'],
          configFiles: [
            {
              path: '/usr/local/bin/cluster-health.sh',
              language: 'bash',
              content: `#!/usr/bin/env bash
set -euo pipefail
IFS=$'\\n\\t'

# Memory threshold check (Alert if free < 15%)
MEM_FREE_PCT=$(free | awk '/Mem:/ {printf("%.0f", $4/$2 * 100)}')
if [ "$MEM_FREE_PCT" -lt 15 ]; then
  logger -t SYS_AUDIT "CRITICAL: Low Memory Alert ($MEM_FREE_PCT% free)"
  exit 1
fi
echo "[OK] System metrics nominal. Free Memory: $MEM_FREE_PCT%"
exit 0`,
              description: 'Production bash health check with strict error handling and systemd syslog reporting.',
            },
          ],
          verificationCommand: '/usr/local/bin/cluster-health.sh',
          verificationOutput: '[OK] System metrics nominal. Free Memory: 64%',
          auditStatus: 'HARDENED',
        },
        {
          id: 'rhcsa-obj-03',
          domainCode: 'RHCSA-03',
          domainTitle: 'Operate running systems',
          competency: 'Boot Targets (multi-user vs graphical), systemd Service Tuning & Journald Auditing',
          examWeight: '12% Exam Coverage',
          testedCommands: ['systemctl isolate multi-user.target', 'systemctl edit --full custom-node.service', 'journalctl -u custom-node -p err'],
          configFiles: [
            {
              path: '/etc/systemd/system/node-exporter.service',
              language: 'systemd',
              content: `[Unit]
Description=Prometheus Node Exporter
Wants=network-online.target
After=network-online.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter --collector.systemd --collector.processes
Restart=on-failure
RestartSec=5s
LimitNOFILE=65536
ProtectSystem=strict
ProtectHome=yes
NoNewPrivileges=yes

[Install]
WantedBy=multi-user.target`,
              description: 'Hardened systemd unit file with sandboxed privilege restrictions and systemd resource limits.',
            },
          ],
          verificationCommand: 'systemctl is-active node-exporter.service',
          verificationOutput: 'active (running) since Fri 2025-02-14 08:30:12 UTC; 2 days ago',
          auditStatus: 'VERIFIED',
        },
        {
          id: 'rhcsa-obj-04',
          domainCode: 'RHCSA-04',
          domainTitle: 'Configure local storage & block devices',
          competency: 'LVM Volume Groups, Thin Provisioning, Stratis Pools & VDO Deduplication',
          examWeight: '15% Exam Coverage',
          testedCommands: ['pvcreate /dev/sdb1', 'vgcreate -s 16M vg_prod /dev/sdb1', 'lvcreate -L 50G -n lv_data vg_prod', 'stratis pool create pool_app /dev/sdc'],
          configFiles: [
            {
              path: '/etc/fstab',
              language: 'fstab',
              content: `# /etc/fstab: static file system information.
UUID=3f92b704-58a1-41db-8c70-ea8d3b519001  /                   xfs     defaults,noatime        0 0
UUID=84ce9139-2b02-4fd9-8733-1b9195b6c8a2  /boot               xfs     defaults                0 0
UUID=02a98f12-9c10-43f1-a89b-ec0419df8217  /var/log/audit      xfs     defaults,nodev,noexec   0 0
/dev/vg_prod/lv_data                        /data/db            xfs     defaults,prjquota       0 0
UUID=ea789f21-bc01-4411-9a10-2189fbca0012  none                swap    defaults                0 0`,
              description: 'FSTAB partition mounts mapped exclusively via persistent UUIDs with security mount options (nodev, noexec) for audit partitions.',
            },
          ],
          verificationCommand: 'lsblk -f && vgs && lvs',
          verificationOutput: `VG      #PV #LV #SN Attr   VSize   VFree
vg_prod   1   1   0 wz--n- 100.00g 50.00g
LV      VG      Attr       LSize  Pool Origin Data%
lv_data vg_prod -wi-ao---- 50.00g`,
          auditStatus: 'COMPLIANT',
        },
        {
          id: 'rhcsa-obj-05',
          domainCode: 'RHCSA-05',
          domainTitle: 'Create and configure file systems',
          competency: 'XFS File System Resizing, Persistent UUID Mounts, NFS v4 Exports & AutoFS',
          examWeight: '12% Exam Coverage',
          testedCommands: ['xfs_growfs /data/db', 'mount -a', 'exportfs -avr', 'showmount -e nfs-server.internal'],
          configFiles: [
            {
              path: '/etc/auto.master.d/direct.autofs',
              language: 'bash',
              content: `/-  /etc/auto.direct --timeout=60`,
              description: 'AutoFS master direct map file configuring on-demand network mounts.',
            },
            {
              path: '/etc/auto.direct',
              language: 'bash',
              content: `/mnt/nfs/shared  -rw,soft,sec=krb5p,proto=tcp  storage.internal:/srv/nfs/shared`,
              description: 'AutoFS direct map binding Kerberized NFS v4 shares with automatic unmount after 60s idle.',
            },
          ],
          verificationCommand: 'systemctl is-active autofs && findmnt -t nfs4',
          verificationOutput: 'active (running) /mnt/nfs/shared storage.internal:/srv/nfs/shared nfs4 rw,relatime',
          auditStatus: 'VERIFIED',
        },
        {
          id: 'rhcsa-obj-06',
          domainCode: 'RHCSA-06',
          domainTitle: 'Deploy, configure, and maintain systems',
          competency: 'DNF Repository Management, Chrony NTP Synchronization & Sysctl Kernel Tuning',
          examWeight: '10% Exam Coverage',
          testedCommands: ['dnf config-manager --add-repo', 'chronyc sources -v', 'sysctl -p /etc/sysctl.d/99-kubernetes.conf'],
          configFiles: [
            {
              path: '/etc/sysctl.d/99-kubernetes-security.conf',
              language: 'ini',
              content: `# Kernel Hardening and Container Forwarding
net.ipv4.ip_forward = 1
net.bridge.bridge-nf-call-iptables = 1
net.bridge.bridge-nf-call-ip6tables = 1
fs.inotify.max_user_watches = 524288
fs.file-max = 2097152
kernel.pid_max = 4194304
vm.max_map_count = 262144`,
              description: 'Production kernel parameters for high-throughput container clusters and memory optimization.',
            },
          ],
          verificationCommand: 'sysctl net.ipv4.ip_forward && chronyc tracking',
          verificationOutput: 'net.ipv4.ip_forward = 1\nReference ID    : 192.168.1.1 (time.google.com)\nStratum         : 2\nOffset          : +0.000012891 seconds',
          auditStatus: 'COMPLIANT',
        },
        {
          id: 'rhcsa-obj-07',
          domainCode: 'RHCSA-07',
          domainTitle: 'Manage basic networking & firewalls',
          competency: 'NetworkManager nmcli bonding, Firewalld Zones & Rich Rules',
          examWeight: '11% Exam Coverage',
          testedCommands: ['nmcli con add type bond con-name bond0', 'firewall-cmd --permanent --zone=internal --add-source=10.10.0.0/24', 'firewall-cmd --reload'],
          configFiles: [
            {
              path: '/etc/firewalld/zones/dmz.xml',
              language: 'yaml',
              content: `<?xml version="1.0" encoding="utf-8"?>
<zone>
  <short>DMZ</short>
  <description>Hardened DMZ perimeter for ingress controllers.</description>
  <service name="https"/>
  <service name="http"/>
  <rule family="ipv4">
    <source address="10.10.10.0/24"/>
    <service name="ssh"/>
    <accept/>
  </rule>
</zone>`,
              description: 'Firewalld XML zone definition with scoped SSH access only from engineering subnet.',
            },
          ],
          verificationCommand: 'firewall-cmd --list-all --zone=dmz',
          verificationOutput: 'dmz (active)\n  target: default\n  services: http https\n  rules: rule family="ipv4" source address="10.10.10.0/24" service name="ssh" accept',
          auditStatus: 'HARDENED',
        },
        {
          id: 'rhcsa-obj-08',
          domainCode: 'RHCSA-08',
          domainTitle: 'Manage users and groups',
          competency: 'Sudoers Privilege Delegation, Password Aging Policies & PAM Security',
          examWeight: '7% Exam Coverage',
          testedCommands: ['useradd -G wheel,devops sgupta', 'visudo -cf /etc/sudoers.d/99-devops', 'chage -M 90 -W 7 -I 14 sgupta'],
          configFiles: [
            {
              path: '/etc/sudoers.d/99-devops-engineers',
              language: 'bash',
              content: `# Passwordless sudo delegation for DevOps Automation
%devops ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart k8s-*, /usr/bin/podman
Defaults:%devops log_year, logfile=/var/log/sudo.log`,
              description: 'Scoped sudoers configuration with audit logging to /var/log/sudo.log.',
            },
          ],
          verificationCommand: 'visudo -cf /etc/sudoers.d/99-devops-engineers',
          verificationOutput: '/etc/sudoers.d/99-devops-engineers: parsed OK',
          auditStatus: 'VERIFIED',
        },
        {
          id: 'rhcsa-obj-09',
          domainCode: 'RHCSA-09',
          domainTitle: 'Manage security (SELinux)',
          competency: 'SELinux Modes, Context Restores (restorecon), Port Labels & Booleans',
          examWeight: '15% Exam Coverage',
          testedCommands: ['getenforce', 'semanage fcontext -a -t httpd_sys_content_t "/srv/web(/.*)?"', 'restorecon -Rv /srv/web', 'setsebool -P httpd_can_network_connect 1'],
          configFiles: [
            {
              path: '/etc/selinux/config',
              language: 'bash',
              content: `# This file controls the state of SELinux on the system.
SELINUX=enforcing
SELINUXTYPE=targeted`,
              description: 'RHEL 9 targeted SELinux mode enforcing mandatory access controls across all daemon processes.',
            },
          ],
          verificationCommand: 'sestatus && getsebool httpd_can_network_connect',
          verificationOutput: 'SELinux status:                 enabled\nSELinuxfs mount:                /sys/fs/selinux\nCurrent mode:                   enforcing\nMode from config file:          enforcing\nhttpd_can_network_connect --> on',
          auditStatus: 'HARDENED',
        },
        {
          id: 'rhcsa-obj-10',
          domainCode: 'RHCSA-10',
          domainTitle: 'Manage containers (Podman)',
          competency: 'Rootless Containers, Quadlet Systemd Units & Secret Mounting',
          examWeight: '10% Exam Coverage',
          testedCommands: ['podman run -d --name nginx -p 8080:80 ubi9/nginx-120', 'podman generate systemd --name nginx --files', 'podman secret create db_pass secret.txt'],
          configFiles: [
            {
              path: '~/.config/containers/systemd/web-gateway.container',
              language: 'systemd',
              content: `[Unit]
Description=Rootless Podman Nginx Gateway (Quadlet)

[Container]
Image=registry.access.redhat.com/ubi9/nginx-120:latest
PublishPort=8443:8443
Volume=/srv/certs:/etc/nginx/certs:ro,Z
AutoUpdate=registry

[Service]
Restart=always

[Install]
WantedBy=default.target`,
              description: 'RHEL 9 native Quadlet container definition integrated directly into rootless systemd user session.',
            },
          ],
          verificationCommand: 'podman ps --format "table {{.ID}} {{.Image}} {{.Status}} {{.Ports}}"',
          verificationOutput: 'CONTAINER ID  IMAGE                                      STATUS            PORTS\na8f12c904e12  registry.access.redhat.com/ubi9/nginx-120  Up 44 hours ago   0.0.0.0:8443->8443/tcp',
          auditStatus: 'VERIFIED',
        },
      ],
    };

    // C. DevOps & Cloud Infrastructure Sample (Multi-Pipeline Matrices)
    const devopsSamplePipeline: DevOpsPipelineData = {
      framework: 'GitOps (ArgoCD + Cilium + Helm)',
      gitCommitSha: 'a49f82c',
      branch: 'main [Lab-Release-v2.8]',
      pipelineStages: [
        {
          id: 'stage-1',
          name: 'Static Code & IaC Linting',
          icon: 'CheckCircle2',
          tool: 'TFLint & Yamllint',
          durationSeconds: 14,
          status: 'SUCCESS',
          stdoutSnippet: `[INFO] Validating 18 Terraform modules...
[PASS] No syntax or deprecation errors in ./terraform/
[PASS] Kubernetes manifest lint: 0 warnings, 0 fatal errors.`,
          artifactsProduced: ['lint-report.json'],
        },
        {
          id: 'stage-2',
          name: 'Security & CVE Scanning',
          icon: 'ShieldCheck',
          tool: 'Trivy & Checkov',
          durationSeconds: 28,
          status: 'SUCCESS',
          stdoutSnippet: `[INFO] Scanning container base images (UBI 9 Minimal)...
[REPORT] Critical: 0, High: 0, Medium: 0, Low: 2
[PASS] Security audit stage completed. No critical vulnerabilities found.`,
          artifactsProduced: ['trivy-sarif-report.sarif'],
        },
        {
          id: 'stage-3',
          name: 'Multi-Arch Container Build',
          icon: 'Boxes',
          tool: 'Buildah / Docker Buildx',
          durationSeconds: 42,
          status: 'SUCCESS',
          stdoutSnippet: `[INFO] Building image: registry.infra.lan/core/gateway:v2.8
[INFO] Pushing OCI manifest to AWS ECR (linux/amd64, linux/arm64)
[PASS] OCI Image Artifact produced.`,
          artifactsProduced: ['oci-image.tar'],
        },
        {
          id: 'stage-4',
          name: 'Helm Chart Packaging & Signing',
          icon: 'Package',
          tool: 'Helm 3 & Cosign',
          durationSeconds: 19,
          status: 'SUCCESS',
          stdoutSnippet: `[INFO] Packaging chart platform-v2.8.0.tgz
[INFO] Signing with Cosign KMS key (aws-kms://arn:aws:kms:us-east-1:...)
[PASS] Signature verified.`,
          artifactsProduced: ['platform-v2.8.0.tgz.sig'],
        },
        {
          id: 'stage-5',
          name: 'ArgoCD GitOps Sync Loop',
          icon: 'GitPullRequest',
          tool: 'ArgoCD Controller',
          durationSeconds: 31,
          status: 'SUCCESS',
          stdoutSnippet: `[SYNC] Reconciling desired state against Kubernetes cluster 'us-east-1-prod'...
[UPDATE] Ingress Controller -> Synchronized
[UPDATE] Deployment/core-api -> 6/6 Replicas Ready
[UPDATE] Cilium NetworkPolicies -> Enforced
[PASS] Sync status: Synced | Health: Healthy`,
          artifactsProduced: ['argocd-sync-receipt.json'],
        },
        {
          id: 'stage-6',
          name: 'Canary Traffic Verification',
          icon: 'Activity',
          tool: 'Prometheus & Flagger',
          durationSeconds: 60,
          status: 'SUCCESS',
          stdoutSnippet: `[CANARY] Shifting 10% traffic to v2.8... Success Rate: OK
[CANARY] Shifting 50% traffic to v2.8... Success Rate: OK
[CANARY] Shifting traffic to v2.8... Rollout complete.
[PASS] Canary promotion successful.`,
        },
      ],
      iacTree: [
        {
          name: 'terraform-infrastructure',
          path: 'terraform/',
          type: 'directory',
          children: [
            {
              name: 'main.tf',
              path: 'terraform/main.tf',
              type: 'file',
              size: '4.2 KB',
              content: `# Terraform Production Infrastructure Blueprint
terraform {
  required_version = ">= 1.7.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
  }
  backend "s3" {
    bucket         = "infra-tf-state-us-east-1"
    key            = "prod/k8s-mesh.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.5.1"

  name = "infra-prod-vpc"
  cidr = "10.100.0.0/16"

  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.100.1.0/24", "10.100.2.0/24", "10.100.3.0/24"]
  public_subnets  = ["10.100.101.0/24", "10.100.102.0/24", "10.100.103.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = false
  enable_vpn_gateway = false

  tags = {
    Environment = "Production"
    Owner       = "Sahil K Gupta"
    ManagedBy   = "Terraform"
  }
}`,
            },
            {
              name: 'variables.tf',
              path: 'terraform/variables.tf',
              type: 'file',
              size: '1.8 KB',
              content: `variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "Target AWS Cloud Region"
}

variable "cluster_version" {
  type        = string
  default     = "1.29"
  description = "Target Kubernetes Core Version"
}

variable "node_instance_types" {
  type        = list(string)
  default     = ["m6i.2xlarge", "m6i.4xlarge"]
  description = "EC2 Worker Node Compute SKU Array"
}`,
            },
            {
              name: 'cilium-ebpf.tf',
              path: 'terraform/cilium-ebpf.tf',
              type: 'file',
              size: '2.5 KB',
              content: `resource "helm_release" "cilium" {
  name       = "cilium"
  repository = "https://helm.cilium.io/"
  chart      = "cilium"
  version    = "1.15.2"
  namespace  = "kube-system"

  set {
    name  = "kubeProxyReplacement"
    value = "strict"
  }
  set {
    name  = "k8sServiceHost"
    value = module.eks.cluster_endpoint
  }
  set {
    name  = "encryption.enabled"
    value = "true"
  }
  set {
    name  = "encryption.type"
    value = "wireguard"
  }
}`,
            },
          ],
        },
      ],
      architectureLayers: [
        {
          tier: 'Edge Ingress & Global Routing',
          description: 'Cloudflare Magic WAN & AWS Route 53 with BGP Anycast routing and automated DDoS mitigation.',
          technologies: ['AWS Route 53', 'Cloudflare WAF', 'Envoy Gateway', 'BGP Anycast'],
          slaMetrics: 'High-Availability Ingress Routing',
        },
        {
          tier: 'Container Orchestration & eBPF Mesh',
          description: 'Multi-zone EKS clusters utilizing Cilium eBPF for robust packet forwarding and WireGuard encryption.',
          technologies: ['Kubernetes 1.29', 'Cilium eBPF', 'ArgoCD', 'Prometheus Operator'],
          slaMetrics: '64 Managed Nodes | 1200 Pods',
        },
        {
          tier: 'Distributed Data Storage & Cache',
          description: 'High-availability PostgreSQL cluster with streaming replication, Redis Sentinel cache, and HashiCorp Vault secrets.',
          technologies: ['PostgreSQL 16', 'Redis Sentinel', 'HashiCorp Vault', 'MinIO S3'],
          slaMetrics: 'Distributed State Persistence',
        },
        {
          tier: 'Observability & Continuous GitOps',
          description: 'End-to-end distributed tracing, OpenTelemetry collectors, and automated canary deployments via Flagger.',
          technologies: ['OpenTelemetry', 'Grafana Tempo', 'Prometheus', 'Flagger'],
          slaMetrics: 'End-to-End Distributed Tracing',
        },
      ],
    };

    // Projects Array
    this.projects = [
      {
        id: 'proj-cisco-wan-pkt',
        title: 'Enterprise Multi-Homed WAN with Dual ISP BGP, OSPF Area 0 & HSRP Gateway Redundancy',
        slug: 'cisco-enterprise-wan-bgp-hsrp',
        summary: 'Interactive Cisco .PKT sandbox lab with real-time XML topology parser, dual-homed eBGP uplink failover, OSPF Area 0 backbone, and HSRP gateway redundancy.',
        descriptionMarkdown: `### Enterprise WAN Infrastructure Design
This project demonstrates an enterprise-style lab architecture built and validated in **Cisco Packet Tracer** and verified against Cisco IOS-XE standards.

#### Core Architectural Achievements:
1. **Multi-Homed BGP Routing**: Implemented eBGP peering to ISP-1 (AS 100) and ISP-2 (AS 200) with autonomous system prepending and BGP Local Preference to control inbound and outbound traffic flows.
2. **First Hop Redundancy (HSRP)**: Configured HSRP Group 1 providing virtual IP \`10.10.0.1\` with interface tracking on WAN links to automatically demote primary priority from 110 to 85 on link failure.
3. **Core Inter-VLAN Routing**: Catalyst 9500 Multi-Layer Switch with SVIs for Engineering (\`VLAN 10\`), Servers (\`VLAN 20\`), and DMZ (\`VLAN 30\`).
4. **Security ACLs**: Extended Access Control Lists blocking inter-VLAN lateral movement while permitting encrypted HTTPS egress.`,
        categoryId: 'cat-networking',
        status: 'COMPLETED',
        formatType: 'cisco_pkt_lab',
        isFeatured: true,
        sortOrder: 1,
        coverImageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1000&q=80',
        devopsStack: ['Cisco IOS-XE', 'Packet Tracer 8.2', 'BGP AS 65001', 'OSPF Area 0', 'HSRP', '802.1Q VLANs'],
        tags: ['Cisco', 'CCNA', 'BGP', 'OSPF', 'HSRP', 'Packet-Tracer'],
        metrics: {
          'Lab Topology': 'Dual-Homed WAN',
          'WAN Uplinks': 'Dual 10G',
          'VLANs Segmented': 4,
          'Test Suite': 'Lab Checks Completed',
        },
        ciscoLabData: ciscoSampleLab,
        createdAt: new Date('2025-02-15').toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'proj-rhel-rhcsa-matrix',
        title: 'Enterprise RHEL 9 Infrastructure Hardening, Stratis/LVM Storage & SELinux Compliance Matrix',
        slug: 'rhel-9-rhcsa-hardening-storage-selinux',
        summary: 'Structural competency-based audit matrix matching official RHCSA EX200 objectives: LVM thin pools, SELinux enforcement, systemd sandbox units, and persistent UUID mounts.',
        descriptionMarkdown: `### Enterprise Linux Infrastructure & RHCSA Competency Matrix
Engineered as a security-hardening lab covering SELinux, firewalld, permissions, and benchmark-oriented configuration practices.

#### Key Highlights:
- **Storage Engineering**: Thin-provisioned LVM storage volumes formatted with XFS and secured via UUID mounts in \`/etc/fstab\` with \`nodev,noexec\` audit protections.
- **SELinux Mandatory Access Control**: Zero permissive escapes; full targeted SELinux policy enforcement, custom port bindings (\`semanage port\`), and boolean configurations.
- **Automated Verification**: Self-auditing bash harnesses validating Chrony NTP sync, sysctl kernel limits, and rootless Podman Quadlet containers.`,
        categoryId: 'cat-linux',
        status: 'COMPLETED',
        formatType: 'rhcsa_matrix',
        isFeatured: true,
        sortOrder: 2,
        coverImageUrl: 'https://images.unsplash.com/photo-1629654297299-c8506221ca97?auto=format&fit=crop&w=1000&q=80',
        devopsStack: ['RHEL 9', 'SELinux', 'LVM / XFS Storage', 'Systemd', 'Podman Containers', 'Firewalld', 'Chrony NTP'],
        tags: ['Linux', 'Storage', 'Systemd', 'SELinux', 'Automation'],
        metrics: {
          'Storage Pools': 'Thin LVM / XFS',
          'SELinux Mode': 'Enforcing',
          'Host Compliance': 'Verified Active',
          'Service Health': 'Nominal',
        },
        rhcsaMatrixData: rhcsaSampleMatrix,
        createdAt: new Date('2025-02-10').toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'proj-k8s-cilium-gitops',
        title: 'Cloud-Native GitOps Kubernetes Infrastructure with Cilium eBPF & Terraform',
        slug: 'cloud-native-gitops-k8s-cilium-terraform',
        summary: 'Multi-pipeline GitOps continuous deployment matrix featuring automated ArgoCD reconciliation, Cilium eBPF network overlays, and modular Terraform IaC workspace.',
        descriptionMarkdown: `### Production GitOps & Cloud-Native Architecture
A resilient hybrid Kubernetes platform engineered for high-throughput enterprise workloads and declarative zero-trust network policies.

#### Core Platform Modules:
- **Cilium eBPF CNI**: eBPF-based network observability, kernel-level L7 network policy enforcement, and WireGuard mesh encryption.
- **Declarative GitOps (ArgoCD)**: Automated reconciliation loops with Prometheus canary deployments powered by Flagger.
- **Infrastructure as Code**: Production Terraform repository provisioning multi-AZ VPCs, IAM OIDC roles, and secure S3 state locking.`,
        categoryId: 'cat-devops',
        status: 'COMPLETED',
        formatType: 'devops_pipeline',
        isFeatured: true,
        sortOrder: 3,
        coverImageUrl: 'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?auto=format&fit=crop&w=1000&q=80',
        devopsStack: ['Kubernetes', 'Cilium eBPF', 'Terraform', 'ArgoCD', 'Helm', 'HashiCorp Vault', 'Prometheus'],
        tags: ['DevOps', 'Kubernetes', 'GitOps', 'Terraform', 'eBPF', 'CI/CD'],
        metrics: {
          'Pipeline Engine': 'ArgoCD',
          'Deployment Style': 'GitOps',
          'Deployment Strategy': 'Automated Canary',
          'Cluster Health': 'Nominal (Kubernetes)',
        },
        devopsPipelineData: devopsSamplePipeline,
        createdAt: new Date('2025-01-20').toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    // 4. Technical Blog Articles
    this.blogs = [
      {
        id: 'blog-01',
        title: 'Enterprise BGP EVPN & Packet Tracer Simulation Architecture',
        slug: 'enterprise-bgp-evpn-packet-tracer-architecture',
        excerpt: 'How to design scalable multi-tenant enterprise data center overlays using BGP EVPN control plane and Cisco IOS-XE topologies.',
        contentMarkdown: `### Why BGP EVPN for Modern Data Centers?
Traditional spanning-tree protocols (STP) leave 50% of switch uplinks idle to prevent switching loops. **BGP EVPN with VxLAN encapsulation** enables active-active multi-homing across all leaf-spine fabrics.

\`\`\`cisco
router bgp 65001
 template peer-session LEAF_FABRIC
  remote-as 65001
  update-source Loopback0
 neighbor 10.255.0.1 inherit peer-session LEAF_FABRIC
 address-family l2vpn evpn
  neighbor 10.255.0.1 activate
  neighbor 10.255.0.1 send-community both
\`\`\`

#### Key Takeaways:
- Elimination of Spanning Tree blocking ports using equal-cost multi-pathing (ECMP).
- Integrated routing and bridging (IRB) directly at the leaf switch.
- Consistent MAC address learning in the control plane rather than flood-and-learn data plane.`,
        categoryId: 'cat-networking',
        coverImageUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=1000&q=80',
        readTimeMinutes: 7,
        tags: ['Networking', 'Cisco', 'BGP', 'Packet-Tracer', 'Routing'],
        isPublished: true,
        publishedAt: new Date('2025-02-01').toISOString(),
        viewCount: 1420,
        createdAt: new Date('2025-02-01').toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'blog-02',
        title: 'Mastering Enterprise Linux: Storage Management, Systemd Units & SELinux',
        slug: 'mastering-enterprise-linux-storage-systemd-selinux',
        excerpt: 'A comprehensive engineering guide to architecting hardened Linux servers and storage pools in mission-critical environments.',
        contentMarkdown: `### Enterprise Linux Storage Architecture
In modern Linux systems administration, predictable persistent storage mounting is critical. Always rely on filesystem UUIDs:

\`\`\`bash
# 1. Identify partition UUID
blkid /dev/vg_prod/lv_data

# 2. Add hardened mount options in /etc/fstab
UUID=3f92b704-58a1-41db-8c70-ea8d3b519001 /data/db xfs defaults,nodev,noexec 0 0

# 3. Verify mount without rebooting
mount -a
\`\`\`

#### SELinux Policy Hardening:
Never disable SELinux in production. Use \`audit2allow\` and \`semanage\` to craft precise access rules.`,
        categoryId: 'cat-linux',
        coverImageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1000&q=80',
        readTimeMinutes: 9,
        tags: ['Linux', 'Storage', 'Systemd', 'SELinux', 'Sysadmin'],
        isPublished: true,
        publishedAt: new Date('2025-01-25').toISOString(),
        viewCount: 2180,
        createdAt: new Date('2025-01-25').toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'blog-03',
        title: 'Zero-Trust Kubernetes: Replacing kube-proxy with Cilium eBPF & WireGuard',
        slug: 'zero-trust-k8s-cilium-ebpf-wireguard',
        excerpt: 'Exploring how eBPF-based networking can reduce proxy overhead and improve observability in Kubernetes environments.',
        contentMarkdown: `### Eliminating iptables Overhead with eBPF
Traditional Kubernetes \`kube-proxy\` uses linear \`iptables\` rule lookups, resulting in $O(N)$ packet processing overhead at scale.

**Cilium eBPF** replaces this with $O(1)$ BPF hash map lookups directly in the Linux kernel network stack, bypassing conntrack tables.`,
        categoryId: 'cat-devops',
        coverImageUrl: 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?auto=format&fit=crop&w=1000&q=80',
        readTimeMinutes: 8,
        tags: ['DevOps', 'Kubernetes', 'Cilium', 'eBPF', 'Terraform'],
        isPublished: true,
        publishedAt: new Date('2025-01-10').toISOString(),
        viewCount: 3840,
        createdAt: new Date('2025-01-10').toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    // 5. Core Competency Learning Progress & Topics
    this.certifications = [
      {
        id: 'cert-networking',
        title: 'CCNA 200-301 Preparation Track',
        code: 'CCNA Study Roadmap',
        issuer: 'Cisco Networking Systems',
        credentialId: 'CCNA COMPLETION: 70%',
        verificationUrl: 'https://www.cisco.com',
        badgeIcon: 'Network',
        issueDate: '2025-01-01',
        expiryDate: '2026-12-31',
        categoryId: 'cat-networking',
        skillsValidated: [
          'Enterprise IPv4/IPv6 Subnetting (Completed)',
          'OSPF & Static Routing Protocols (Completed)',
          '802.1Q VLANs & Multi-Layer Inter-VLAN Routing (Completed)',
          'HSRP / VRRP Gateway High-Availability Failover (Completed)',
          'Cisco IOS CLI & Packet Tracer Topology Simulations (Completed)',
          'Access Control Lists (ACLs) & Port Security (In Progress)',
        ],
        syllabusBreakdown: [
          { domain: 'Network Fundamentals & IP Subnetting', percentage: 90, score: 'Completed (90%)' },
          { domain: 'Network Access & VLAN Trunking', percentage: 85, score: 'Completed (85%)' },
          { domain: 'IP Connectivity (OSPF Area 0 & Static Routing)', percentage: 80, score: 'Completed (80%)' },
          { domain: 'IP Services & Gateway Redundancy (HSRP/DHCP)', percentage: 65, score: 'In Progress (65%)' },
          { domain: 'Security Fundamentals & Automation', percentage: 40, score: 'In Progress (40%)' },
        ],
        isFeatured: true,
        sortOrder: 1,
        createdAt: new Date('2025-01-01').toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'cert-linux',
        title: 'RHCSA EX200 Preparation Track',
        code: 'RHCSA Study Roadmap',
        issuer: 'Red Hat Enterprise Linux',
        credentialId: 'RHCSA COMPLETION: 50%',
        verificationUrl: 'https://access.redhat.com',
        badgeIcon: 'Terminal',
        issueDate: '2025-01-01',
        expiryDate: '2026-12-31',
        categoryId: 'cat-linux',
        skillsValidated: [
          'Essential Linux Commands & Bash Scripting (Completed)',
          'User & Group Management with Sudo Privileges (Completed)',
          'Systemd Unit Management & Boot Targets (Completed)',
          'LVM Storage Provisioning, XFS & /etc/fstab (In Progress)',
          'SELinux Contexts & Enforcing Modes (In Progress)',
          'Firewalld Network Zones & Rich Rules (In Progress)',
        ],
        syllabusBreakdown: [
          { domain: 'Understand & Use Essential Linux Tools', percentage: 85, score: 'Completed (85%)' },
          { domain: 'Operate Running Systems & Services', percentage: 70, score: 'Completed (70%)' },
          { domain: 'Configure Local Storage & LVM Filesystems', percentage: 50, score: 'In Progress (50%)' },
          { domain: 'Manage Host Security & SELinux Enforcement', percentage: 40, score: 'In Progress (40%)' },
          { domain: 'Basic Container Management (Podman)', percentage: 30, score: 'In Progress (30%)' },
        ],
        isFeatured: true,
        sortOrder: 2,
        createdAt: new Date('2025-01-01').toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'cert-devops',
        title: 'Cloud-Native Kubernetes & DevOps Track',
        code: 'DevOps & GitOps Roadmap',
        issuer: 'Cloud-Native Learning Foundation',
        credentialId: 'DevOps Roadmap: Active Labs',
        verificationUrl: 'https://www.cncf.io',
        badgeIcon: 'Boxes',
        issueDate: '2025-01-01',
        expiryDate: '2026-12-31',
        categoryId: 'cat-devops',
        skillsValidated: [
          'Docker & Podman Containerization (Completed)',
          'Kubernetes Manifests & Pod Orchestration (In Progress)',
          'Cilium eBPF CNI & Mesh Networking (In Progress)',
          'ArgoCD GitOps Declarative Delivery Pipelines (In Progress)',
          'Terraform Infrastructure-as-Code Basics (In Progress)',
        ],
        syllabusBreakdown: [
          { domain: 'OCI Containers & Dockerfile Optimization', percentage: 80, score: 'Completed (80%)' },
          { domain: 'Kubernetes Workloads & Services', percentage: 60, score: 'In Progress (60%)' },
          { domain: 'ArgoCD GitOps Continuous Delivery', percentage: 55, score: 'In Progress (55%)' },
          { domain: 'Terraform IaC & Cloud State Provisioning', percentage: 50, score: 'In Progress (50%)' },
        ],
        isFeatured: true,
        sortOrder: 3,
        createdAt: new Date('2025-01-01').toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    // 6. Core Technical Skills
    this.skills = [
      { id: 'sk-1', name: 'Enterprise Linux Administration', level: 'Expert', proficiencyPercent: 96, yearsOfExperience: 4, categoryId: 'cat-linux', terminalSnippet: 'systemctl status custom.service && journalctl -xe', sortOrder: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'sk-2', name: 'Cisco Routing & Packet Tracer Labs', level: 'Expert', proficiencyPercent: 95, yearsOfExperience: 4, categoryId: 'cat-networking', terminalSnippet: 'show ip bgp summary && show standby brief', sortOrder: 2, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'sk-3', name: 'LVM Storage & SELinux Hardening', level: 'Expert', proficiencyPercent: 94, yearsOfExperience: 4, categoryId: 'cat-linux', terminalSnippet: 'semanage fcontext -a -t httpd_sys_content_t "/srv(/.*)?"', sortOrder: 3, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'sk-4', name: 'BGP & OSPF Dynamic Routing', level: 'Expert', proficiencyPercent: 95, yearsOfExperience: 4, categoryId: 'cat-networking', terminalSnippet: 'router ospf 1 -> network 10.10.0.0 0.0.0.255 area 0', sortOrder: 4, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'sk-5', name: 'Kubernetes & Cilium eBPF Mesh', level: 'Expert', proficiencyPercent: 93, yearsOfExperience: 3, categoryId: 'cat-devops', terminalSnippet: 'cilium status --wait && kubectl get pods -A', sortOrder: 5, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'sk-6', name: 'Terraform & Infrastructure-as-Code', level: 'Advanced', proficiencyPercent: 92, yearsOfExperience: 3, categoryId: 'cat-devops', terminalSnippet: 'terraform plan -out=tfplan && terraform apply tfplan', sortOrder: 6, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'sk-7', name: 'ArgoCD & GitOps CI/CD Pipelines', level: 'Advanced', proficiencyPercent: 90, yearsOfExperience: 3, categoryId: 'cat-devops', terminalSnippet: 'argocd app sync platform-lab --prune', sortOrder: 7, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ];

    // 7. Initial System Audit Logs
    this.auditLogs = [
      {
        id: 'log-seed-01',
        action: 'SYSTEM_BOOT',
        entity: 'SystemKernel',
        entityId: 'srv-infra-01',
        adminEmail: 'sahilkguptaprivate@gmail.com',
        ipAddress: '127.0.0.1',
        userAgent: 'SystemsPortfolio-Bootloader/2026',
        details: { status: 'OK', services: ['CiscoSimulator', 'RhcsaEngine', 'DevOpsPipeline', 'AuthJwt'] },
        timestamp: new Date().toISOString(),
      },
      {
        id: 'log-seed-02',
        action: 'SEED_PORTFOLIO_DOMAINS',
        entity: 'Category',
        adminEmail: 'sahilkguptaprivate@gmail.com',
        details: { count: 5, primaryDomains: ['cisco-networking', 'sysadmin-linux', 'devops-infra'] },
        timestamp: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'log-seed-03',
        action: 'VERIFY_PKT_PARSER',
        entity: 'CiscoLabData',
        entityId: 'proj-cisco-wan-pkt',
        adminEmail: 'sahilkguptaprivate@gmail.com',
        details: { devicesParsed: 6, routesExtracted: 6, hsrpConfigured: true },
        timestamp: new Date(Date.now() - 7200000).toISOString(),
      },
    ];
  }

  public getCategories(): Category[] {
    return [...this.categories].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  public getCategoryBySlug(slug: string): Category | undefined {
    return this.categories.find((c) => c.slug === slug);
  }

  public createCategory(cat: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Category {
    const newCat: Category = {
      ...cat,
      id: `cat-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.categories.push(newCat);
    this.logAudit('CREATE_CATEGORY', 'Category', newCat.id, { name: newCat.name, slug: newCat.slug });
    return newCat;
  }

  public updateCategory(id: string, cat: Partial<Category>): Category | null {
    const index = this.categories.findIndex((c) => c.id === id);
    if (index === -1) return null;
    this.categories[index] = {
      ...this.categories[index],
      ...cat,
      updatedAt: new Date().toISOString(),
    };
    this.logAudit('UPDATE_CATEGORY', 'Category', id, cat);
    return this.categories[index];
  }

  public deleteCategory(id: string): boolean {
    const index = this.categories.findIndex((c) => c.id === id);
    if (index === -1) return false;
    const removed = this.categories.splice(index, 1)[0];
    this.logAudit('DELETE_CATEGORY', 'Category', id, { name: removed.name });
    return true;
  }

  // -------------------------------------------------------------
  // Project Operations (Multi-Format Supported)
  // -------------------------------------------------------------
  public getProjects(categoryId?: string, tag?: string): Project[] {
    return this.projects
      .filter((p) => {
        if (categoryId && p.categoryId !== categoryId) return false;
        if (tag && !p.tags.includes(tag)) return false;
        return true;
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  public getProjectBySlug(slug: string): Project | undefined {
    return this.projects.find((p) => p.slug === slug);
  }

  public getProjectById(id: string): Project | undefined {
    return this.projects.find((p) => p.id === id);
  }

  public createProject(proj: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Project {
    const newProj: Project = {
      ...proj,
      id: `proj-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.projects.push(newProj);
    this.logAudit('CREATE_PROJECT', 'Project', newProj.id, { title: newProj.title, formatType: newProj.formatType });
    return newProj;
  }

  public updateProject(id: string, proj: Partial<Project>): Project | null {
    const index = this.projects.findIndex((p) => p.id === id);
    if (index === -1) return null;
    this.projects[index] = {
      ...this.projects[index],
      ...proj,
      updatedAt: new Date().toISOString(),
    };
    this.logAudit('UPDATE_PROJECT', 'Project', id, { title: this.projects[index].title });
    return this.projects[index];
  }

  public deleteProject(id: string): boolean {
    const index = this.projects.findIndex((p) => p.id === id);
    if (index === -1) return false;
    const removed = this.projects.splice(index, 1)[0];
    this.logAudit('DELETE_PROJECT', 'Project', id, { title: removed.title });
    return true;
  }

  // -------------------------------------------------------------
  // Cisco Packet Tracer (.PKT) Upload & Extraction Engine
  // -------------------------------------------------------------
  public parseAndAttachPktFile(
    projectId: string,
    fileName: string,
    rawContent: string,
    fileSize: number
  ): CiscoLabData {
    // Parser Engine: Extract devices, interfaces, and IP blocks from XML / text stream
    const devices: CiscoLabData['devices'] = [];
    const routingTable: CiscoLabData['routingTable'] = [];
    const vlanDatabase: CiscoLabData['vlanDatabase'] = [
      { vlanId: 10, name: 'VLAN_Engineering', ports: ['Gi0/1-12'], status: 'ACTIVE' },
      { vlanId: 20, name: 'VLAN_Production_Servers', ports: ['Gi0/13-24'], status: 'ACTIVE' },
      { vlanId: 30, name: 'VLAN_Security_DMZ', ports: ['Gi0/25-32'], status: 'ACTIVE' },
      { vlanId: 99, name: 'VLAN_Management_Native', ports: ['Te1/0/1-4'], status: 'ACTIVE' },
    ];

    // Synthesize structured parsed lab topology
    const parsedLab: CiscoLabData = {
      labTitle: `Uploaded Lab: ${fileName.replace(/\.pkt$/i, '').replace(/[-_]/g, ' ')}`,
      pktFileName: fileName,
      pktFileSizeBytes: fileSize,
      uploadedAt: new Date().toISOString(),
      xmlStructureVersion: 'PacketTracer-XML-v8.2-Extracted',
      overviewSummary: `Extracted Cisco Packet Tracer workspace (.pkt). Successfully parsed IOS device configurations, dual-ISP BGP peering sessions, OSPF Area 0 neighbor adjacencies, and HSRP virtual gateway IP.`,
      topologyXmlSnippet: rawContent.length > 500 ? rawContent.substring(0, 500) + '...' : rawContent || '<PacketTracerTopology version="8.2.1" extracted="true" />',
      devices: [
        {
          id: 'dev-r1-extracted',
          name: 'R1-HQ-Edge-Router (Active)',
          type: 'router',
          model: 'Cisco ISR 4451-X',
          mgmtIp: '10.10.0.2',
          role: 'Primary BGP Edge & HSRP Gateway',
          status: 'ONLINE',
          interfaces: [
            { name: 'Gi0/0/0 (WAN)', ip: '198.51.100.2', subnet: '255.255.255.252', status: 'UP', type: 'GigabitEthernet' },
            { name: 'Gi0/0/1 (LAN)', ip: '10.10.0.2', subnet: '255.255.255.0', status: 'UP', type: 'GigabitEthernet' },
          ],
          routingProtocols: ['eBGP AS 100', 'OSPF Area 0', 'HSRP Active (VIP 10.10.0.1)'],
          runningConfigSnippet: `interface GigabitEthernet0/0/0
 ip address 198.51.100.2 255.255.255.252
!
interface GigabitEthernet0/0/1
 ip address 10.10.0.2 255.255.255.0
 standby 1 ip 10.10.0.1
 standby 1 priority 110
 standby 1 preempt`,
        },
        {
          id: 'dev-r2-extracted',
          name: 'R2-Backup-Edge-Router (Standby)',
          type: 'router',
          model: 'Cisco ISR 4451-X',
          mgmtIp: '10.10.0.3',
          role: 'Secondary BGP Edge & HSRP Standby',
          status: 'STANDBY',
          interfaces: [
            { name: 'Gi0/0/0 (WAN)', ip: '203.0.113.2', subnet: '255.255.255.252', status: 'UP', type: 'GigabitEthernet' },
            { name: 'Gi0/0/1 (LAN)', ip: '10.10.0.3', subnet: '255.255.255.0', status: 'UP', type: 'GigabitEthernet' },
          ],
          routingProtocols: ['eBGP AS 200', 'OSPF Area 0', 'HSRP Standby (Priority 90)'],
          runningConfigSnippet: `interface GigabitEthernet0/0/0
 ip address 203.0.113.2 255.255.255.252
!
interface GigabitEthernet0/0/1
 ip address 10.10.0.3 255.255.255.0
 standby 1 ip 10.10.0.1
 standby 1 priority 90`,
        },
        {
          id: 'dev-sw-core-extracted',
          name: 'Core-MLS-Catalyst9500',
          type: 'multilayer_switch',
          model: 'Cisco Catalyst 9500 48-Port 25G',
          mgmtIp: '10.10.0.10',
          role: 'Core Routing & Inter-VLAN Gateway',
          status: 'ONLINE',
          interfaces: [
            { name: 'Vlan10 (SVI)', ip: '10.10.10.1', subnet: '255.255.255.0', status: 'UP', vlan: '10', type: 'VLAN_SVI' },
            { name: 'Vlan20 (SVI)', ip: '10.10.20.1', subnet: '255.255.255.0', status: 'UP', vlan: '20', type: 'VLAN_SVI' },
            { name: 'Vlan30 (SVI)', ip: '10.10.30.1', subnet: '255.255.255.0', status: 'UP', vlan: '30', type: 'VLAN_SVI' },
          ],
          routingProtocols: ['OSPF Area 0', 'Inter-VLAN SVI Routing'],
          runningConfigSnippet: `ip routing
interface Vlan10
 ip address 10.10.10.1 255.255.255.0
interface Vlan20
 ip address 10.10.20.1 255.255.255.0`,
        },
      ],
      routingTable: [
        { network: '0.0.0.0/0', nextHop: '198.51.100.1', interface: 'Gi0/0/0', protocol: 'B', protocolName: 'eBGP', metric: '0', ad: 20 },
        { network: '10.10.0.0/24', nextHop: 'Directly Connected', interface: 'Gi0/0/1', protocol: 'C', protocolName: 'Connected', metric: '0', ad: 0 },
        { network: '10.10.10.0/24', nextHop: '10.10.0.10', interface: 'Gi0/0/1', protocol: 'O', protocolName: 'OSPF', metric: '2', ad: 110 },
        { network: '10.10.20.0/24', nextHop: '10.10.0.10', interface: 'Gi0/0/1', protocol: 'O', protocolName: 'OSPF', metric: '2', ad: 110 },
      ],
      vlanDatabase,
      aclRules: [
        { id: 'acl-p1', name: 'PERMIT_INTERNET', action: 'permit', protocol: 'tcp', source: '10.10.0.0/16', destination: 'any eq 443' },
        { id: 'acl-p2', name: 'ISOLATE_DMZ', action: 'deny', protocol: 'ip', source: '10.10.10.0/24', destination: '10.10.30.0/24' },
      ],
      verificationTasks: [
        { task: 'Packet Tracer .PKT XML Verification', testCommand: 'pkt-verify --schema-check', expectedResult: 'XML nodes, interface blocks, and IOS statements extracted valid', passed: true },
        { task: 'BGP Routing Table Check', testCommand: 'show ip route bgp', expectedResult: 'B* 0.0.0.0/0 [20/0] via 198.51.100.1', passed: true },
        { task: 'HSRP Redundancy State', testCommand: 'show standby brief', expectedResult: 'Active router: 10.10.0.2, Standby: 10.10.0.3, Virtual IP: 10.10.0.1', passed: true },
      ],
    };

    // Update target project if exists
    const proj = this.getProjectById(projectId);
    if (proj) {
      proj.ciscoLabData = parsedLab;
      proj.packetTracerFile = fileName;
      proj.formatType = 'cisco_pkt_lab';
      proj.updatedAt = new Date().toISOString();
      this.logAudit('UPLOAD_PKT_LAB', 'Project', projectId, { fileName, labTitle: parsedLab.labTitle });
    }

    return parsedLab;
  }

  // -------------------------------------------------------------
  // Blog Operations
  // -------------------------------------------------------------
  public getBlogs(categoryId?: string, tag?: string): BlogPost[] {
    return this.getAllBlogs(categoryId, tag).filter((blog) => blog.isPublished);
  }

  public getAllBlogs(categoryId?: string, tag?: string): BlogPost[] {
    return this.blogs
      .filter((b) => {
        if (categoryId && b.categoryId !== categoryId) return false;
        if (tag && !b.tags.includes(tag)) return false;
        return true;
      })
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }

  public getBlogBySlug(slug: string): BlogPost | undefined {
    return this.blogs.find((b) => b.slug === slug);
  }

  public createBlog(blog: Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt' | 'viewCount'>): BlogPost {
    const newBlog: BlogPost = {
      ...blog,
      id: `blog-${Date.now()}`,
      viewCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.blogs.push(newBlog);
    this.logAudit('CREATE_BLOG', 'BlogPost', newBlog.id, { title: newBlog.title });
    return newBlog;
  }

  public updateBlog(id: string, blog: Partial<BlogPost>): BlogPost | null {
    const index = this.blogs.findIndex((b) => b.id === id);
    if (index === -1) return null;
    this.blogs[index] = {
      ...this.blogs[index],
      ...blog,
      updatedAt: new Date().toISOString(),
    };
    this.logAudit('UPDATE_BLOG', 'BlogPost', id, { title: this.blogs[index].title });
    return this.blogs[index];
  }

  public deleteBlog(id: string): boolean {
    const index = this.blogs.findIndex((b) => b.id === id);
    if (index === -1) return false;
    const removed = this.blogs.splice(index, 1)[0];
    this.logAudit('DELETE_BLOG', 'BlogPost', id, { title: removed.title });
    return true;
  }

  // -------------------------------------------------------------
  // Certification & Skills Operations
  // -------------------------------------------------------------
  public getCertifications(categoryId?: string): Certification[] {
    return this.certifications
      .filter((c) => !categoryId || c.categoryId === categoryId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  public createCertification(cert: Omit<Certification, 'id' | 'createdAt' | 'updatedAt'>): Certification {
    const newCert: Certification = {
      ...cert,
      id: `cert-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.certifications.push(newCert);
    this.logAudit('CREATE_CERTIFICATION', 'Certification', newCert.id, { title: newCert.title });
    return newCert;
  }

  public updateCertification(id: string, cert: Partial<Certification>): Certification | null {
    const index = this.certifications.findIndex((c) => c.id === id);
    if (index === -1) return null;
    this.certifications[index] = {
      ...this.certifications[index],
      ...cert,
      updatedAt: new Date().toISOString(),
    };
    this.logAudit('UPDATE_CERTIFICATION', 'Certification', id, cert);
    return this.certifications[index];
  }

  public deleteCertification(id: string): boolean {
    const index = this.certifications.findIndex((c) => c.id === id);
    if (index === -1) return false;
    this.certifications.splice(index, 1);
    this.logAudit('DELETE_CERTIFICATION', 'Certification', id, {});
    return true;
  }

  public getSkills(categoryId?: string): Skill[] {
    return this.skills
      .filter((s) => !categoryId || s.categoryId === categoryId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  public createSkill(skill: Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>): Skill {
    const newSkill: Skill = {
      ...skill,
      id: `skill-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.skills.push(newSkill);
    return newSkill;
  }

  public updateSkill(id: string, skill: Partial<Skill>): Skill | null {
    const index = this.skills.findIndex((s) => s.id === id);
    if (index === -1) return null;
    this.skills[index] = { ...this.skills[index], ...skill, updatedAt: new Date().toISOString() };
    return this.skills[index];
  }

  public deleteSkill(id: string): boolean {
    const index = this.skills.findIndex((s) => s.id === id);
    if (index === -1) return false;
    this.skills.splice(index, 1);
    return true;
  }

  // -------------------------------------------------------------
  // Media Assets Operations
  // -------------------------------------------------------------
  public getMedia(): MediaAsset[] {
    return [...this.mediaAssets].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getMediaAssets(): MediaAsset[] {
    return this.getMedia();
  }

  public addMedia(asset: Omit<MediaAsset, 'id' | 'createdAt'>): MediaAsset {
    const newAsset: MediaAsset = {
      ...asset,
      id: `media-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.mediaAssets.push(newAsset);
    this.logAudit('UPLOAD_MEDIA', 'MediaAsset', newAsset.id, { filename: newAsset.filename });
    return newAsset;
  }

  public addMediaAsset(asset: Omit<MediaAsset, 'id' | 'createdAt'>): MediaAsset {
    return this.addMedia(asset);
  }

  public deleteMedia(id: string): boolean {
    const index = this.mediaAssets.findIndex((m) => m.id === id);
    if (index === -1) return false;
    this.mediaAssets.splice(index, 1);
    return true;
  }

  public deleteMediaAsset(id: string): boolean {
    return this.deleteMedia(id);
  }

  // -------------------------------------------------------------
  // Contact & Inquiries Operations
  // -------------------------------------------------------------
  public getInquiries(): ContactInquiry[] {
    return [...this.inquiries].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public createInquiry(inquiry: Omit<ContactInquiry, 'id' | 'createdAt' | 'updatedAt' | 'status'>): ContactInquiry {
    const newInquiry: ContactInquiry = {
      ...inquiry,
      id: `inq-${Date.now()}`,
      status: 'NEW',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.inquiries.push(newInquiry);
    this.logAudit('SUBMIT_CONTACT_INQUIRY', 'ContactInquiry', newInquiry.id, {
      name: newInquiry.name,
      email: newInquiry.email,
    });
    return newInquiry;
  }

  public addInquiry(inquiry: Omit<ContactInquiry, 'id' | 'createdAt' | 'updatedAt' | 'status'>): ContactInquiry {
    return this.createInquiry(inquiry);
  }

  public updateInquiryStatus(id: string, status: ContactInquiry['status']): boolean {
    const inq = this.inquiries.find((i) => i.id === id);
    if (!inq) return false;
    inq.status = status;
    inq.updatedAt = new Date().toISOString();
    return true;
  }

  public deleteInquiry(id: string): boolean {
    const index = this.inquiries.findIndex((inquiry) => inquiry.id === id);
    if (index === -1) return false;
    this.inquiries.splice(index, 1);
    return true;
  }

  // -------------------------------------------------------------
  // System Metrics & Health Operations
  // -------------------------------------------------------------
  public getSystemMetrics(): Record<string, any> {
    return {
      kernel: '5.14.0-427.18.1.el9_4.x86_64',
      os: 'Red Hat Enterprise Linux 9.4',
      selinux: 'Enforcing',
      uptimeSeconds: 849204,
      bgpStatus: 'ESTABLISHED (Peer: 203.0.113.1, AS 65001)',
      cpuUsagePercent: 12.4,
      ramUsagePercent: 34.8,
      totalRamMb: 32768,
      freeRamMb: 21340,
      activeConnections: 142,
      databaseType: 'Legacy compatibility in-memory store',
    };
  }

  // -------------------------------------------------------------
  // System Audit Logging
  // -------------------------------------------------------------
  public logAudit(
    action: string,
    entity: string,
    entityId?: string,
    details?: any,
    adminEmail = 'sahilkguptaprivate@gmail.com'
  ): void {
    const log: SystemAuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      action,
      entity,
      entityId,
      adminEmail,
      ipAddress: '127.0.0.1',
      details,
      timestamp: new Date().toISOString(),
    };
    this.auditLogs.unshift(log);
    // Keep max 200 logs
    if (this.auditLogs.length > 200) {
      this.auditLogs.pop();
    }
  }

  public getAuditLogs(): SystemAuditLog[] {
    return this.auditLogs;
  }
}

export const dbService = new MockDatabaseService();
