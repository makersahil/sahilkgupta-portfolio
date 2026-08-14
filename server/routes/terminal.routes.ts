import { Router } from 'express';

const router = Router();

interface TerminalCommandResult {
  output: string;
  exitCode: number;
  type?: 'stdout' | 'stderr' | 'table' | 'banner' | 'system' | 'cisco';
}

router.post('/exec', async (req, res) => {
  const { command, category } = req.body;
  const cmd = (command || '').trim();

  if (!cmd) {
    res.json({ output: '', exitCode: 0 });
    return;
  }

  const parts = cmd.split(/\s+/);
  const root = parts[0].toLowerCase();
  const args = parts.slice(1);

  let result: TerminalCommandResult = {
    output: '',
    exitCode: 0,
    type: 'stdout',
  };

  switch (root) {
    case 'help':
    case '?':
      result.output = `\x1b[38;2;6,182,212mInfrastructure CLI & Systems Terminal Environment (Networking | Linux | DevOps)\x1b[0m
Available Linux, Cisco IOS, and DevOps command suites:

\x1b[38;2;16,185,129m[Enterprise Linux & Systems]\x1b[0m
  \x1b[33mneofetch\x1b[0m           - Display system specifications & kernel info
  \x1b[33muname -a\x1b[0m           - Print Linux kernel architecture & release
  \x1b[33msestatus\x1b[0m           - Inspect SELinux security context & enforcing mode
  \x1b[33msystemctl\x1b[0m          - Manage systemd daemons (e.g. systemctl status nginx)
  \x1b[33mlsblk / stratis\x1b[0m    - Inspect block storage, LVM pools, and VDO
  \x1b[33mip a / ip route\x1b[0m    - Network interface addresses and routing table
  \x1b[33mhtop / top\x1b[0m         - Process monitor snapshot & CPU/RAM load

\x1b[38;2;59,130,246m[Enterprise Networking & Cisco]\x1b[0m
  \x1b[33mcisco show run\x1b[0m     - Inspect Cisco IOS running configuration
  \x1b[33mcisco show ip route\x1b[0m- Display OSPF/BGP routing table
  \x1b[33mcisco show vlan\x1b[0m    - Display VLAN segmentation database
  \x1b[33mping <target>\x1b[0m      - Execute ICMP Echo probe with latency jitter
  \x1b[33mtraceroute <ip>\x1b[0m    - Multi-hop layer-3 route trace

\x1b[38;2;139,92,246m[DevOps & Cloud Automation]\x1b[0m
  \x1b[33mkubectl get nodes\x1b[0m  - Query Kubernetes cluster node pool
  \x1b[33mkubectl get pods\x1b[0m   - Inspect running microservices & CNI pods
  \x1b[33mdocker ps\x1b[0m          - List active OCI containers
  \x1b[33mterraform plan\x1b[0m     - Simulate infrastructure-as-code deployment

\x1b[38;2;245,158,11m[Interactive Automation Scripts]\x1b[0m
  \x1b[32m./deploy_k8s.sh\x1b[0m       - Run full GitOps Kubernetes provisioning loop
  \x1b[32m./configure_ospf.sh\x1b[0m   - Provision Cisco OSPF Area 0 backbone
  \x1b[32m./selinux_audit.sh\x1b[0m    - Run automated SELinux audit & policy fix
  \x1b[32m./benchmark_storage.sh\x1b[0m- Benchmark LVM/Stratis storage throughput`;
      break;

    case 'neofetch':
      result.output = `\x1b[38;2;16,185,129m       _,met$$$$$gg.          \x1b[38;2;6,182,212mroot@infrastructure-node01\x1b[0m
\x1b[38;2;16,185,129m    ,g$$$$$$$$$$$$$$$P.       \x1b[38;2;156,163,175m-----------------------\x1b[0m
\x1b[38;2;16,185,129m  ,g$$P"     """Y$$.".        \x1b[38;2;245,158,11mOS:\x1b[0m Red Hat Enterprise Linux 9.4
\x1b[38;2;16,185,129m ,$$P'              \`$$$.     \x1b[38;2;245,158,11mHost:\x1b[0m KVM / Cisco UCS C240 M5
\x1b[38;2;16,185,129m',$$P       ,ggs.     \`$$b:   \x1b[38;2;245,158,11mKernel:\x1b[0m 5.14.0-427.18.1.el9_4.x86_64
\x1b[38;2;16,185,129m\`d$$'     ,$P"'   .    $$$    \x1b[38;2;245,158,11mUptime:\x1b[0m 184 days, 14 hours, 22 mins
\x1b[38;2;16,185,129m $$P      d$'     ,    $$P    \x1b[38;2;245,158,11mPackages:\x1b[0m 1420 (rpm), 18 (flatpak)
\x1b[38;2;16,185,129m $$:      $$.   -    ,d$$'    \x1b[38;2;245,158,11mShell:\x1b[0m bash 5.1.8
\x1b[38;2;16,185,129m $$;      Y$b._   _,d$P'      \x1b[38;2;245,158,11mTerminal:\x1b[0m WebTTY (xterm-256color)
\x1b[38;2;16,185,129m Y$$.    \`."Y$$$$P"'          \x1b[38;2;245,158,11mCPU:\x1b[0m AMD EPYC 7763 64-Core Processor (16) @ 2.449GHz
\x1b[38;2;16,185,129m  \`$$b      "-.__             \x1b[38;2;245,158,11mMemory:\x1b[0m 8421MiB / 32140MiB (26%)
\x1b[38;2;16,185,129m   \`Y$$                       \x1b[38;2;245,158,11mStudy Progress:\x1b[0m CCNA (70%) | RHCSA (50%) | DevOps
\x1b[38;2;16,185,129m     \`$$b.                    \x1b[38;2;245,158,11mLocation:\x1b[0m Ahmedabad, Gujarat, India`;
      break;

    case 'uname':
      if (args.includes('-a') || args.includes('-r')) {
        result.output = 'Linux infrastructure-node01 5.14.0-427.18.1.el9_4.x86_64 #1 SMP PREEMPT_DYNAMIC SMP x86_64 GNU/Linux';
      } else {
        result.output = 'Linux';
      }
      break;

    case 'sestatus':
      result.output = `SELinux status:                 enabled
SELinuxfs mount:                /sys/fs/selinux
SELinux root directory:         /etc/selinux
Loaded policy name:             targeted
Current mode:                   enforcing
Mode from config file:          enforcing
Policy MLS status:              enabled
Policy deny_unknown status:     allowed
Memory protection checking:     actual (secure)
Max kernel policy version:      33`;
      break;

    case 'getenforce':
      result.output = 'Enforcing';
      break;

    case 'systemctl':
      if (args.includes('status')) {
        const service = args[args.indexOf('status') + 1] || 'nginx';
        result.output = `● ${service}.service - Enterprise High-Performance Daemon
     Loaded: loaded (/usr/lib/systemd/system/${service}.service; enabled; preset: disabled)
     Active: \x1b[32mactive (running)\x1b[0m since Mon 2026-08-10 04:12:08 UTC; 4 days ago
   Main PID: 18492 (nginx)
      Tasks: 8 (limit: 4915)
     Memory: 42.4M (limit: 512.0M)
        CPU: 1min 14.829s
     CGroup: /system.slice/${service}.service
             ├─18492 "nginx: master process /usr/sbin/nginx -g daemon on; master_process on;"
             └─18494 "nginx: worker process"

Aug 10 04:12:08 nexus-node01 systemd[1]: Starting ${service}.service...
Aug 10 04:12:08 nexus-node01 systemd[1]: Started ${service}.service.`;
      } else if (args.includes('list-units') || args.length === 0) {
        result.output = `UNIT                        LOAD   ACTIVE SUB     DESCRIPTION
sshd.service                loaded active running OpenSSH server daemon
firewalld.service           loaded active running firewalld - dynamic firewall daemon
stratisd.service            loaded active running Stratis storage management daemon
containerd.service          loaded active running containerd container runtime
kubelet.service             loaded active running kubelet: The Kubernetes Node Agent
cilium.service              loaded active running Cilium eBPF Agent & BGP Control Plane
chronyd.service             loaded active running NTP client/server`;
      } else {
        result.output = `systemctl: Operation performed on target units successfully.`;
      }
      break;

    case 'ip':
      if (args.includes('a') || args.includes('addr')) {
        result.output = `1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc mq state UP group default qlen 1000
    link/ether 52:54:00:1a:2b:3c brd ff:ff:ff:ff:ff:ff
    inet 192.168.10.254/24 brd 192.168.10.255 scope global dynamic eth0
       valid_lft 82400sec preferred_lft 82400sec
3: cilium_net@cilium_host: <BROADCAST,MULTICAST,NOARP,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    inet 10.244.1.1/32 scope global cilium_net`;
      } else if (args.includes('route') || args.includes('r')) {
        result.output = `default via 192.168.10.1 dev eth0 proto dhcp src 192.168.10.254 metric 100
10.244.0.0/16 via 10.244.1.1 dev cilium_host proto cilium src 10.244.1.1
192.168.10.0/24 dev eth0 proto kernel scope link src 192.168.10.254 metric 100`;
      } else {
        result.output = `Usage: ip [ address | route | link | rule ]`;
      }
      break;

    case 'lsblk':
      result.output = `NAME                   MAJ:MIN RM  SIZE RO TYPE MOUNTPOINTS
vda                    252:0    0  200G  0 disk 
├─vda1                 252:1    0    1G  0 part /boot
└─vda2                 252:2    0  199G  0 part 
  ├─rhel-root          253:0    0  120G  0 lvm  /
  ├─rhel-swap          253:1    0    8G  0 lvm  [SWAP]
  └─rhel-stratis_pool  253:2    0   71G  0 lvm  
vdb                    252:16   0  500G  0 disk 
└─stratis-1-pool_vdo   253:3    0  1.5T  0 stratis /data/enterprise_storage`;
      break;

    case 'cisco':
      const ciscoSub = args.join(' ');
      if (ciscoSub.includes('show run') || ciscoSub.includes('show running-config')) {
        result.output = `Building configuration...
Current configuration : 3824 bytes
!
version 15.7
service timestamps debug datetime msec
service timestamps log datetime msec
no service password-encryption
!
hostname Core-R1-HQ
!
boot-start-marker
boot-end-marker
!
ip routing
ipv6 unicast-routing
!
interface GigabitEthernet0/0/0
 description UPLINK_TO_ISP1_PRIMARY
 ip address 198.51.100.2 255.255.255.252
 duplex auto
 speed auto
!
interface GigabitEthernet0/0/1
 description TRUNK_TO_CORE_SWITCH_SW1
 ip address 10.10.0.1 255.255.255.0
 ip ospf 1 area 0
!
router ospf 1
 router-id 1.1.1.1
 network 10.10.0.0 0.0.255.255 area 0
!
router bgp 65001
 bgp log-neighbor-changes
 neighbor 198.51.100.1 remote-as 100
 neighbor 198.51.100.1 description ISP1_BGP_PEER
 neighbor 198.51.100.1 route-map PREFER_ISP1 in
!
end`;
      } else if (ciscoSub.includes('show ip route')) {
        result.output = `Codes: L - local, C - connected, S - static, R - RIP, M - mobile, B - BGP
       D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area 
       N1 - OSPF NSSA external type 1, N2 - OSPF NSSA external type 2
       E1 - OSPF external type 1, E2 - OSPF external type 2

Gateway of last resort is 198.51.100.1 to network 0.0.0.0

B*    0.0.0.0/0 [20/0] via 198.51.100.1, 4d18h
      10.0.0.0/8 is variably subnetted, 6 subnets, 2 masks
C        10.10.0.0/24 is directly connected, GigabitEthernet0/0/1
L        10.10.0.1/32 is directly connected, GigabitEthernet0/0/1
O        10.20.0.0/24 [110/2] via 10.10.0.2, 3d12h, GigabitEthernet0/0/1
O        10.30.0.0/24 [110/3] via 10.10.0.2, 3d12h, GigabitEthernet0/0/1
B     172.16.0.0/16 [200/0] via 10.254.0.2, 4d18h`;
      } else if (ciscoSub.includes('show vlan')) {
        result.output = `VLAN Name                             Status    Ports
---- -------------------------------- --------- -------------------------------
1    default                          active    Fa0/1, Fa0/2
10   ENGINEERING_DEVOPS               active    Fa0/3, Fa0/4, Fa0/5
20   PRODUCTION_SERVERS               active    Fa0/6, Fa0/7, Fa0/8, Fa0/9
30   DMZ_EXTERNAL_VIP                 active    Fa0/10, Fa0/11
99   NATIVE_MANAGEMENT                active    Gi0/1, Gi0/2`;
      } else {
        result.output = `Cisco IOS CLI: Try 'cisco show run', 'cisco show ip route', or 'cisco show vlan'`;
      }
      break;

    case 'kubectl':
      if (args.includes('get') && args.includes('nodes')) {
        result.output = `NAME                    STATUS   ROLES           AGE    VERSION        INTERNAL-IP
nexus-k8s-control-01    Ready    control-plane   120d   v1.30.2+k3s1   192.168.10.10
nexus-k8s-worker-01     Ready    worker          120d   v1.30.2+k3s1   192.168.10.11
nexus-k8s-worker-02     Ready    worker          120d   v1.30.2+k3s1   192.168.10.12
nexus-k8s-worker-03     Ready    worker          120d   v1.30.2+k3s1   192.168.10.13`;
      } else if (args.includes('get') && (args.includes('pods') || args.includes('po'))) {
        result.output = `NAMESPACE      NAME                               READY   STATUS    RESTARTS   AGE
kube-system    cilium-2f88a                       1/1     Running   0          42d
kube-system    cilium-operator-79df4b87f9-6xqkw   1/1     Running   0          42d
kube-system    coredns-ccb96694c-hvx92            1/1     Running   0          120d
production     api-gateway-68bfdb659d-4kx2p       2/2     Running   0          14d
production     auth-service-5bb77fc5dc-8nzl1      2/2     Running   0          14d
production     vault-0                            1/1     Running   0          30d
monitoring     prometheus-k8s-0                   2/2     Running   0          60d`;
      } else {
        result.output = `kubectl command simulated. Available: 'kubectl get nodes', 'kubectl get pods -A'`;
      }
      break;

    case 'docker':
      result.output = `CONTAINER ID   IMAGE                                COMMAND                  CREATED        STATUS        PORTS                    NAMES
a4f891b2c3d4   infra/cilium-ebpf:v1.16.0         "/usr/bin/cilium-age…"   3 weeks ago    Up 3 weeks                             cilium-agent
f1e2d3c4b5a6   hashicorp/vault:1.16.2               "vault server -confi…"   1 month ago    Up 1 month    0.0.0.0:8200->8200/tcp   vault-prod
9876543210ab   prom/prometheus:v2.52.0              "/bin/prometheus --c…"   2 months ago   Up 2 months   0.0.0.0:9090->9090/tcp   prometheus`;
      break;

    case 'ping':
      const target = args[0] || '1.1.1.1';
      result.output = `PING ${target} (${target}) 56(84) bytes of data.
64 bytes from ${target}: icmp_seq=1 ttl=58 time=3.14 ms
64 bytes from ${target}: icmp_seq=2 ttl=58 time=2.98 ms
64 bytes from ${target}: icmp_seq=3 ttl=58 time=3.02 ms
64 bytes from ${target}: icmp_seq=4 ttl=58 time=3.10 ms

--- ${target} ping statistics ---
4 packets transmitted, 4 received, 0% packet loss, time 3004ms
rtt min/avg/max/mdev = 2.980/3.060/3.140/0.065 ms`;
      break;

    case 'traceroute':
      const traceTarget = args[0] || '8.8.8.8';
      result.output = `traceroute to ${traceTarget} (${traceTarget}), 30 hops max, 60 byte packets
 1  gateway.infra.lan (192.168.10.1)  0.412 ms  0.380 ms  0.365 ms
 2  198.51.100.1 (198.51.100.1) [AS100 Primary Uplink]  1.482 ms  1.520 ms  1.490 ms
 3  core-backbone-nyc.isp1.net (198.51.200.45)  2.890 ms  2.910 ms  2.880 ms
 4  dns.google (${traceTarget}) [AS15169 Google LLC]  3.045 ms  3.020 ms  3.010 ms`;
      break;

    case './deploy_k8s.sh':
      result.output = `\x1b[38;2;6,182,212m[+] Initializing GitOps Kubernetes Automated Rollout Loop...\x1b[0m
[1/5] Verifying Terraform state integrity in S3 bucket 'nexus-tfstate'... \x1b[32m[OK]\x1b[0m
[2/5] Running Trivy vulnerability scan against container images... \x1b[32m[SCANNED]\x1b[0m
[3/5] Applying Cilium eBPF L7 NetworkPolicies to namespace 'platform-lab'... \x1b[32m[ENFORCED]\x1b[0m
[4/5] Syncing ArgoCD Application 'nexus-enterprise-stack' to commit HEAD (a49f82c)... \x1b[32m[SYNCED]\x1b[0m
[5/5] Executing Prometheus canary health checks (Lab Telemetry)... \x1b[32m[VERIFIED]\x1b[0m

\x1b[38;2;16,185,129m✔ DEPLOYMENT SUCCESSFUL: Lab rollout replay completed.\x1b[0m`;
      break;

    case './configure_ospf.sh':
      result.output = `\x1b[38;2;59,130,246m[+] Cisco IOS Automated OSPF Area 0 Provisioning Loop...\x1b[0m
[1/4] Establishing SSHv2 Session to Core-R1 (10.10.0.1:22) via Paramiko/Netmiko... \x1b[32m[CONNECTED]\x1b[0m
[2/4] Pushing router ospf 1 configuration with MD5 cryptographic key-chain... \x1b[32m[APPLIED]\x1b[0m
[3/4] Validating 2-Way to FULL neighbor adjacency with Core-R2 (10.10.0.2)... \x1b[32m[ADJACENCY FULL/BDR]\x1b[0m
[4/4] Verifying LSA Type-1 Router & Type-2 Network Database Convergence... \x1b[32m[CONVERGED]\x1b[0m

\x1b[38;2;16,185,129m✔ OSPF TOPOLOGY VERIFIED: 16 subnets redistributed into OSPF Area 0.\x1b[0m`;
      break;

    case './selinux_audit.sh':
      result.output = `\x1b[38;2;16,185,129m[+] RHCSA Automated SELinux Audit & Policy Remediation Engine...\x1b[0m
[1/4] Querying /var/log/audit/audit.log for AVC denials in last 24h... \x1b[32m[FOUND 2 DENIALS]\x1b[0m
[2/4] Parsing denial: httpd_t attempting write to non-standard /srv/data/uploads...
[3/4] Executing: semanage fcontext -a -t httpd_sys_rw_content_t "/srv/data/uploads(/.*)?" \x1b[32m[APPLIED]\x1b[0m
[4/4] Running restorecon -Rv /srv/data/uploads... \x1b[32m[RELABELED 48 FILES]\x1b[0m

\x1b[38;2;16,185,129m✔ AUDIT COMPLETE: All processes running strictly in Enforcing mode with zero AVC violations.\x1b[0m`;
      break;

    case './benchmark_storage.sh':
      result.output = `\x1b[38;2;245,158,11m[+] Stratis & VDO Enterprise Storage Benchmark...\x1b[0m
Allocating 50GB uncompressed test payload...
Measuring deduplication ratio: \x1b[32m3.24:1 (68% physical disk savings)\x1b[0m
Inline LZ4 compression throughput: \x1b[32m1,840 MB/sec\x1b[0m
Sequential Read: \x1b[32m3,420 MB/s\x1b[0m | Random 4K IOPS: \x1b[32m145,000 IOPS\x1b[0m
LUKS2 Cryptographic overhead: \x1b[32m< 1.8%\x1b[0m

\x1b[38;2;16,185,129m✔ BENCHMARK FINISHED: Enterprise storage pool baseline test completed.\x1b[0m`;
      break;

    case 'clear':
      result.output = '__CLEAR__';
      break;

    case 'whoami':
      result.output = 'sahil.gupta (CCNA Prep: 70% | RHCSA Prep: 50% | Networking, Linux & DevOps | Ahmedabad, India)';
      break;

    case 'uptime':
      result.output = ' 01:14:10 up 184 days, 14:22,  2 users,  load average: 0.12, 0.08, 0.05';
      break;

    default:
      result.output = `bash: ${root}: command not found. Type 'help' to see available Linux, Cisco IOS, and DevOps commands.`;
      result.exitCode = 127;
      break;
  }

  res.json(result);
});

export default router;
