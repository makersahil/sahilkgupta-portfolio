import {
  ContentStatus,
  Domain,
  LabInputSourceKind,
  LabKind,
  LabStatus,
  Prisma,
  ProjectFormatType,
  ProjectLifecycleStatus,
} from '@prisma/client';
import { prisma } from '../server/lib/prisma';
import type {
  BlogPost as ApiBlogPost,
  Category as ApiCategory,
  Certification as ApiCertification,
  Project as ApiProject,
  Skill as ApiSkill,
} from '../server/types/index.js';

interface SeedSnapshot {
  categories: ApiCategory[];
  projects: ApiProject[];
  blogs: ApiBlogPost[];
  certifications: ApiCertification[];
  skills: ApiSkill[];
}

const seedSnapshot = {
  "categories": [
    {
      "id": "cat-networking",
      "slug": "networking",
      "name": "Networking",
      "tagline": "Enterprise Routing, Switching, Cisco Packet Tracer Labs & WAN Topologies",
      "description": "Interactive Cisco Packet Tracer sandbox workspaces, BGP/OSPF dual-homed WAN topologies, EtherChannel trunks, HSRP failover, and ACL security.",
      "icon": "Network",
      "accentColor": "#00d4ff",
      "terminalTheme": "cyan",
      "sortOrder": 1,
      "isPublished": true,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2026-08-14T18:34:30.902Z"
    },
    {
      "id": "cat-linux",
      "slug": "linux",
      "name": "Linux",
      "tagline": "Enterprise Linux Administration, Storage Systems, Systemd & Kernel Hardening",
      "description": "Enterprise Linux administration, storage architecture (LVM/Stratis), systemd unit tuning, SELinux enforcement, and automated bash auditing.",
      "icon": "Terminal",
      "accentColor": "#00ff41",
      "terminalTheme": "green",
      "sortOrder": 2,
      "isPublished": true,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2026-08-14T18:34:30.902Z"
    },
    {
      "id": "cat-devops",
      "slug": "devops",
      "name": "DevOps",
      "tagline": "Kubernetes Orchestration, CI/CD GitOps Automation & Terraform IaC",
      "description": "GitOps multi-stage deployment pipelines, automated ArgoCD synchronizations, Cilium eBPF network overlays, and modular Terraform infrastructure.",
      "icon": "ServerCog",
      "accentColor": "#06b6d4",
      "terminalTheme": "cyan",
      "sortOrder": 3,
      "isPublished": true,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2026-08-14T18:34:30.902Z"
    }
  ],
  "projects": [
    {
      "id": "proj-cisco-wan-pkt",
      "title": "Enterprise Multi-Homed WAN with Dual ISP BGP, OSPF Area 0 & HSRP Gateway Redundancy",
      "slug": "cisco-enterprise-wan-bgp-hsrp",
      "summary": "Interactive Networking lab backed by persisted topology, device configuration, routing, VLAN, ACL, and Packet Tracer reference metadata.",
      "descriptionMarkdown": "### Enterprise WAN Infrastructure Design\nThis project demonstrates an enterprise-style lab architecture built and validated in **Cisco Packet Tracer** and verified against Cisco IOS-XE standards.\n\n#### Core Architectural Achievements:\n1. **Multi-Homed BGP Routing**: Implemented eBGP peering to ISP-1 (AS 100) and ISP-2 (AS 200) with autonomous system prepending and BGP Local Preference to control inbound and outbound traffic flows.\n2. **First Hop Redundancy (HSRP)**: Configured HSRP Group 1 providing virtual IP `10.10.0.1` with interface tracking on WAN links to automatically demote primary priority from 110 to 85 on link failure.\n3. **Core Inter-VLAN Routing**: Catalyst 9500 Multi-Layer Switch with SVIs for Engineering (`VLAN 10`), Servers (`VLAN 20`), and DMZ (`VLAN 30`).\n4. **Security ACLs**: Extended Access Control Lists blocking inter-VLAN lateral movement while permitting encrypted HTTPS egress.",
      "categoryId": "cat-networking",
      "status": "COMPLETED",
      "formatType": "cisco_pkt_lab",
      "isFeatured": true,
      "sortOrder": 1,
      "coverImageUrl": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1000&q=80",
      "devopsStack": [
        "Cisco IOS-XE",
        "Packet Tracer 8.2",
        "BGP AS 65001",
        "OSPF Area 0",
        "HSRP",
        "802.1Q VLANs"
      ],
      "tags": [
        "Cisco",
        "CCNA",
        "BGP",
        "OSPF",
        "HSRP",
        "Packet-Tracer"
      ],
      "metrics": {
        "Lab Topology": "Dual-Homed WAN",
        "WAN Uplinks": "Dual 10G",
        "VLANs Segmented": 4,
        "Test Suite": "Lab Checks Completed"
      },
      "ciscoLabData": {
        "labTitle": "Enterprise Multi-Homed WAN with Dual ISP BGP, OSPF Area 0 & HSRP Gateway Redundancy",
        "pktFileName": "enterprise_wan_dual_isp_bgp_hsrp.pkt",
        "pktFileSizeBytes": 184520,
        "uploadedAt": "2025-02-15T00:00:00.000Z",
        "xmlStructureVersion": "PacketTracer-XML-v8.2.1",
        "overviewSummary": "Complete Cisco enterprise infrastructure integrating eBGP uplinks to redundant service providers (AS 100 & AS 200), iBGP core routing, OSPF Area 0 backbone, HSRP virtual IP 10.10.0.1 for high-availability default gateway failover, and 802.1Q VLAN trunking.",
        "topologyXmlSnippet": "<PacketTracerTopology version=\"8.2.1\">\n  <NetworkWorkspace name=\"Enterprise_HQ_WAN\">\n    <Device type=\"Router\" name=\"R1-HQ-Edge\" model=\"Cisco ISR 4451-X\">\n      <Interface name=\"GigabitEthernet0/0/0\" ip=\"198.51.100.2\" mask=\"255.255.255.252\" status=\"UP\" />\n      <Interface name=\"GigabitEthernet0/0/1\" ip=\"10.10.0.2\" mask=\"255.255.255.0\" status=\"UP\" hsrpGroup=\"1\" hsrpIp=\"10.10.0.1\" priority=\"110\" />\n      <BGP as=\"65001\" neighbor=\"198.51.100.1\" remoteAs=\"100\" />\n      <OSPF process=\"1\" area=\"0.0.0.0\" routerId=\"1.1.1.1\" />\n    </Device>\n    <Device type=\"Router\" name=\"R2-Backup-Edge\" model=\"Cisco ISR 4451-X\">\n      <Interface name=\"GigabitEthernet0/0/0\" ip=\"203.0.113.2\" mask=\"255.255.255.252\" status=\"UP\" />\n      <Interface name=\"GigabitEthernet0/0/1\" ip=\"10.10.0.3\" mask=\"255.255.255.0\" status=\"UP\" hsrpGroup=\"1\" hsrpIp=\"10.10.0.1\" priority=\"90\" />\n      <BGP as=\"65001\" neighbor=\"203.0.113.1\" remoteAs=\"200\" />\n      <OSPF process=\"1\" area=\"0.0.0.0\" routerId=\"2.2.2.2\" />\n    </Device>\n    <Device type=\"MultilayerSwitch\" name=\"SW-Core-MLS\" model=\"Cisco Catalyst 9500\">\n      <SVI vlan=\"10\" ip=\"10.10.10.1\" mask=\"255.255.255.0\" name=\"VLAN_Engineering\" />\n      <SVI vlan=\"20\" ip=\"10.10.20.1\" mask=\"255.255.255.0\" name=\"VLAN_Servers\" />\n      <SVI vlan=\"30\" ip=\"10.10.30.1\" mask=\"255.255.255.0\" name=\"VLAN_DMZ\" />\n      <Trunk ports=\"Te1/0/1-2\" allowedVlans=\"10,20,30,99\" native=\"99\" />\n    </Device>\n  </NetworkWorkspace>\n</PacketTracerTopology>",
        "devices": [
          {
            "id": "isp1",
            "name": "ISP-1 Primary Uplink (AS 100)",
            "type": "isp",
            "model": "Carrier Edge Gateway",
            "mgmtIp": "198.51.100.1",
            "role": "External Tier-1 Carrier",
            "status": "ONLINE",
            "interfaces": [
              {
                "name": "Gi0/0/0",
                "ip": "198.51.100.1",
                "subnet": "255.255.255.252",
                "status": "UP",
                "type": "GigabitEthernet"
              }
            ],
            "routingProtocols": [
              "eBGP AS 100"
            ],
            "runningConfigSnippet": "router bgp 100\n bgp router-id 198.51.100.1\n neighbor 198.51.100.2 remote-as 65001\n neighbor 198.51.100.2 description HQ-Edge-Primary\n network 0.0.0.0"
          },
          {
            "id": "isp2",
            "name": "ISP-2 Secondary Uplink (AS 200)",
            "type": "isp",
            "model": "Carrier Edge Gateway",
            "mgmtIp": "203.0.113.1",
            "role": "External Secondary Carrier",
            "status": "ONLINE",
            "interfaces": [
              {
                "name": "Gi0/0/0",
                "ip": "203.0.113.1",
                "subnet": "255.255.255.252",
                "status": "UP",
                "type": "GigabitEthernet"
              }
            ],
            "routingProtocols": [
              "eBGP AS 200"
            ],
            "runningConfigSnippet": "router bgp 200\n bgp router-id 203.0.113.1\n neighbor 203.0.113.2 remote-as 65001\n neighbor 203.0.113.2 description HQ-Edge-Backup\n network 0.0.0.0"
          },
          {
            "id": "r1",
            "name": "R1-HQ-Edge-Router (Active HSRP)",
            "type": "router",
            "model": "Cisco ISR 4451-X",
            "mgmtIp": "10.10.0.2",
            "role": "Primary BGP Edge & HSRP Active Gateway",
            "status": "ONLINE",
            "interfaces": [
              {
                "name": "Gi0/0/0 (WAN)",
                "ip": "198.51.100.2",
                "subnet": "255.255.255.252",
                "status": "UP",
                "type": "GigabitEthernet"
              },
              {
                "name": "Gi0/0/1 (LAN)",
                "ip": "10.10.0.2",
                "subnet": "255.255.255.0",
                "status": "UP",
                "type": "GigabitEthernet"
              },
              {
                "name": "Loopback0",
                "ip": "1.1.1.1",
                "subnet": "255.255.255.255",
                "status": "UP",
                "type": "Loopback"
              }
            ],
            "routingProtocols": [
              "eBGP (AS 65001 <-> 100)",
              "iBGP (R1 <-> R2)",
              "OSPF Area 0",
              "HSRP Group 1"
            ],
            "runningConfigSnippet": "interface GigabitEthernet0/0/0\n description Primary WAN to ISP-1\n ip address 198.51.100.2 255.255.255.252\n no shutdown\n!\ninterface GigabitEthernet0/0/1\n description HQ Core LAN Gateway\n ip address 10.10.0.2 255.255.255.0\n standby 1 ip 10.10.0.1\n standby 1 priority 110\n standby 1 preempt\n standby 1 track GigabitEthernet0/0/0 25\n no shutdown\n!\nrouter bgp 65001\n bgp log-neighbor-changes\n neighbor 198.51.100.1 remote-as 100\n neighbor 10.10.0.3 remote-as 65001\n neighbor 10.10.0.3 next-hop-self\n!\nrouter ospf 1\n router-id 1.1.1.1\n network 10.10.0.0 0.0.0.255 area 0"
          },
          {
            "id": "r2",
            "name": "R2-Backup-Edge-Router (Standby HSRP)",
            "type": "router",
            "model": "Cisco ISR 4451-X",
            "mgmtIp": "10.10.0.3",
            "role": "Secondary BGP Edge & HSRP Standby Gateway",
            "status": "STANDBY",
            "interfaces": [
              {
                "name": "Gi0/0/0 (WAN)",
                "ip": "203.0.113.2",
                "subnet": "255.255.255.252",
                "status": "UP",
                "type": "GigabitEthernet"
              },
              {
                "name": "Gi0/0/1 (LAN)",
                "ip": "10.10.0.3",
                "subnet": "255.255.255.0",
                "status": "UP",
                "type": "GigabitEthernet"
              },
              {
                "name": "Loopback0",
                "ip": "2.2.2.2",
                "subnet": "255.255.255.255",
                "status": "UP",
                "type": "Loopback"
              }
            ],
            "routingProtocols": [
              "eBGP (AS 65001 <-> 200)",
              "iBGP (R2 <-> R1)",
              "OSPF Area 0",
              "HSRP Group 1"
            ],
            "runningConfigSnippet": "interface GigabitEthernet0/0/0\n description Backup WAN to ISP-2\n ip address 203.0.113.2 255.255.255.252\n no shutdown\n!\ninterface GigabitEthernet0/0/1\n description HQ Core LAN Gateway\n ip address 10.10.0.3 255.255.255.0\n standby 1 ip 10.10.0.1\n standby 1 priority 90\n no shutdown\n!\nrouter bgp 65001\n neighbor 203.0.113.1 remote-as 200\n neighbor 10.10.0.2 remote-as 65001"
          },
          {
            "id": "sw_core",
            "name": "Core-MLS-Catalyst9500",
            "type": "multilayer_switch",
            "model": "Cisco Catalyst 9500 48-Port 25G",
            "mgmtIp": "10.10.0.10",
            "role": "Core Routing & Inter-VLAN Gateway",
            "status": "ONLINE",
            "interfaces": [
              {
                "name": "Vlan10 (SVI)",
                "ip": "10.10.10.1",
                "subnet": "255.255.255.0",
                "status": "UP",
                "vlan": "10",
                "type": "VLAN_SVI"
              },
              {
                "name": "Vlan20 (SVI)",
                "ip": "10.10.20.1",
                "subnet": "255.255.255.0",
                "status": "UP",
                "vlan": "20",
                "type": "VLAN_SVI"
              },
              {
                "name": "Vlan30 (SVI)",
                "ip": "10.10.30.1",
                "subnet": "255.255.255.0",
                "status": "UP",
                "vlan": "30",
                "type": "VLAN_SVI"
              },
              {
                "name": "Te1/0/1 (Trunk)",
                "ip": "N/A",
                "subnet": "802.1Q Tagged",
                "status": "UP",
                "type": "GigabitEthernet"
              }
            ],
            "routingProtocols": [
              "OSPF Area 0",
              "Inter-VLAN SVI Routing",
              "LACP EtherChannel"
            ],
            "runningConfigSnippet": "ip routing\n!\ninterface Vlan10\n description Engineering Department\n ip address 10.10.10.1 255.255.255.0\n!\ninterface Vlan20\n description Platform Services Lab Segment\n ip address 10.10.20.1 255.255.255.0\n!\ninterface Vlan30\n description Demilitarized Zone (DMZ)\n ip address 10.10.30.1 255.255.255.0"
          },
          {
            "id": "fw_asa",
            "name": "ASA-5506-X-Firepower",
            "type": "firewall",
            "model": "Cisco ASA 5506-X Firepower",
            "mgmtIp": "10.10.30.2",
            "role": "DMZ Stateful Inspection & VPN Gateway",
            "status": "ONLINE",
            "interfaces": [
              {
                "name": "GigabitEthernet1/1 (Inside)",
                "ip": "10.10.30.2",
                "subnet": "255.255.255.0",
                "status": "UP",
                "vlan": "30",
                "type": "GigabitEthernet"
              }
            ],
            "routingProtocols": [
              "Static Routing",
              "Stateful Packet Inspection"
            ],
            "runningConfigSnippet": "interface GigabitEthernet1/1\n nameif inside_dmz\n security-level 50\n ip address 10.10.30.2 255.255.255.0\n!\naccess-list DMZ_IN extended permit tcp any host 10.10.30.50 eq 443\naccess-group DMZ_IN in interface inside_dmz"
          }
        ],
        "routingTable": [
          {
            "network": "0.0.0.0/0",
            "nextHop": "198.51.100.1",
            "interface": "Gi0/0/0",
            "protocol": "B",
            "protocolName": "eBGP",
            "metric": "0",
            "ad": 20
          },
          {
            "network": "10.10.0.0/24",
            "nextHop": "Directly Connected",
            "interface": "Gi0/0/1",
            "protocol": "C",
            "protocolName": "Connected",
            "metric": "0",
            "ad": 0
          },
          {
            "network": "10.10.10.0/24",
            "nextHop": "10.10.0.10",
            "interface": "Gi0/0/1",
            "protocol": "O",
            "protocolName": "OSPF",
            "metric": "2",
            "ad": 110
          },
          {
            "network": "10.10.20.0/24",
            "nextHop": "10.10.0.10",
            "interface": "Gi0/0/1",
            "protocol": "O",
            "protocolName": "OSPF",
            "metric": "2",
            "ad": 110
          },
          {
            "network": "10.10.30.0/24",
            "nextHop": "10.10.0.10",
            "interface": "Gi0/0/1",
            "protocol": "O",
            "protocolName": "OSPF",
            "metric": "2",
            "ad": 110
          },
          {
            "network": "2.2.2.2/32",
            "nextHop": "10.10.0.3",
            "interface": "Gi0/0/1",
            "protocol": "i",
            "protocolName": "iBGP",
            "metric": "0",
            "ad": 200
          }
        ],
        "vlanDatabase": [
          {
            "vlanId": 10,
            "name": "Engineering_Dev",
            "ports": [
              "Gi1/0/1-12"
            ],
            "status": "ACTIVE"
          },
          {
            "vlanId": 20,
            "name": "Platform_Services",
            "ports": [
              "Gi1/0/13-24"
            ],
            "status": "ACTIVE"
          },
          {
            "vlanId": 30,
            "name": "Security_DMZ",
            "ports": [
              "Gi1/0/25-32"
            ],
            "status": "ACTIVE"
          },
          {
            "vlanId": 99,
            "name": "Native_Management",
            "ports": [
              "Te1/0/1-4"
            ],
            "status": "ACTIVE"
          }
        ],
        "aclRules": [
          {
            "id": "acl-101",
            "name": "EXT_SECURITY_FILTER",
            "action": "permit",
            "protocol": "tcp",
            "source": "10.10.10.0/24",
            "destination": "any eq 443"
          },
          {
            "id": "acl-102",
            "name": "EXT_SECURITY_FILTER",
            "action": "permit",
            "protocol": "tcp",
            "source": "10.10.20.0/24",
            "destination": "any eq 443"
          },
          {
            "id": "acl-103",
            "name": "EXT_SECURITY_FILTER",
            "action": "deny",
            "protocol": "ip",
            "source": "10.10.10.0/24",
            "destination": "10.10.30.0/24"
          }
        ],
        "verificationTasks": [
          {
            "task": "BGP Neighbor Adjacency Verification",
            "testCommand": "show ip bgp summary",
            "expectedResult": "State/PfxRcd: 1 (Established with 198.51.100.1)",
            "passed": true
          },
          {
            "task": "HSRP Active Gateway Failover",
            "testCommand": "show standby brief",
            "expectedResult": "Active: local (10.10.0.2), Standby: 10.10.0.3, Virtual IP: 10.10.0.1",
            "passed": true
          },
          {
            "task": "OSPF Area 0 Neighbor Convergence",
            "testCommand": "show ip ospf neighbor",
            "expectedResult": "Neighbor ID 2.2.2.2 State FULL/BDR",
            "passed": true
          },
          {
            "task": "End-to-End Ping Through Simulated WAN",
            "testCommand": "ping 198.51.100.1 repeat 5",
            "expectedResult": "Expected lab observation: ICMP reachability across the recorded topology path.",
            "passed": true
          }
        ]
      },
      "createdAt": "2025-02-15T00:00:00.000Z",
      "updatedAt": "2026-08-14T18:34:32.847Z"
    },
    {
      "id": "proj-rhel-rhcsa-matrix",
      "title": "Enterprise RHEL 9 Infrastructure Hardening, Stratis/LVM Storage & SELinux Compliance Matrix",
      "slug": "rhel-9-rhcsa-hardening-storage-selinux",
      "summary": "Structural competency-based audit matrix matching official RHCSA EX200 objectives: LVM thin pools, SELinux enforcement, systemd sandbox units, and persistent UUID mounts.",
      "descriptionMarkdown": "### Enterprise Linux Infrastructure & RHCSA Competency Matrix\nEngineered as a security-hardening lab covering SELinux, firewalld, permissions, and benchmark-oriented configuration practices.\n\n#### Key Highlights:\n- **Storage Engineering**: Thin-provisioned LVM storage volumes formatted with XFS and secured via UUID mounts in `/etc/fstab` with `nodev,noexec` audit protections.\n- **SELinux Mandatory Access Control**: Zero permissive escapes; full targeted SELinux policy enforcement, custom port bindings (`semanage port`), and boolean configurations.\n- **Automated Verification**: Self-auditing bash harnesses validating Chrony NTP sync, sysctl kernel limits, and rootless Podman Quadlet containers.",
      "categoryId": "cat-linux",
      "status": "COMPLETED",
      "formatType": "rhcsa_matrix",
      "isFeatured": true,
      "sortOrder": 2,
      "coverImageUrl": "https://images.unsplash.com/photo-1629654297299-c8506221ca97?auto=format&fit=crop&w=1000&q=80",
      "devopsStack": [
        "RHEL 9",
        "SELinux",
        "LVM / XFS Storage",
        "Systemd",
        "Podman Containers",
        "Firewalld",
        "Chrony NTP"
      ],
      "tags": [
        "Linux",
        "Storage",
        "Systemd",
        "SELinux",
        "Automation"
      ],
      "metrics": {
        "Storage Pools": "Thin LVM / XFS",
        "SELinux Mode": "Enforcing",
        "Host Compliance": "Verified Active",
        "Service Health": "Nominal"
      },
      "rhcsaMatrixData": {
        "rhelVersion": "Red Hat Enterprise Linux 9.4",
        "kernelVersion": "5.14.0-427.13.1.el9_4.x86_64",
        "selinuxMode": "Enforcing",
        "fipsMode": true,
        "totalCompetencies": 10,
        "verifiedCount": 10,
        "objectives": [
          {
            "id": "rhcsa-obj-01",
            "domainCode": "RHCSA-01",
            "domainTitle": "Understand and use essential tools",
            "competency": "Process Management, SSH Keyring Auth & Advanced Grep/Awk Filtering",
            "examWeight": "10% Exam Coverage",
            "testedCommands": [
              "grep -E",
              "awk '{print $1,$3}'",
              "tar -czvf backup.tar.gz",
              "ssh-copy-id -i ~/.ssh/id_ed25519"
            ],
            "configFiles": [
              {
                "path": "/etc/ssh/sshd_config.d/01-hardening.conf",
                "language": "bash",
                "content": "# RHEL 9 SSH Hardening Baseline\nPermitRootLogin prohibit-password\nPasswordAuthentication no\nPubkeyAuthentication yes\nX11Forwarding no\nMaxAuthTries 3\nClientAliveInterval 300\nClientAliveCountMax 2",
                "description": "Zero-trust SSH daemon configuration disallowing password authentication in favor of ed25519 keys."
              }
            ],
            "verificationCommand": "sshd -t && echo \"SSHD syntax verified valid\"",
            "verificationOutput": "SSHD syntax verified valid (Exit Code 0)",
            "auditStatus": "VERIFIED"
          },
          {
            "id": "rhcsa-obj-02",
            "domainCode": "RHCSA-02",
            "domainTitle": "Create simple shell scripts",
            "competency": "Automated Log Parsing, Exit Code Trapping & System Health Checks",
            "examWeight": "8% Exam Coverage",
            "testedCommands": [
              "bash -n check_health.sh",
              "chmod +x /usr/local/bin/sysaudit",
              "logger -p local0.warn"
            ],
            "configFiles": [
              {
                "path": "/usr/local/bin/cluster-health.sh",
                "language": "bash",
                "content": "#!/usr/bin/env bash\nset -euo pipefail\nIFS=$'\\n\\t'\n\n# Memory threshold check (Alert if free < 15%)\nMEM_FREE_PCT=$(free | awk '/Mem:/ {printf(\"%.0f\", $4/$2 * 100)}')\nif [ \"$MEM_FREE_PCT\" -lt 15 ]; then\n  logger -t SYS_AUDIT \"CRITICAL: Low Memory Alert ($MEM_FREE_PCT% free)\"\n  exit 1\nfi\necho \"[OK] System metrics nominal. Free Memory: $MEM_FREE_PCT%\"\nexit 0",
                "description": "Production bash health check with strict error handling and systemd syslog reporting."
              }
            ],
            "verificationCommand": "/usr/local/bin/cluster-health.sh",
            "verificationOutput": "[OK] System metrics nominal. Free Memory: 64%",
            "auditStatus": "HARDENED"
          },
          {
            "id": "rhcsa-obj-03",
            "domainCode": "RHCSA-03",
            "domainTitle": "Operate running systems",
            "competency": "Boot Targets (multi-user vs graphical), systemd Service Tuning & Journald Auditing",
            "examWeight": "12% Exam Coverage",
            "testedCommands": [
              "systemctl isolate multi-user.target",
              "systemctl edit --full custom-node.service",
              "journalctl -u custom-node -p err"
            ],
            "configFiles": [
              {
                "path": "/etc/systemd/system/node-exporter.service",
                "language": "systemd",
                "content": "[Unit]\nDescription=Prometheus Node Exporter\nWants=network-online.target\nAfter=network-online.target\n\n[Service]\nUser=node_exporter\nGroup=node_exporter\nType=simple\nExecStart=/usr/local/bin/node_exporter --collector.systemd --collector.processes\nRestart=on-failure\nRestartSec=5s\nLimitNOFILE=65536\nProtectSystem=strict\nProtectHome=yes\nNoNewPrivileges=yes\n\n[Install]\nWantedBy=multi-user.target",
                "description": "Hardened systemd unit file with sandboxed privilege restrictions and systemd resource limits."
              }
            ],
            "verificationCommand": "systemctl is-active node-exporter.service",
            "verificationOutput": "active (running) since Fri 2025-02-14 08:30:12 UTC; 2 days ago",
            "auditStatus": "VERIFIED"
          },
          {
            "id": "rhcsa-obj-04",
            "domainCode": "RHCSA-04",
            "domainTitle": "Configure local storage & block devices",
            "competency": "LVM Volume Groups, Thin Provisioning, Stratis Pools & VDO Deduplication",
            "examWeight": "15% Exam Coverage",
            "testedCommands": [
              "pvcreate /dev/sdb1",
              "vgcreate -s 16M vg_prod /dev/sdb1",
              "lvcreate -L 50G -n lv_data vg_prod",
              "stratis pool create pool_app /dev/sdc"
            ],
            "configFiles": [
              {
                "path": "/etc/fstab",
                "language": "fstab",
                "content": "# /etc/fstab: static file system information.\nUUID=3f92b704-58a1-41db-8c70-ea8d3b519001  /                   xfs     defaults,noatime        0 0\nUUID=84ce9139-2b02-4fd9-8733-1b9195b6c8a2  /boot               xfs     defaults                0 0\nUUID=02a98f12-9c10-43f1-a89b-ec0419df8217  /var/log/audit      xfs     defaults,nodev,noexec   0 0\n/dev/vg_prod/lv_data                        /data/db            xfs     defaults,prjquota       0 0\nUUID=ea789f21-bc01-4411-9a10-2189fbca0012  none                swap    defaults                0 0",
                "description": "FSTAB partition mounts mapped exclusively via persistent UUIDs with security mount options (nodev, noexec) for audit partitions."
              }
            ],
            "verificationCommand": "lsblk -f && vgs && lvs",
            "verificationOutput": "VG      #PV #LV #SN Attr   VSize   VFree\nvg_prod   1   1   0 wz--n- 100.00g 50.00g\nLV      VG      Attr       LSize  Pool Origin Data%\nlv_data vg_prod -wi-ao---- 50.00g",
            "auditStatus": "COMPLIANT"
          },
          {
            "id": "rhcsa-obj-05",
            "domainCode": "RHCSA-05",
            "domainTitle": "Create and configure file systems",
            "competency": "XFS File System Resizing, Persistent UUID Mounts, NFS v4 Exports & AutoFS",
            "examWeight": "12% Exam Coverage",
            "testedCommands": [
              "xfs_growfs /data/db",
              "mount -a",
              "exportfs -avr",
              "showmount -e nfs-server.internal"
            ],
            "configFiles": [
              {
                "path": "/etc/auto.master.d/direct.autofs",
                "language": "bash",
                "content": "/-  /etc/auto.direct --timeout=60",
                "description": "AutoFS master direct map file configuring on-demand network mounts."
              },
              {
                "path": "/etc/auto.direct",
                "language": "bash",
                "content": "/mnt/nfs/shared  -rw,soft,sec=krb5p,proto=tcp  storage.internal:/srv/nfs/shared",
                "description": "AutoFS direct map binding Kerberized NFS v4 shares with automatic unmount after 60s idle."
              }
            ],
            "verificationCommand": "systemctl is-active autofs && findmnt -t nfs4",
            "verificationOutput": "active (running) /mnt/nfs/shared storage.internal:/srv/nfs/shared nfs4 rw,relatime",
            "auditStatus": "VERIFIED"
          },
          {
            "id": "rhcsa-obj-06",
            "domainCode": "RHCSA-06",
            "domainTitle": "Deploy, configure, and maintain systems",
            "competency": "DNF Repository Management, Chrony NTP Synchronization & Sysctl Kernel Tuning",
            "examWeight": "10% Exam Coverage",
            "testedCommands": [
              "dnf config-manager --add-repo",
              "chronyc sources -v",
              "sysctl -p /etc/sysctl.d/99-kubernetes.conf"
            ],
            "configFiles": [
              {
                "path": "/etc/sysctl.d/99-kubernetes-security.conf",
                "language": "ini",
                "content": "# Kernel Hardening and Container Forwarding\nnet.ipv4.ip_forward = 1\nnet.bridge.bridge-nf-call-iptables = 1\nnet.bridge.bridge-nf-call-ip6tables = 1\nfs.inotify.max_user_watches = 524288\nfs.file-max = 2097152\nkernel.pid_max = 4194304\nvm.max_map_count = 262144",
                "description": "Production kernel parameters for high-throughput container clusters and memory optimization."
              }
            ],
            "verificationCommand": "sysctl net.ipv4.ip_forward && chronyc tracking",
            "verificationOutput": "net.ipv4.ip_forward = 1\nReference ID    : 192.168.1.1 (time.google.com)\nStratum         : 2\nOffset          : +0.000012891 seconds",
            "auditStatus": "COMPLIANT"
          },
          {
            "id": "rhcsa-obj-07",
            "domainCode": "RHCSA-07",
            "domainTitle": "Manage basic networking & firewalls",
            "competency": "NetworkManager nmcli bonding, Firewalld Zones & Rich Rules",
            "examWeight": "11% Exam Coverage",
            "testedCommands": [
              "nmcli con add type bond con-name bond0",
              "firewall-cmd --permanent --zone=internal --add-source=10.10.0.0/24",
              "firewall-cmd --reload"
            ],
            "configFiles": [
              {
                "path": "/etc/firewalld/zones/dmz.xml",
                "language": "yaml",
                "content": "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<zone>\n  <short>DMZ</short>\n  <description>Hardened DMZ perimeter for ingress controllers.</description>\n  <service name=\"https\"/>\n  <service name=\"http\"/>\n  <rule family=\"ipv4\">\n    <source address=\"10.10.10.0/24\"/>\n    <service name=\"ssh\"/>\n    <accept/>\n  </rule>\n</zone>",
                "description": "Firewalld XML zone definition with scoped SSH access only from engineering subnet."
              }
            ],
            "verificationCommand": "firewall-cmd --list-all --zone=dmz",
            "verificationOutput": "dmz (active)\n  target: default\n  services: http https\n  rules: rule family=\"ipv4\" source address=\"10.10.10.0/24\" service name=\"ssh\" accept",
            "auditStatus": "HARDENED"
          },
          {
            "id": "rhcsa-obj-08",
            "domainCode": "RHCSA-08",
            "domainTitle": "Manage users and groups",
            "competency": "Sudoers Privilege Delegation, Password Aging Policies & PAM Security",
            "examWeight": "7% Exam Coverage",
            "testedCommands": [
              "useradd -G wheel,devops sgupta",
              "visudo -cf /etc/sudoers.d/99-devops",
              "chage -M 90 -W 7 -I 14 sgupta"
            ],
            "configFiles": [
              {
                "path": "/etc/sudoers.d/99-devops-engineers",
                "language": "bash",
                "content": "# Passwordless sudo delegation for DevOps Automation\n%devops ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart k8s-*, /usr/bin/podman\nDefaults:%devops log_year, logfile=/var/log/sudo.log",
                "description": "Scoped sudoers configuration with audit logging to /var/log/sudo.log."
              }
            ],
            "verificationCommand": "visudo -cf /etc/sudoers.d/99-devops-engineers",
            "verificationOutput": "/etc/sudoers.d/99-devops-engineers: parsed OK",
            "auditStatus": "VERIFIED"
          },
          {
            "id": "rhcsa-obj-09",
            "domainCode": "RHCSA-09",
            "domainTitle": "Manage security (SELinux)",
            "competency": "SELinux Modes, Context Restores (restorecon), Port Labels & Booleans",
            "examWeight": "15% Exam Coverage",
            "testedCommands": [
              "getenforce",
              "semanage fcontext -a -t httpd_sys_content_t \"/srv/web(/.*)?\"",
              "restorecon -Rv /srv/web",
              "setsebool -P httpd_can_network_connect 1"
            ],
            "configFiles": [
              {
                "path": "/etc/selinux/config",
                "language": "bash",
                "content": "# This file controls the state of SELinux on the system.\nSELINUX=enforcing\nSELINUXTYPE=targeted",
                "description": "RHEL 9 targeted SELinux mode enforcing mandatory access controls across all daemon processes."
              }
            ],
            "verificationCommand": "sestatus && getsebool httpd_can_network_connect",
            "verificationOutput": "SELinux status:                 enabled\nSELinuxfs mount:                /sys/fs/selinux\nCurrent mode:                   enforcing\nMode from config file:          enforcing\nhttpd_can_network_connect --> on",
            "auditStatus": "HARDENED"
          },
          {
            "id": "rhcsa-obj-10",
            "domainCode": "RHCSA-10",
            "domainTitle": "Manage containers (Podman)",
            "competency": "Rootless Containers, Quadlet Systemd Units & Secret Mounting",
            "examWeight": "10% Exam Coverage",
            "testedCommands": [
              "podman run -d --name nginx -p 8080:80 ubi9/nginx-120",
              "podman generate systemd --name nginx --files",
              "podman secret create db_pass secret.txt"
            ],
            "configFiles": [
              {
                "path": "~/.config/containers/systemd/web-gateway.container",
                "language": "systemd",
                "content": "[Unit]\nDescription=Rootless Podman Nginx Gateway (Quadlet)\n\n[Container]\nImage=registry.access.redhat.com/ubi9/nginx-120:latest\nPublishPort=8443:8443\nVolume=/srv/certs:/etc/nginx/certs:ro,Z\nAutoUpdate=registry\n\n[Service]\nRestart=always\n\n[Install]\nWantedBy=default.target",
                "description": "RHEL 9 native Quadlet container definition integrated directly into rootless systemd user session."
              }
            ],
            "verificationCommand": "podman ps --format \"table {{.ID}} {{.Image}} {{.Status}} {{.Ports}}\"",
            "verificationOutput": "CONTAINER ID  IMAGE                                      STATUS            PORTS\na8f12c904e12  registry.access.redhat.com/ubi9/nginx-120  Up 44 hours ago   0.0.0.0:8443->8443/tcp",
            "auditStatus": "VERIFIED"
          }
        ]
      },
      "createdAt": "2025-02-10T00:00:00.000Z",
      "updatedAt": "2026-08-14T18:34:35.587Z"
    },
    {
      "id": "proj-k8s-cilium-gitops",
      "title": "Cloud-Native GitOps Kubernetes Infrastructure with Cilium eBPF & Terraform",
      "slug": "cloud-native-gitops-k8s-cilium-terraform",
      "summary": "Multi-pipeline GitOps continuous deployment matrix featuring automated ArgoCD reconciliation, Cilium eBPF network overlays, and modular Terraform IaC workspace.",
      "descriptionMarkdown": "### Production GitOps & Cloud-Native Architecture\nA resilient hybrid Kubernetes platform engineered for high-throughput enterprise workloads and declarative zero-trust network policies.\n\n#### Core Platform Modules:\n- **Cilium eBPF CNI**: eBPF-based network observability, kernel-level L7 network policy enforcement, and WireGuard mesh encryption.\n- **Declarative GitOps (ArgoCD)**: Automated reconciliation loops with Prometheus canary deployments powered by Flagger.\n- **Infrastructure as Code**: Production Terraform repository provisioning multi-AZ VPCs, IAM OIDC roles, and secure S3 state locking.",
      "categoryId": "cat-devops",
      "status": "COMPLETED",
      "formatType": "devops_pipeline",
      "isFeatured": true,
      "sortOrder": 3,
      "coverImageUrl": "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?auto=format&fit=crop&w=1000&q=80",
      "devopsStack": [
        "Kubernetes",
        "Cilium eBPF",
        "Terraform",
        "ArgoCD",
        "Helm",
        "HashiCorp Vault",
        "Prometheus"
      ],
      "tags": [
        "DevOps",
        "Kubernetes",
        "GitOps",
        "Terraform",
        "eBPF",
        "CI/CD"
      ],
      "metrics": {
        "Pipeline Engine": "ArgoCD",
        "Deployment Style": "GitOps",
        "Deployment Strategy": "Automated Canary",
        "Cluster Health": "Nominal (Kubernetes)"
      },
      "devopsPipelineData": {
        "framework": "GitOps (ArgoCD + Cilium + Helm)",
        "gitCommitSha": "a49f82c",
        "branch": "main [Lab-Release-v2.8]",
        "pipelineStages": [
          {
            "id": "stage-1",
            "name": "Static Code & IaC Linting",
            "icon": "CheckCircle2",
            "tool": "TFLint & Yamllint",
            "durationSeconds": 14,
            "status": "SUCCESS",
            "stdoutSnippet": "[INFO] Validating 18 Terraform modules...\n[PASS] No syntax or deprecation errors in ./terraform/\n[PASS] Kubernetes manifest lint: 0 warnings, 0 fatal errors.",
            "artifactsProduced": [
              "lint-report.json"
            ]
          },
          {
            "id": "stage-2",
            "name": "Security & CVE Scanning",
            "icon": "ShieldCheck",
            "tool": "Trivy & Checkov",
            "durationSeconds": 28,
            "status": "SUCCESS",
            "stdoutSnippet": "[INFO] Scanning container base images (UBI 9 Minimal)...\n[REPORT] Critical: 0, High: 0, Medium: 0, Low: 2\n[PASS] Security audit stage completed. No critical vulnerabilities found.",
            "artifactsProduced": [
              "trivy-sarif-report.sarif"
            ]
          },
          {
            "id": "stage-3",
            "name": "Multi-Arch Container Build",
            "icon": "Boxes",
            "tool": "Buildah / Docker Buildx",
            "durationSeconds": 42,
            "status": "SUCCESS",
            "stdoutSnippet": "[INFO] Building image: registry.infra.lan/core/gateway:v2.8\n[INFO] Pushing OCI manifest to AWS ECR (linux/amd64, linux/arm64)\n[PASS] OCI Image Artifact produced.",
            "artifactsProduced": [
              "oci-image.tar"
            ]
          },
          {
            "id": "stage-4",
            "name": "Helm Chart Packaging & Signing",
            "icon": "Package",
            "tool": "Helm 3 & Cosign",
            "durationSeconds": 19,
            "status": "SUCCESS",
            "stdoutSnippet": "[INFO] Packaging chart platform-v2.8.0.tgz\n[INFO] Signing with Cosign KMS key (aws-kms://arn:aws:kms:us-east-1:...)\n[PASS] Signature verified.",
            "artifactsProduced": [
              "platform-v2.8.0.tgz.sig"
            ]
          },
          {
            "id": "stage-5",
            "name": "ArgoCD GitOps Sync Loop",
            "icon": "GitPullRequest",
            "tool": "ArgoCD Controller",
            "durationSeconds": 31,
            "status": "SUCCESS",
            "stdoutSnippet": "[SYNC] Reconciling desired state against Kubernetes cluster 'us-east-1-prod'...\n[UPDATE] Ingress Controller -> Synchronized\n[UPDATE] Deployment/core-api -> 6/6 Replicas Ready\n[UPDATE] Cilium NetworkPolicies -> Enforced\n[PASS] Sync status: Synced | Health: Healthy",
            "artifactsProduced": [
              "argocd-sync-receipt.json"
            ]
          },
          {
            "id": "stage-6",
            "name": "Canary Traffic Verification",
            "icon": "Activity",
            "tool": "Prometheus & Flagger",
            "durationSeconds": 60,
            "status": "SUCCESS",
            "stdoutSnippet": "[CANARY] Shifting 10% traffic to v2.8... Success Rate: OK\n[CANARY] Shifting 50% traffic to v2.8... Success Rate: OK\n[CANARY] Shifting traffic to v2.8... Rollout complete.\n[PASS] Canary promotion successful."
          }
        ],
        "iacTree": [
          {
            "name": "terraform-infrastructure",
            "path": "terraform/",
            "type": "directory",
            "children": [
              {
                "name": "main.tf",
                "path": "terraform/main.tf",
                "type": "file",
                "size": "4.2 KB",
                "content": "# Terraform Production Infrastructure Blueprint\nterraform {\n  required_version = \">= 1.7.0\"\n  required_providers {\n    aws = {\n      source  = \"hashicorp/aws\"\n      version = \"~> 5.40\"\n    }\n    helm = {\n      source  = \"hashicorp/helm\"\n      version = \"~> 2.12\"\n    }\n  }\n  backend \"s3\" {\n    bucket         = \"infra-tf-state-us-east-1\"\n    key            = \"prod/k8s-mesh.tfstate\"\n    region         = \"us-east-1\"\n    dynamodb_table = \"terraform-locks\"\n    encrypt        = true\n  }\n}\n\nmodule \"vpc\" {\n  source  = \"terraform-aws-modules/vpc/aws\"\n  version = \"5.5.1\"\n\n  name = \"infra-prod-vpc\"\n  cidr = \"10.100.0.0/16\"\n\n  azs             = [\"us-east-1a\", \"us-east-1b\", \"us-east-1c\"]\n  private_subnets = [\"10.100.1.0/24\", \"10.100.2.0/24\", \"10.100.3.0/24\"]\n  public_subnets  = [\"10.100.101.0/24\", \"10.100.102.0/24\", \"10.100.103.0/24\"]\n\n  enable_nat_gateway = true\n  single_nat_gateway = false\n  enable_vpn_gateway = false\n\n  tags = {\n    Environment = \"Production\"\n    Owner       = \"Sahil K Gupta\"\n    ManagedBy   = \"Terraform\"\n  }\n}"
              },
              {
                "name": "variables.tf",
                "path": "terraform/variables.tf",
                "type": "file",
                "size": "1.8 KB",
                "content": "variable \"aws_region\" {\n  type        = string\n  default     = \"us-east-1\"\n  description = \"Target AWS Cloud Region\"\n}\n\nvariable \"cluster_version\" {\n  type        = string\n  default     = \"1.29\"\n  description = \"Target Kubernetes Core Version\"\n}\n\nvariable \"node_instance_types\" {\n  type        = list(string)\n  default     = [\"m6i.2xlarge\", \"m6i.4xlarge\"]\n  description = \"EC2 Worker Node Compute SKU Array\"\n}"
              },
              {
                "name": "cilium-ebpf.tf",
                "path": "terraform/cilium-ebpf.tf",
                "type": "file",
                "size": "2.5 KB",
                "content": "resource \"helm_release\" \"cilium\" {\n  name       = \"cilium\"\n  repository = \"https://helm.cilium.io/\"\n  chart      = \"cilium\"\n  version    = \"1.15.2\"\n  namespace  = \"kube-system\"\n\n  set {\n    name  = \"kubeProxyReplacement\"\n    value = \"strict\"\n  }\n  set {\n    name  = \"k8sServiceHost\"\n    value = module.eks.cluster_endpoint\n  }\n  set {\n    name  = \"encryption.enabled\"\n    value = \"true\"\n  }\n  set {\n    name  = \"encryption.type\"\n    value = \"wireguard\"\n  }\n}"
              }
            ]
          }
        ],
        "architectureLayers": [
          {
            "tier": "Edge Ingress & Global Routing",
            "description": "Cloudflare Magic WAN & AWS Route 53 with BGP Anycast routing and automated DDoS mitigation.",
            "technologies": [
              "AWS Route 53",
              "Cloudflare WAF",
              "Envoy Gateway",
              "BGP Anycast"
            ],
            "slaMetrics": "High-Availability Ingress Routing"
          },
          {
            "tier": "Container Orchestration & eBPF Mesh",
            "description": "Multi-zone EKS clusters utilizing Cilium eBPF for robust packet forwarding and WireGuard encryption.",
            "technologies": [
              "Kubernetes 1.29",
              "Cilium eBPF",
              "ArgoCD",
              "Prometheus Operator"
            ],
            "slaMetrics": "64 Managed Nodes | 1200 Pods"
          },
          {
            "tier": "Distributed Data Storage & Cache",
            "description": "High-availability PostgreSQL cluster with streaming replication, Redis Sentinel cache, and HashiCorp Vault secrets.",
            "technologies": [
              "PostgreSQL 16",
              "Redis Sentinel",
              "HashiCorp Vault",
              "MinIO S3"
            ],
            "slaMetrics": "Distributed State Persistence"
          },
          {
            "tier": "Observability & Continuous GitOps",
            "description": "End-to-end distributed tracing, OpenTelemetry collectors, and automated canary deployments via Flagger.",
            "technologies": [
              "OpenTelemetry",
              "Grafana Tempo",
              "Prometheus",
              "Flagger"
            ],
            "slaMetrics": "End-to-End Distributed Tracing"
          }
        ]
      },
      "createdAt": "2025-01-20T00:00:00.000Z",
      "updatedAt": "2026-08-14T18:34:36.501Z"
    }
  ],
  "blogs": [
    {
      "id": "blog-01",
      "title": "Enterprise BGP EVPN & Packet Tracer Simulation Architecture",
      "slug": "enterprise-bgp-evpn-packet-tracer-architecture",
      "excerpt": "How to design scalable multi-tenant enterprise data center overlays using BGP EVPN control plane and Cisco IOS-XE topologies.",
      "contentMarkdown": "### Why BGP EVPN for Modern Data Centers?\nTraditional spanning-tree protocols (STP) leave 50% of switch uplinks idle to prevent switching loops. **BGP EVPN with VxLAN encapsulation** enables active-active multi-homing across all leaf-spine fabrics.\n\n```cisco\nrouter bgp 65001\n template peer-session LEAF_FABRIC\n  remote-as 65001\n  update-source Loopback0\n neighbor 10.255.0.1 inherit peer-session LEAF_FABRIC\n address-family l2vpn evpn\n  neighbor 10.255.0.1 activate\n  neighbor 10.255.0.1 send-community both\n```\n\n#### Key Takeaways:\n- Elimination of Spanning Tree blocking ports using equal-cost multi-pathing (ECMP).\n- Integrated routing and bridging (IRB) directly at the leaf switch.\n- Consistent MAC address learning in the control plane rather than flood-and-learn data plane.",
      "categoryId": "cat-networking",
      "coverImageUrl": "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=1000&q=80",
      "readTimeMinutes": 7,
      "tags": [
        "Networking",
        "Cisco",
        "BGP",
        "Packet-Tracer",
        "Routing"
      ],
      "isPublished": true,
      "publishedAt": "2025-02-01T00:00:00.000Z",
      "viewCount": 1420,
      "createdAt": "2025-02-01T00:00:00.000Z",
      "updatedAt": "2026-08-14T18:34:36.501Z"
    },
    {
      "id": "blog-02",
      "title": "Mastering Enterprise Linux: Storage Management, Systemd Units & SELinux",
      "slug": "mastering-enterprise-linux-storage-systemd-selinux",
      "excerpt": "A comprehensive engineering guide to architecting hardened Linux servers and storage pools in mission-critical environments.",
      "contentMarkdown": "### Enterprise Linux Storage Architecture\nIn modern Linux systems administration, predictable persistent storage mounting is critical. Always rely on filesystem UUIDs:\n\n```bash\n# 1. Identify partition UUID\nblkid /dev/vg_prod/lv_data\n\n# 2. Add hardened mount options in /etc/fstab\nUUID=3f92b704-58a1-41db-8c70-ea8d3b519001 /data/db xfs defaults,nodev,noexec 0 0\n\n# 3. Verify mount without rebooting\nmount -a\n```\n\n#### SELinux Policy Hardening:\nNever disable SELinux in production. Use `audit2allow` and `semanage` to craft precise access rules.",
      "categoryId": "cat-linux",
      "coverImageUrl": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1000&q=80",
      "readTimeMinutes": 9,
      "tags": [
        "Linux",
        "Storage",
        "Systemd",
        "SELinux",
        "Sysadmin"
      ],
      "isPublished": true,
      "publishedAt": "2025-01-25T00:00:00.000Z",
      "viewCount": 2180,
      "createdAt": "2025-01-25T00:00:00.000Z",
      "updatedAt": "2026-08-14T18:34:37.519Z"
    },
    {
      "id": "blog-03",
      "title": "Zero-Trust Kubernetes: Replacing kube-proxy with Cilium eBPF & WireGuard",
      "slug": "zero-trust-k8s-cilium-ebpf-wireguard",
      "excerpt": "Exploring how eBPF-based networking can reduce proxy overhead and improve observability in Kubernetes environments.",
      "contentMarkdown": "### Eliminating iptables Overhead with eBPF\nTraditional Kubernetes `kube-proxy` uses linear `iptables` rule lookups, resulting in $O(N)$ packet processing overhead at scale.\n\n**Cilium eBPF** replaces this with $O(1)$ BPF hash map lookups directly in the Linux kernel network stack, bypassing conntrack tables.",
      "categoryId": "cat-devops",
      "coverImageUrl": "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?auto=format&fit=crop&w=1000&q=80",
      "readTimeMinutes": 8,
      "tags": [
        "DevOps",
        "Kubernetes",
        "Cilium",
        "eBPF",
        "Terraform"
      ],
      "isPublished": true,
      "publishedAt": "2025-01-10T00:00:00.000Z",
      "viewCount": 3840,
      "createdAt": "2025-01-10T00:00:00.000Z",
      "updatedAt": "2026-08-14T18:34:37.519Z"
    }
  ],
  "certifications": [
    {
      "id": "cert-networking",
      "title": "CCNA 200-301 Preparation Track",
      "code": "CCNA Study Roadmap",
      "issuer": "Cisco Networking Systems",
      "credentialId": "CCNA COMPLETION: 70%",
      "verificationUrl": "https://www.cisco.com",
      "badgeIcon": "Network",
      "issueDate": "2025-01-01",
      "expiryDate": "2026-12-31",
      "categoryId": "cat-networking",
      "skillsValidated": [
        "Enterprise IPv4/IPv6 Subnetting (Completed)",
        "OSPF & Static Routing Protocols (Completed)",
        "802.1Q VLANs & Multi-Layer Inter-VLAN Routing (Completed)",
        "HSRP / VRRP Gateway High-Availability Failover (Completed)",
        "Cisco IOS CLI & Packet Tracer Topology Simulations (Completed)",
        "Access Control Lists (ACLs) & Port Security (In Progress)"
      ],
      "syllabusBreakdown": [
        {
          "domain": "Network Fundamentals & IP Subnetting",
          "percentage": 90,
          "score": "Completed (90%)"
        },
        {
          "domain": "Network Access & VLAN Trunking",
          "percentage": 85,
          "score": "Completed (85%)"
        },
        {
          "domain": "IP Connectivity (OSPF Area 0 & Static Routing)",
          "percentage": 80,
          "score": "Completed (80%)"
        },
        {
          "domain": "IP Services & Gateway Redundancy (HSRP/DHCP)",
          "percentage": 65,
          "score": "In Progress (65%)"
        },
        {
          "domain": "Security Fundamentals & Automation",
          "percentage": 40,
          "score": "In Progress (40%)"
        }
      ],
      "isFeatured": true,
      "sortOrder": 1,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2026-08-14T18:34:37.519Z"
    },
    {
      "id": "cert-linux",
      "title": "RHCSA EX200 Preparation Track",
      "code": "RHCSA Study Roadmap",
      "issuer": "Red Hat Enterprise Linux",
      "credentialId": "RHCSA COMPLETION: 50%",
      "verificationUrl": "https://access.redhat.com",
      "badgeIcon": "Terminal",
      "issueDate": "2025-01-01",
      "expiryDate": "2026-12-31",
      "categoryId": "cat-linux",
      "skillsValidated": [
        "Essential Linux Commands & Bash Scripting (Completed)",
        "User & Group Management with Sudo Privileges (Completed)",
        "Systemd Unit Management & Boot Targets (Completed)",
        "LVM Storage Provisioning, XFS & /etc/fstab (In Progress)",
        "SELinux Contexts & Enforcing Modes (In Progress)",
        "Firewalld Network Zones & Rich Rules (In Progress)"
      ],
      "syllabusBreakdown": [
        {
          "domain": "Understand & Use Essential Linux Tools",
          "percentage": 85,
          "score": "Completed (85%)"
        },
        {
          "domain": "Operate Running Systems & Services",
          "percentage": 70,
          "score": "Completed (70%)"
        },
        {
          "domain": "Configure Local Storage & LVM Filesystems",
          "percentage": 50,
          "score": "In Progress (50%)"
        },
        {
          "domain": "Manage Host Security & SELinux Enforcement",
          "percentage": 40,
          "score": "In Progress (40%)"
        },
        {
          "domain": "Basic Container Management (Podman)",
          "percentage": 30,
          "score": "In Progress (30%)"
        }
      ],
      "isFeatured": true,
      "sortOrder": 2,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2026-08-14T18:34:37.519Z"
    },
    {
      "id": "cert-devops",
      "title": "Cloud-Native Kubernetes & DevOps Track",
      "code": "DevOps & GitOps Roadmap",
      "issuer": "Cloud-Native Learning Foundation",
      "credentialId": "DevOps Roadmap: Active Labs",
      "verificationUrl": "https://www.cncf.io",
      "badgeIcon": "Boxes",
      "issueDate": "2025-01-01",
      "expiryDate": "2026-12-31",
      "categoryId": "cat-devops",
      "skillsValidated": [
        "Docker & Podman Containerization (Completed)",
        "Kubernetes Manifests & Pod Orchestration (In Progress)",
        "Cilium eBPF CNI & Mesh Networking (In Progress)",
        "ArgoCD GitOps Declarative Delivery Pipelines (In Progress)",
        "Terraform Infrastructure-as-Code Basics (In Progress)"
      ],
      "syllabusBreakdown": [
        {
          "domain": "OCI Containers & Dockerfile Optimization",
          "percentage": 80,
          "score": "Completed (80%)"
        },
        {
          "domain": "Kubernetes Workloads & Services",
          "percentage": 60,
          "score": "In Progress (60%)"
        },
        {
          "domain": "ArgoCD GitOps Continuous Delivery",
          "percentage": 55,
          "score": "In Progress (55%)"
        },
        {
          "domain": "Terraform IaC & Cloud State Provisioning",
          "percentage": 50,
          "score": "In Progress (50%)"
        }
      ],
      "isFeatured": true,
      "sortOrder": 3,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2026-08-14T18:34:38.428Z"
    }
  ],
  "skills": [
    {
      "id": "sk-1",
      "name": "Enterprise Linux Administration",
      "level": "Expert",
      "proficiencyPercent": 96,
      "yearsOfExperience": 4,
      "categoryId": "cat-linux",
      "terminalSnippet": "systemctl status custom.service && journalctl -xe",
      "sortOrder": 1,
      "createdAt": "2026-08-14T18:34:38.428Z",
      "updatedAt": "2026-08-14T18:34:38.428Z"
    },
    {
      "id": "sk-2",
      "name": "Cisco Routing & Packet Tracer Labs",
      "level": "Expert",
      "proficiencyPercent": 95,
      "yearsOfExperience": 4,
      "categoryId": "cat-networking",
      "terminalSnippet": "show ip bgp summary && show standby brief",
      "sortOrder": 2,
      "createdAt": "2026-08-14T18:34:38.428Z",
      "updatedAt": "2026-08-14T18:34:38.428Z"
    },
    {
      "id": "sk-3",
      "name": "LVM Storage & SELinux Hardening",
      "level": "Expert",
      "proficiencyPercent": 94,
      "yearsOfExperience": 4,
      "categoryId": "cat-linux",
      "terminalSnippet": "semanage fcontext -a -t httpd_sys_content_t \"/srv(/.*)?\"",
      "sortOrder": 3,
      "createdAt": "2026-08-14T18:34:38.428Z",
      "updatedAt": "2026-08-14T18:34:38.428Z"
    },
    {
      "id": "sk-4",
      "name": "BGP & OSPF Dynamic Routing",
      "level": "Expert",
      "proficiencyPercent": 95,
      "yearsOfExperience": 4,
      "categoryId": "cat-networking",
      "terminalSnippet": "router ospf 1 -> network 10.10.0.0 0.0.0.255 area 0",
      "sortOrder": 4,
      "createdAt": "2026-08-14T18:34:38.428Z",
      "updatedAt": "2026-08-14T18:34:38.428Z"
    },
    {
      "id": "sk-5",
      "name": "Kubernetes & Cilium eBPF Mesh",
      "level": "Expert",
      "proficiencyPercent": 93,
      "yearsOfExperience": 3,
      "categoryId": "cat-devops",
      "terminalSnippet": "cilium status --wait && kubectl get pods -A",
      "sortOrder": 5,
      "createdAt": "2026-08-14T18:34:38.428Z",
      "updatedAt": "2026-08-14T18:34:38.428Z"
    },
    {
      "id": "sk-6",
      "name": "Terraform & Infrastructure-as-Code",
      "level": "Advanced",
      "proficiencyPercent": 92,
      "yearsOfExperience": 3,
      "categoryId": "cat-devops",
      "terminalSnippet": "terraform plan -out=tfplan && terraform apply tfplan",
      "sortOrder": 6,
      "createdAt": "2026-08-14T18:34:38.428Z",
      "updatedAt": "2026-08-14T18:34:38.428Z"
    },
    {
      "id": "sk-7",
      "name": "ArgoCD & GitOps CI/CD Pipelines",
      "level": "Advanced",
      "proficiencyPercent": 90,
      "yearsOfExperience": 3,
      "categoryId": "cat-devops",
      "terminalSnippet": "argocd app sync platform-lab --prune",
      "sortOrder": 7,
      "createdAt": "2026-08-14T18:34:38.428Z",
      "updatedAt": "2026-08-14T18:34:38.428Z"
    }
  ]
} as SeedSnapshot;

const legacyProjectSlugs: Record<string, string> = {
  'cisco-enterprise-wan-bgp-hsrp': 'enterprise-wan-routing-lab',
  'rhel-9-rhcsa-hardening-storage-selinux': 'rhel9-systems-lab',
  'cloud-native-gitops-k8s-cilium-terraform': 'cloud-native-gitops-lab',
};

const projectStories: Record<
  string,
  { mission: string; architectureSummary: string; whatIBuilt: string }
> = {
  'cisco-enterprise-wan-bgp-hsrp': {
    mission:
      'Engineer and inspect an enterprise-style, dual-homed WAN edge topology connecting headquarters to redundant transit providers (AS 100 / AS 200), with explicit routing policy, gateway redundancy, and segmented departmental VLANs.',
    architectureSummary: 'Dual-homed BGP Edge, OSPF Core, Multi-VLAN distribution.',
    whatIBuilt: 'Built an enterprise-style lab architecture in Cisco Packet Tracer.',
  },
  'rhel-9-rhcsa-hardening-storage-selinux': {
    mission:
      'Deploy, harden, and audit an enterprise Red Hat Enterprise Linux 9.4 compute node in a security-hardening lab covering SELinux, firewalld, permissions, and benchmark-oriented configuration practices. Deliver immutable storage volumes via thin LVM, full targeted SELinux policy confinement, and automated rootless container lifecycle via systemd Quadlets.',
    architectureSummary: 'Hardened Linux environment with LVM, systemd, and SELinux.',
    whatIBuilt:
      'Engineered a security-hardening lab covering SELinux, firewalld, permissions, and benchmark-oriented configuration practices.',
  },
  'cloud-native-gitops-k8s-cilium-terraform': {
    mission:
      'Architect a self-healing GitOps delivery workflow and cloud-native Kubernetes cluster with Cilium eBPF network security and modular Terraform IaC. Eliminate manual cluster drift, enforce kernel-level L7 security policies, and achieve automated canary rollouts.',
    architectureSummary: 'Kubernetes cluster with ArgoCD and Cilium.',
    whatIBuilt: 'Provisioned a GitOps pipeline and Kubernetes environment.',
  },
};

const labIdentities: Partial<
  Record<
    NonNullable<ApiProject['formatType']>,
    { slug: string; title: string; kind: LabKind; summary: string }
  >
> = {
  cisco_pkt_lab: {
    slug: 'cisco-wan-topology',
    title: 'Cisco WAN Topology',
    kind: LabKind.NETWORK_TOPOLOGY,
    summary: 'Data-driven enterprise WAN topology explorer backed by the canonical Networking Lab state.',
  },
  rhcsa_matrix: {
    slug: 'rhel9-hardening-environment',
    title: 'RHEL9 Hardening Environment',
    kind: LabKind.LINUX_SYSTEM,
    summary: 'Data-driven RHEL 9.4 systems lab backed by canonical host, service, storage, SELinux, network, configuration, and verification state.',
  },
  devops_pipeline: {
    slug: 'gitops-k8s-cluster',
    title: 'GitOps K8s Cluster',
    kind: LabKind.DEVOPS_PIPELINE,
    summary: 'Data-driven DevOps delivery Lab backed by persisted CI/CD, Terraform, Kubernetes, GitOps, Helm, Cilium, and observability snapshots.',
  },
};


const labCapabilities: Partial<Record<NonNullable<ApiProject['formatType']>, string[]>> = {
  cisco_pkt_lab: ['topology', 'device-inventory', 'interfaces', 'device-config', 'routing-state', 'vlans', 'acls', 'packet-path', 'control-plane', 'route-lookup', 'health-analysis', 'operator-context', 'scenario-readiness'],
  rhcsa_matrix: ['host-state', 'services', 'storage', 'filesystems', 'fstab', 'systemd', 'selinux', 'network', 'logs', 'configurations', 'verification', 'health-analysis', 'diagnostics', 'operator-context', 'scenario-readiness'],
  devops_pipeline: ['pipeline', 'repository', 'iac', 'terraform', 'gitops', 'kubernetes', 'helm', 'network-policy', 'observability', 'artifacts'],
};

const primaryLabInputs: Partial<
  Record<NonNullable<ApiProject['formatType']>, { inputKey: string; inputType: string; label: string }>
> = {
  cisco_pkt_lab: { inputKey: 'baseline-network-topology', inputType: 'NETWORK_TOPOLOGY', label: 'Baseline Network Topology' },
  rhcsa_matrix: { inputKey: 'baseline-system-snapshot', inputType: 'SYSTEM_SNAPSHOT', label: 'Baseline System Snapshot' },
  devops_pipeline: { inputKey: 'baseline-ci-pipeline', inputType: 'CI_PIPELINE', label: 'Baseline Delivery Pipeline' },
};


const runbooks: Record<
  string,
  Array<{ order: number; title: string; description: string }>
> = {
  'cisco-enterprise-wan-bgp-hsrp': [
    { order: 1, title: 'Inspect topology', description: 'Review the dual-homed WAN edge topology connecting headquarters.' },
    { order: 2, title: 'Select edge router', description: 'Identify the active AS 100 edge router.' },
    { order: 3, title: 'Review routing state', description: 'Inspect the recorded OSPF Area 0 and BGP peering snapshot.' },
    { order: 4, title: 'Analyze recorded forwarding state', description: 'Compare topology reachability with persisted device, interface, route, neighbor, and gateway state.' },
  ],
  'rhel-9-rhcsa-hardening-storage-selinux': [
    { order: 1, title: 'Inspect host', description: 'Examine the persisted RHEL 9.4 host baseline and input provenance.' },
    { order: 2, title: 'Inspect services and storage', description: 'Review normalized systemd service state, LVM metadata, mounts, and /etc/fstab entries.' },
    { order: 3, title: 'Inspect security and network state', description: 'Review recorded SELinux mode, policy/configuration snapshots, interfaces, and routes without assuming live telemetry.' },
    { order: 4, title: 'Investigate recorded health', description: 'Correlate persisted service, storage, SELinux, network, log, and verification signals using the recorded-state operations layer.' },
  ],
  'cloud-native-gitops-k8s-cilium-terraform': [
    { order: 1, title: 'Follow pipeline', description: 'Trace the persisted CI/CD stages and recorded outputs for the selected DevOps Lab.' },
    { order: 2, title: 'Inspect infrastructure inputs', description: 'Review Terraform/IaC files and the inputs actually attached to this Lab.' },
    { order: 3, title: 'Inspect delivery state', description: 'Review recorded Kubernetes, ArgoCD, Helm, and Cilium state without assuming live cluster access.' },
    { order: 4, title: 'Inspect recorded observations', description: 'Correlate recorded delivery and observability snapshots while keeping live telemetry and command execution out of scope.' },
  ],
};


const networkingScenarioDefinitions = [
  {
    slug: 'isp-failover',
    title: 'Primary ISP Failover',
    summary: 'Scenario contract for losing the primary carrier uplink while preserving a redundant WAN path.',
    order: 10,
    baselineState: { schemaVersion: 'networking.scenario.v1', requiredSignals: ['link:isp1-r1=UP', 'bgp:r1-isp1=ESTABLISHED', 'gateway:hsrp-1=ACTIVE:r1'] },
    actions: { schemaVersion: 'networking.scenario.v1', mutations: [{ type: 'SET_LINK_STATUS', linkKey: 'isp1-r1', status: 'DOWN' }] },
    expectedObservations: { observableSignals: ['link:isp1-r1=DOWN', 'bgp:r1-isp1!=ESTABLISHED', 'alternate-wan-path-available'] },
    verificationCriteria: { checks: ['secondary carrier path remains represented', 'primary BGP session is no longer healthy'] },
  },
  {
    slug: 'ospf-neighbor-loss',
    title: 'OSPF Neighbor Loss',
    summary: 'Scenario contract for an Area 0 adjacency loss between the edge routing layer.',
    order: 20,
    baselineState: { schemaVersion: 'networking.scenario.v1', requiredSignals: ['ospf:r1-r2=FULL'] },
    actions: { schemaVersion: 'networking.scenario.v1', mutations: [{ type: 'SET_OSPF_NEIGHBOR_STATE', neighborId: 'r1-r2', state: 'DOWN' }] },
    expectedObservations: { observableSignals: ['ospf:r1-r2!=FULL', 'routing-health-degraded'] },
    verificationCriteria: { checks: ['adjacency health reflects the mutation', 'route investigation remains available'] },
  },
  {
    slug: 'hsrp-gateway-failover',
    title: 'HSRP Gateway Failover',
    summary: 'Scenario contract for moving first-hop gateway ownership away from the baseline active edge router.',
    order: 30,
    baselineState: { schemaVersion: 'networking.scenario.v1', requiredSignals: ['gateway:hsrp-1=ACTIVE:r1', 'gateway:hsrp-1=STANDBY:r2'] },
    actions: { schemaVersion: 'networking.scenario.v1', mutations: [{ type: 'SET_DEVICE_STATUS', deviceKey: 'r1', status: 'DOWN' }] },
    expectedObservations: { observableSignals: ['gateway:hsrp-1-active-changes', 'device:r1=DOWN'] },
    verificationCriteria: { checks: ['standby member can become the expected active gateway', 'virtual IP remains defined'] },
  },
  {
    slug: 'acl-denial-investigation',
    title: 'ACL Denial Investigation',
    summary: 'Scenario contract for investigating a structured ACL denial without claiming full IOS packet-policy emulation.',
    order: 40,
    baselineState: { schemaVersion: 'networking.scenario.v1', requiredSignals: ['acl-records-present'] },
    actions: { schemaVersion: 'networking.scenario.v1', mutations: [{ type: 'SELECT_ACL_OBSERVATION', aclId: 'acl-103' }] },
    expectedObservations: { observableSignals: ['acl:acl-103=deny', 'policy-review-required'] },
    verificationCriteria: { checks: ['deny rule remains inspectable', 'engine does not fabricate packet-policy enforcement'] },
  },
] as const;

const linuxScenarioDefinitions = [
  {
    slug: 'service-failure',
    title: 'systemd Service Failure',
    summary: 'Scenario contract for investigating a failed systemd unit using recorded service state, unit configuration, and journal evidence.',
    order: 10,
    baselineState: { schemaVersion: 'linux.scenario.v1', requiredSignals: ['host:rhel9-lab-01=UP', 'service:sshd.service=ACTIVE'] },
    actions: { schemaVersion: 'linux.scenario.v1', mutations: [{ type: 'SET_SERVICE_STATE', hostKey: 'rhel9-lab-01', unit: 'sshd.service', activeState: 'FAILED' }] },
    expectedObservations: { observableSignals: ['service:sshd.service=FAILED', 'service-health=DEGRADED', 'journal-correlation-available-if-recorded'] },
    verificationCriteria: { checks: ['failed unit is surfaced by health analysis', 'remediation guidance remains non-executing'] },
  },
  {
    slug: 'selinux-denial',
    title: 'SELinux Denial Investigation',
    summary: 'Scenario contract for correlating an AVC denial with SELinux mode, labels, booleans, and recorded application context.',
    order: 20,
    baselineState: { schemaVersion: 'linux.scenario.v1', requiredSignals: ['selinux:mode=ENFORCING'] },
    actions: { schemaVersion: 'linux.scenario.v1', mutations: [{ type: 'ADD_RECORDED_AVC_DENIAL', hostKey: 'rhel9-lab-01' }] },
    expectedObservations: { observableSignals: ['selinux:avc-denial-present', 'policy-context-review-required'] },
    verificationCriteria: { checks: ['denial evidence is inspectable', 'engine does not recommend disabling SELinux as a generic fix'] },
  },
  {
    slug: 'mount-failure',
    title: 'Persistent Mount Failure',
    summary: 'Scenario contract for an LVM-backed filesystem that is expected by fstab but is not represented as mounted.',
    order: 30,
    baselineState: { schemaVersion: 'linux.scenario.v1', requiredSignals: ['fstab:/data/db=DEFINED'] },
    actions: { schemaVersion: 'linux.scenario.v1', mutations: [{ type: 'SET_MOUNT_STATE', hostKey: 'rhel9-lab-01', target: '/data/db', state: 'UNMOUNTED' }] },
    expectedObservations: { observableSignals: ['mount:/data/db=UNMOUNTED', 'fstab-runtime-mismatch', 'storage-health=DEGRADED'] },
    verificationCriteria: { checks: ['mount mismatch is surfaced from recorded state', 'no automatic mount or LVM mutation is performed'] },
  },
  {
    slug: 'network-interface-loss',
    title: 'Network Interface Loss',
    summary: 'Scenario contract for investigating a recorded interface-down condition and its relationship to addresses and routes.',
    order: 40,
    baselineState: { schemaVersion: 'linux.scenario.v1', requiredSignals: ['network-interface-record-present'] },
    actions: { schemaVersion: 'linux.scenario.v1', mutations: [{ type: 'SET_INTERFACE_STATE', hostKey: 'rhel9-lab-01', interfaceName: 'bond0', state: 'DOWN' }] },
    expectedObservations: { observableSignals: ['interface:bond0=DOWN', 'network-health=DEGRADED'] },
    verificationCriteria: { checks: ['interface state is visible to diagnostics', 'engine does not fabricate reachability'] },
  },
] as const;

function categoryDomain(slug: string): Domain {
  switch (slug) {
    case 'networking':
      return Domain.NETWORKING;
    case 'linux':
      return Domain.LINUX;
    case 'devops':
      return Domain.DEVOPS;
    default:
      throw new Error(`Unsupported seed category slug: ${slug}`);
  }
}

function lifecycleStatus(status: ApiProject['status']): ProjectLifecycleStatus {
  switch (status) {
    case 'COMPLETED':
      return ProjectLifecycleStatus.COMPLETED;
    case 'IN_PROGRESS':
      return ProjectLifecycleStatus.IN_PROGRESS;
    case 'ARCHIVED':
      return ProjectLifecycleStatus.ARCHIVED;
    case 'PLANNED':
      return ProjectLifecycleStatus.PLANNED;
    default:
      throw new Error(`Unsupported seed project status: ${String(status)}`);
  }
}

function publicationStatus(status: ProjectLifecycleStatus): ContentStatus {
  switch (status) {
    case ProjectLifecycleStatus.COMPLETED:
      return ContentStatus.PUBLISHED;
    case ProjectLifecycleStatus.IN_PROGRESS:
    case ProjectLifecycleStatus.PLANNED:
      return ContentStatus.DRAFT;
    case ProjectLifecycleStatus.ARCHIVED:
      return ContentStatus.ARCHIVED;
  }
}

function projectFormat(format: ApiProject['formatType']): ProjectFormatType {
  switch (format ?? 'standard') {
    case 'cisco_pkt_lab':
      return ProjectFormatType.CISCO_PKT_LAB;
    case 'rhcsa_matrix':
      return ProjectFormatType.RHCSA_MATRIX;
    case 'devops_pipeline':
      return ProjectFormatType.DEVOPS_PIPELINE;
    case 'standard':
      return ProjectFormatType.STANDARD;
    default:
      throw new Error(`Unsupported seed project format: ${String(format)}`);
  }
}

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

type SeedNetworkStatus = 'UP' | 'DOWN' | 'STANDBY' | 'DEGRADED' | 'UNKNOWN';

interface NetworkDeviceState {
  key: string;
  name: string;
  kind: 'isp' | 'router' | 'multilayer_switch' | 'switch' | 'firewall' | 'server' | 'workstation' | 'endpoint' | 'unknown';
  vendor: string | null;
  model: string | null;
  role: string | null;
  managementIp: string | null;
  status: SeedNetworkStatus;
  position: { x: number; y: number };
  interfaces: Array<{
    name: string;
    type: string;
    ipAddress: string | null;
    subnet: string | null;
    vlan: string | null;
    status: SeedNetworkStatus;
    description: string | null;
  }>;
  routingProtocols: string[];
  configurationText: string | null;
  metadata: Record<string, unknown>;
}

interface NetworkLinkState {
  key: string;
  source: string;
  target: string;
  label: string | null;
  kind: string | null;
  protocol: string | null;
  speed: string | null;
  status: SeedNetworkStatus;
  sourceInterface: string | null;
  targetInterface: string | null;
  metadata: Record<string, unknown>;
}

interface NetworkingNormalizedStateV1 {
  schemaVersion: 'networking.v1';
  overview: string | null;
  routingTable: Array<{
    network: string;
    nextHop: string;
    interfaceName: string;
    protocolCode: string;
    protocolName: string;
    metric: string | null;
    administrativeDistance: number | null;
    deviceKey: string | null;
  }>;
  vlans: Array<{ vlanId: number; name: string; ports: string[]; status: SeedNetworkStatus }>;
  accessControlLists: Array<{
    id: string; name: string; action: 'permit' | 'deny'; protocol: string; source: string; destination: string;
    deviceKey?: string | null; interface?: string | null; direction?: 'IN' | 'OUT'; sequence?: number | null;
  }>;
  bgpNeighbors: Array<{
    id: string; deviceKey: string; peerDeviceKey: string | null; peerAddress: string; localAs: number; remoteAs: number;
    sessionType: 'EBGP' | 'IBGP'; state: string; addressFamily: string; prefixesReceived: number | null; description: string; source: 'NORMALIZED_INPUT';
  }>;
  ospfNeighbors: Array<{
    id: string; deviceKey: string; peerDeviceKey: string | null; neighborId: string; neighborAddress: string | null; interfaceName: string;
    area: string; state: string; role: string | null; source: 'NORMALIZED_INPUT';
  }>;
  gatewayRedundancy: Array<{
    id: string; protocol: 'HSRP'; group: number; virtualIp: string; source: 'NORMALIZED_INPUT';
    members: Array<{ deviceKey: string; role: 'ACTIVE' | 'STANDBY'; priority: number; preempt: boolean; trackedInterfaces: string[]; status: SeedNetworkStatus }>;
  }>;
  verificationChecks: Array<{ id: string; title: string; command: string; expectedObservation: string; status: 'EXPECTED' }>;
  specifications: { environment: string | null; protocols: string[]; addressing: string[] };
  provenance: {
    sourceType: 'NORMALIZED_PROJECT_FIXTURE';
    packetTracerReference: { fileName: string; sizeBytes: number | null; recordedAt: string | null; referenceOnly: true };
    notes: string[];
  };
}

interface SeedNetworkingFixture {
  controlPlane: NetworkingNormalizedStateV1;
  devices: NetworkDeviceState[];
  links: NetworkLinkState[];
}

function networkingFixture(project: ApiProject): SeedNetworkingFixture | null {
  const data = project.ciscoLabData;
  if (!data) return null;

  const positions: Record<string, { x: number; y: number }> = {
    isp1: { x: 150, y: 70 },
    isp2: { x: 850, y: 70 },
    r1: { x: 310, y: 190 },
    r2: { x: 690, y: 190 },
    sw_core: { x: 500, y: 320 },
    fw_asa: { x: 210, y: 450 },
    srv_k8s: { x: 500, y: 500 },
    pc_devops: { x: 790, y: 450 },
  };

  const devices: NetworkDeviceState[] = data.devices.map((device, index) => ({
    key: device.id,
    name: device.name,
    kind: device.type === 'pc' ? 'workstation' : device.type,
    vendor: device.type === 'isp' ? null : 'Cisco',
    model: device.model,
    role: device.role,
    managementIp: device.mgmtIp,
    status: device.status === 'ONLINE' ? 'UP' : device.status,
    position: positions[device.id] ?? { x: 120 + (index % 4) * 240, y: 120 + Math.floor(index / 4) * 180 },
    interfaces: device.interfaces.map((entry) => ({
      name: entry.name,
      type: entry.type,
      ipAddress: entry.ip,
      subnet: entry.subnet,
      vlan: entry.vlan ?? null,
      status: entry.status === 'UP' ? 'UP' : 'DOWN',
      description: null,
    })),
    routingProtocols: [...device.routingProtocols],
    configurationText: device.runningConfigSnippet,
    metadata: { source: 'seeded-project-fixture' },
  }));

  if (!devices.some((device) => device.key === 'srv_k8s')) {
    devices.push({
      key: 'srv_k8s',
      name: 'Platform Workload Node',
      kind: 'server',
      vendor: null,
      model: 'RHEL 9 workload representation',
      role: 'Server VLAN application endpoint',
      managementIp: '10.10.20.50',
      status: 'UP',
      position: positions.srv_k8s,
      interfaces: [{
        name: 'eth0', type: 'Ethernet', ipAddress: '10.10.20.50', subnet: '255.255.255.0', vlan: '20', status: 'UP', description: 'Server VLAN access interface',
      }],
      routingProtocols: [],
      configurationText: `hostname platform-workload-01
ip address 10.10.20.50/24
default gateway 10.10.20.1`,
      metadata: { source: 'seeded-project-fixture' },
    });
  }

  if (!devices.some((device) => device.key === 'pc_devops')) {
    devices.push({
      key: 'pc_devops',
      name: 'Operations Workstation',
      kind: 'workstation',
      vendor: null,
      model: 'Engineering client representation',
      role: 'Engineering VLAN test endpoint',
      managementIp: '10.10.10.105',
      status: 'UP',
      position: positions.pc_devops,
      interfaces: [{
        name: 'eth0', type: 'Ethernet', ipAddress: '10.10.10.105', subnet: '255.255.255.0', vlan: '10', status: 'UP', description: 'Engineering VLAN access interface',
      }],
      routingProtocols: [],
      configurationText: `hostname operations-workstation
ip address 10.10.10.105/24
default gateway 10.10.10.1`,
      metadata: { source: 'seeded-project-fixture' },
    });
  }

  const linkDefinitions: Array<Omit<NetworkLinkState, 'metadata'>> = [
    { key: 'isp1-r1', source: 'isp1', target: 'r1', label: 'Primary carrier uplink', kind: 'wan', protocol: 'eBGP', speed: '10 Gbps', status: 'UP', sourceInterface: 'Gi0/0/0', targetInterface: 'Gi0/0/0' },
    { key: 'isp2-r2', source: 'isp2', target: 'r2', label: 'Secondary carrier uplink', kind: 'wan', protocol: 'eBGP', speed: '10 Gbps', status: 'UP', sourceInterface: 'Gi0/0/0', targetInterface: 'Gi0/0/0' },
    { key: 'r1-r2', source: 'r1', target: 'r2', label: 'Edge peer and gateway heartbeat', kind: 'peer', protocol: 'iBGP / HSRP', speed: '40 Gbps', status: 'UP', sourceInterface: null, targetInterface: null },
    { key: 'r1-sw-core', source: 'r1', target: 'sw_core', label: 'Core routed trunk', kind: 'trunk', protocol: 'OSPF / 802.1Q', speed: '20 Gbps', status: 'UP', sourceInterface: 'Gi0/0/1', targetInterface: 'Te1/0/1' },
    { key: 'r2-sw-core', source: 'r2', target: 'sw_core', label: 'Redundant core trunk', kind: 'trunk', protocol: 'OSPF / 802.1Q', speed: '20 Gbps', status: 'UP', sourceInterface: 'Gi0/0/1', targetInterface: 'Te1/0/2' },
    { key: 'sw-core-fw', source: 'sw_core', target: 'fw_asa', label: 'DMZ security segment', kind: 'access', protocol: 'VLAN 30', speed: '10 Gbps', status: 'UP', sourceInterface: null, targetInterface: 'Gi1/1' },
    { key: 'sw-core-server', source: 'sw_core', target: 'srv_k8s', label: 'Server VLAN access', kind: 'access', protocol: 'VLAN 20', speed: '10 Gbps', status: 'UP', sourceInterface: null, targetInterface: 'eth0' },
    { key: 'sw-core-workstation', source: 'sw_core', target: 'pc_devops', label: 'Engineering VLAN access', kind: 'access', protocol: 'VLAN 10', speed: '1 Gbps', status: 'UP', sourceInterface: null, targetInterface: 'eth0' },
  ];
  const keys = new Set(devices.map((device) => device.key));
  const links: NetworkLinkState[] = linkDefinitions
    .filter((link) => keys.has(link.source) && keys.has(link.target))
    .map((link) => ({ ...link, metadata: { source: 'seeded-project-fixture' } }));

  const protocols = [...new Set(devices.flatMap((device) => device.routingProtocols))].sort();
  const addressing = [...new Set(devices.flatMap((device) => device.interfaces)
    .filter((entry) => entry.ipAddress)
    .map((entry) => `${entry.ipAddress}${entry.subnet ? ` / ${entry.subnet}` : ''}`))];

  return {
    devices,
    links,
    controlPlane: {
      schemaVersion: 'networking.v1',
      overview: data.overviewSummary,
      routingTable: data.routingTable.map((route) => ({
        network: route.network,
        nextHop: route.nextHop,
        interfaceName: route.interface,
        protocolCode: route.protocol,
        protocolName: route.protocolName,
        metric: route.metric,
        administrativeDistance: route.ad,
        deviceKey: 'r1',
      })),
      vlans: data.vlanDatabase.map((vlan) => ({
        vlanId: vlan.vlanId,
        name: vlan.name,
        ports: [...vlan.ports],
        status: vlan.status === 'ACTIVE' ? 'UP' : 'UNKNOWN',
      })),
      accessControlLists: data.aclRules.map((rule, index) => ({
        ...rule,
        deviceKey: 'fw_asa',
        interface: 'GigabitEthernet1/1 (Inside)',
        direction: 'IN' as const,
        sequence: (index + 1) * 10,
      })),
      bgpNeighbors: [
        { id: 'r1-isp1', deviceKey: 'r1', peerDeviceKey: 'isp1', peerAddress: '198.51.100.1', localAs: 65001, remoteAs: 100, sessionType: 'EBGP' as const, state: 'ESTABLISHED', addressFamily: 'IPv4 Unicast', prefixesReceived: 1, description: 'Primary carrier baseline session', source: 'NORMALIZED_INPUT' as const },
        { id: 'r1-r2', deviceKey: 'r1', peerDeviceKey: 'r2', peerAddress: '10.10.0.3', localAs: 65001, remoteAs: 65001, sessionType: 'IBGP' as const, state: 'ESTABLISHED', addressFamily: 'IPv4 Unicast', prefixesReceived: null, description: 'Internal edge peer baseline session', source: 'NORMALIZED_INPUT' as const },
        { id: 'r2-isp2', deviceKey: 'r2', peerDeviceKey: 'isp2', peerAddress: '203.0.113.1', localAs: 65001, remoteAs: 200, sessionType: 'EBGP' as const, state: 'ESTABLISHED', addressFamily: 'IPv4 Unicast', prefixesReceived: null, description: 'Secondary carrier baseline session', source: 'NORMALIZED_INPUT' as const },
        { id: 'r2-r1', deviceKey: 'r2', peerDeviceKey: 'r1', peerAddress: '10.10.0.2', localAs: 65001, remoteAs: 65001, sessionType: 'IBGP' as const, state: 'ESTABLISHED', addressFamily: 'IPv4 Unicast', prefixesReceived: null, description: 'Internal edge peer baseline session', source: 'NORMALIZED_INPUT' as const },
      ].filter((entry) => keys.has(entry.deviceKey) && (!entry.peerDeviceKey || keys.has(entry.peerDeviceKey))),
      ospfNeighbors: [
        { id: 'r1-r2', deviceKey: 'r1', peerDeviceKey: 'r2', neighborId: '2.2.2.2', neighborAddress: '10.10.0.3', interfaceName: 'Gi0/0/1', area: '0.0.0.0', state: 'FULL/BDR', role: 'BDR', source: 'NORMALIZED_INPUT' as const },
        { id: 'r2-r1', deviceKey: 'r2', peerDeviceKey: 'r1', neighborId: '1.1.1.1', neighborAddress: '10.10.0.2', interfaceName: 'Gi0/0/1', area: '0.0.0.0', state: 'FULL/DR', role: 'DR', source: 'NORMALIZED_INPUT' as const },
      ].filter((entry) => keys.has(entry.deviceKey) && (!entry.peerDeviceKey || keys.has(entry.peerDeviceKey))),
      gatewayRedundancy: keys.has('r1') && keys.has('r2') ? [{
        id: 'hsrp-1', protocol: 'HSRP' as const, group: 1, virtualIp: '10.10.0.1', source: 'NORMALIZED_INPUT' as const,
        members: [
          { deviceKey: 'r1', role: 'ACTIVE' as const, priority: 110, preempt: true, trackedInterfaces: ['Gi0/0/0'], status: 'UP' as const },
          { deviceKey: 'r2', role: 'STANDBY' as const, priority: 90, preempt: false, trackedInterfaces: [], status: 'STANDBY' as const },
        ],
      }] : [],
      verificationChecks: data.verificationTasks.map((check, index) => ({
        id: `network-check-${index + 1}`,
        title: check.task,
        command: check.testCommand,
        expectedObservation: check.expectedResult,
        status: 'EXPECTED',
      })),
      specifications: {
        environment: 'Cisco Packet Tracer reference topology with normalized IOS-style configuration snapshots',
        protocols,
        addressing,
      },
      provenance: {
        sourceType: 'NORMALIZED_PROJECT_FIXTURE',
        packetTracerReference: {
          fileName: data.pktFileName,
          sizeBytes: data.pktFileSizeBytes ?? null,
          recordedAt: data.uploadedAt ?? null,
          referenceOnly: true,
        },
        notes: [
          'The interactive explorer is generated from persisted normalized Lab records.',
          'The Packet Tracer filename is reference metadata; arbitrary .pkt binary parsing is not claimed.',
        ],
      },
    },
  };
}


type SeedLinuxHostStatus = 'UP' | 'DOWN' | 'DEGRADED' | 'UNKNOWN';

interface LinuxNormalizedHostV1 {
  key: string;
  label: string;
  hostname: string;
  osName: string;
  osVersion: string;
  kernelVersion: string;
  architecture: string;
  bootTarget: string;
  status: SeedLinuxHostStatus;
  fipsMode: boolean;
  timeSynchronization: string | null;
  description: string;
  services: Array<{
    unit: string;
    description: string;
    activeState: 'ACTIVE' | 'INACTIVE' | 'FAILED' | 'UNKNOWN';
    subState: string | null;
    enabled: boolean | null;
    restartPolicy: string | null;
    user: string | null;
    configurationSnippet: string | null;
    source: 'NORMALIZED_INPUT';
  }>;
  blockDevices: Array<{
    name: string; type: string; size: string | null; filesystem: string | null; mountPoint: string | null; parent: string | null; state: 'MOUNTED' | 'UNMOUNTED' | 'DEGRADED' | 'UNKNOWN';
  }>;
  volumeGroups: Array<{ name: string; size: string | null; free: string | null; physicalVolumes: string[] }>;
  logicalVolumes: Array<{ name: string; volumeGroup: string; size: string | null; layout: string | null; filesystem: string | null; mountPoint: string | null; state: 'MOUNTED' | 'UNMOUNTED' | 'DEGRADED' | 'UNKNOWN' }>;
  mounts: Array<{ source: string; target: string; filesystem: string; options: string[]; state: 'MOUNTED' | 'UNMOUNTED' | 'DEGRADED' | 'UNKNOWN' }>;
  fstab: Array<{ source: string; target: string; filesystem: string; options: string[]; dump: number | null; pass: number | null }>;
  selinux: {
    mode: 'ENFORCING' | 'PERMISSIVE' | 'DISABLED' | 'UNKNOWN'; configuredMode: 'ENFORCING' | 'PERMISSIVE' | 'DISABLED' | 'UNKNOWN'; policy: string;
    booleans: Array<{ name: string; enabled: boolean }>;
    ports: Array<{ type: string; protocol: string; ports: string }>;
    contexts: Array<{ path: string; context: string; source: 'NORMALIZED_INPUT' }>;
    source: 'NORMALIZED_INPUT';
  };
  interfaces: Array<{ name: string; type: string | null; state: 'UP' | 'DOWN' | 'UNKNOWN'; addresses: string[]; gateway: string | null; dns: string[]; connection: string | null; mtu: number | null }>;
  routes: Array<{ destination: string; gateway: string | null; interface: string | null; metric: number | null; protocol: string | null }>;
  logs: Array<{ id: string; source: string; priority: string | null; timestamp: string | null; message: string; recorded: true }>;
  configurations: Array<{ path: string; format: string; content: string; description: string; source: 'NORMALIZED_INPUT' }>;
  verificationRecords: Array<{ id: string; title: string; command: string; recordedObservation: string; source: 'NORMALIZED_INPUT' }>;
  metadata: Record<string, unknown>;
}

interface LinuxNormalizedStateV1 {
  schemaVersion: 'linux.v1';
  overview: string;
  hosts: LinuxNormalizedHostV1[];
  provenance: {
    sourceType: 'NORMALIZED_PROJECT_FIXTURE';
    notes: string[];
  };
}

interface SeedLinuxFixture {
  state: LinuxNormalizedStateV1;
  host: LinuxNormalizedHostV1;
  fstabText: string | null;
  systemdUnitText: string | null;
}

function parseSeedFstab(content: string | null): LinuxNormalizedHostV1['fstab'] {
  if (!content) return [];
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .flatMap((line) => {
      const fields = line.split(/\s+/);
      if (fields.length < 4) return [];
      const dump = fields[4] !== undefined && /^\d+$/.test(fields[4]) ? Number(fields[4]) : null;
      const pass = fields[5] !== undefined && /^\d+$/.test(fields[5]) ? Number(fields[5]) : null;
      return [{
        source: fields[0]!,
        target: fields[1]!,
        filesystem: fields[2]!,
        options: fields[3]!.split(',').map((entry) => entry.trim()).filter(Boolean),
        dump,
        pass,
      }];
    });
}

function linuxFixture(project: ApiProject): SeedLinuxFixture | null {
  const data = project.rhcsaMatrixData;
  if (!data) return null;

  const configs = data.objectives.flatMap((objective) =>
    objective.configFiles.map((config) => ({
      path: config.path,
      format: config.language,
      content: config.content,
      description: config.description,
      source: 'NORMALIZED_INPUT' as const,
    })),
  );
  const fstabConfig = configs.find((config) => config.path === '/etc/fstab') ?? null;
  const systemdConfig = configs.find((config) => config.path.endsWith('.service')) ?? null;
  const fstab = parseSeedFstab(fstabConfig?.content ?? null);
  const mountRecords = fstab
    .filter((entry) => entry.target !== 'none' && entry.filesystem !== 'swap')
    .map((entry) => ({
      source: entry.source,
      target: entry.target,
      filesystem: entry.filesystem,
      options: entry.options,
      state: 'UNKNOWN' as const,
    }));

  const verificationRecords = data.objectives.map((objective) => ({
    id: objective.id,
    title: `${objective.domainCode} — ${objective.domainTitle}`,
    command: objective.verificationCommand,
    recordedObservation: objective.verificationOutput,
    source: 'NORMALIZED_INPUT' as const,
  }));

  const host: LinuxNormalizedHostV1 = {
    key: 'rhel9-lab-01',
    label: 'RHEL9-LAB-01',
    hostname: 'rhel9-lab-01',
    osName: 'Red Hat Enterprise Linux',
    osVersion: data.rhelVersion,
    kernelVersion: data.kernelVersion,
    architecture: 'x86_64',
    bootTarget: 'multi-user.target',
    status: 'UP',
    fipsMode: data.fipsMode,
    timeSynchronization: 'Chrony configuration and verification output are recorded in the normalized project fixture.',
    description: 'Canonical RHEL 9.4 host representation generated from the persisted RHCSA-oriented project fixture.',
    services: [
      {
        unit: 'node-exporter.service',
        description: 'Prometheus Node Exporter systemd unit from the project configuration fixture.',
        activeState: 'ACTIVE',
        subState: 'running',
        enabled: true,
        restartPolicy: 'on-failure',
        user: 'node_exporter',
        configurationSnippet: systemdConfig?.content ?? null,
        source: 'NORMALIZED_INPUT',
      },
      {
        unit: 'sshd.service', description: 'OpenSSH server configuration is represented by the persisted hardening snippet.', activeState: 'ACTIVE', subState: 'running', enabled: true, restartPolicy: null, user: 'root', configurationSnippet: configs.find((entry) => entry.path.includes('sshd_config'))?.content ?? null, source: 'NORMALIZED_INPUT',
      },
      {
        unit: 'firewalld.service', description: 'firewalld policy configuration is represented by the recorded project fixture.', activeState: 'ACTIVE', subState: 'running', enabled: true, restartPolicy: null, user: 'root', configurationSnippet: configs.find((entry) => entry.path.includes('/firewalld/'))?.content ?? null, source: 'NORMALIZED_INPUT',
      },
      {
        unit: 'chronyd.service', description: 'Chrony time synchronization is represented by the recorded verification output.', activeState: 'ACTIVE', subState: 'running', enabled: true, restartPolicy: null, user: 'chrony', configurationSnippet: null, source: 'NORMALIZED_INPUT',
      },
    ],
    blockDevices: [
      { name: '/dev/vg_prod/lv_data', type: 'lvm', size: '50G', filesystem: 'xfs', mountPoint: '/data/db', parent: '/dev/sdb1', state: 'UNKNOWN' },
    ],
    volumeGroups: [{ name: 'vg_prod', size: null, free: null, physicalVolumes: ['/dev/sdb1'] }],
    logicalVolumes: [{ name: 'lv_data', volumeGroup: 'vg_prod', size: '50G', layout: 'linear', filesystem: 'xfs', mountPoint: '/data/db', state: 'UNKNOWN' }],
    mounts: mountRecords,
    fstab,
    selinux: {
      mode: data.selinuxMode === 'Enforcing' ? 'ENFORCING' : data.selinuxMode === 'Permissive' ? 'PERMISSIVE' : 'DISABLED',
      configuredMode: data.selinuxMode === 'Enforcing' ? 'ENFORCING' : data.selinuxMode === 'Permissive' ? 'PERMISSIVE' : 'DISABLED',
      policy: 'targeted',
      booleans: [{ name: 'httpd_can_network_connect', enabled: true }],
      ports: [],
      contexts: [{ path: '/srv/web', context: 'httpd_sys_content_t', source: 'NORMALIZED_INPUT' }],
      source: 'NORMALIZED_INPUT',
    },
    interfaces: [{
      name: 'bond0', type: 'bond', state: 'UNKNOWN', addresses: [], gateway: null, dns: [], connection: 'bond0', mtu: null,
    }],
    routes: [],
    logs: [],
    configurations: configs,
    verificationRecords,
    metadata: {
      source: 'seeded-rhcsa-project-fixture',
      objectiveCount: data.totalCompetencies,
      note: 'Recorded project fixture; not live host telemetry.',
    },
  };

  return {
    host,
    fstabText: fstabConfig?.content ?? null,
    systemdUnitText: systemdConfig?.content ?? null,
    state: {
      schemaVersion: 'linux.v1',
      overview: 'Canonical Linux host state normalized from the persisted RHEL 9.4 hardening project fixture.',
      hosts: [host],
      provenance: {
        sourceType: 'NORMALIZED_PROJECT_FIXTURE',
        notes: [
          'The Linux engine renders persisted normalized Lab state and recorded configuration/verification inputs.',
          'Host values are a project fixture, not live server telemetry.',
        ],
      },
    },
  };
}


interface SeedDevOpsFixture {
  state: {
    schemaVersion: 'devops.v1';
    overview: string;
    repository: {
      name: string;
      branch: string;
      commitSha: string;
      source: 'RECORDED_PROJECT_FIXTURE';
    };
    pipelines: Array<{
      id: string;
      name: string;
      framework: string;
      status: 'SUCCESS' | 'RUNNING' | 'PENDING' | 'FAILED' | 'UNKNOWN';
      stages: Array<{
        id: string;
        name: string;
        tool: string;
        status: 'SUCCESS' | 'RUNNING' | 'PENDING' | 'FAILED' | 'UNKNOWN';
        durationSeconds: number;
        recordedOutput: string;
        artifacts: string[];
        source: 'RECORDED_PROJECT_FIXTURE';
      }>;
      source: 'RECORDED_PROJECT_FIXTURE';
    }>;
    terraform: {
      present: true;
      workspace: null;
      backend: string | null;
      files: Array<{
        name: string;
        path: string;
        type: 'FILE' | 'DIRECTORY';
        size: string | null;
        content: string | null;
        source: 'RECORDED_PROJECT_FIXTURE';
      }>;
      source: 'RECORDED_PROJECT_FIXTURE';
    } | null;
    kubernetes: {
      clusters: Array<{ name: string; version: string | null; status: 'READY' | 'UNKNOWN'; provider: string | null; source: 'RECORDED_PROJECT_FIXTURE' }>;
      workloads: Array<{ kind: string; namespace: null; name: string; desiredReplicas: number; readyReplicas: number; status: 'READY'; image: null; source: 'RECORDED_PROJECT_FIXTURE' }>;
    };
    gitops: Array<{ name: string; controller: string; syncStatus: 'SYNCED' | 'UNKNOWN'; healthStatus: 'HEALTHY' | 'UNKNOWN'; revision: string; destination: string | null; source: 'RECORDED_PROJECT_FIXTURE' }>;
    helm: Array<{ name: string; namespace: null; chart: string; version: null; status: 'READY'; source: 'RECORDED_PROJECT_FIXTURE' }>;
    networkPolicies: Array<{ name: string; namespace: null; provider: 'Cilium'; status: 'ENFORCED'; summary: string; source: 'RECORDED_PROJECT_FIXTURE' }>;
    observability: Array<{ id: string; name: string; provider: string; status: 'PASS' | 'UNKNOWN'; summary: string; recordedOutput: string; source: 'RECORDED_PROJECT_FIXTURE' }>;
    architecture: Array<{ tier: string; description: string; technologies: string[]; recordedMetric: string | null }>;
    provenance: { sourceType: 'NORMALIZED_PROJECT_FIXTURE'; notes: string[] };
  };
}

function devOpsStageStatus(value: string): 'SUCCESS' | 'RUNNING' | 'PENDING' | 'FAILED' | 'UNKNOWN' {
  return value === 'SUCCESS' || value === 'RUNNING' || value === 'PENDING' || value === 'FAILED' ? value : 'UNKNOWN';
}

function flattenSeedIaCTree(
  nodes: NonNullable<ApiProject['devopsPipelineData']>['iacTree'],
  result: NonNullable<SeedDevOpsFixture['state']['terraform']>['files'] = [],
): NonNullable<SeedDevOpsFixture['state']['terraform']>['files'] {
  for (const node of nodes) {
    result.push({
      name: node.name,
      path: node.path,
      type: node.type === 'directory' ? 'DIRECTORY' : 'FILE',
      size: node.size ?? null,
      content: node.type === 'file' ? node.content ?? null : null,
      source: 'RECORDED_PROJECT_FIXTURE',
    });
    if (node.children) flattenSeedIaCTree(node.children, result);
  }
  return result;
}

function devOpsFixture(project: ApiProject): SeedDevOpsFixture | null {
  const data = project.devopsPipelineData;
  if (!data) return null;

  const stages = data.pipelineStages.map((stage) => ({
    id: stage.id,
    name: stage.name,
    tool: stage.tool,
    status: devOpsStageStatus(stage.status),
    durationSeconds: stage.durationSeconds,
    recordedOutput: stage.stdoutSnippet,
    artifacts: stage.artifactsProduced ?? [],
    source: 'RECORDED_PROJECT_FIXTURE' as const,
  }));
  const pipelineStatus = stages.some((stage) => stage.status === 'FAILED')
    ? 'FAILED' as const
    : stages.some((stage) => stage.status === 'RUNNING')
      ? 'RUNNING' as const
      : stages.length > 0 && stages.every((stage) => stage.status === 'SUCCESS')
        ? 'SUCCESS' as const
        : stages.some((stage) => stage.status === 'PENDING')
          ? 'PENDING' as const
          : 'UNKNOWN' as const;

  const files = flattenSeedIaCTree(data.iacTree);
  const terraformFiles = files.filter((file) => file.path.toLowerCase().endsWith('.tf'));
  const backendMatch = terraformFiles.map((file) => file.content ?? '').join('\n').match(/backend\s+"([^"]+)"/i);

  const argoStage = data.pipelineStages.find((stage) => /argocd/i.test(stage.tool) || /argocd/i.test(stage.name));
  const argoOutput = argoStage?.stdoutSnippet ?? '';
  const clusterMatch = argoOutput.match(/cluster\s+'([^']+)'/i);
  const workloadMatch = argoOutput.match(/(Deployment)\/([A-Za-z0-9._-]+)\s*->\s*(\d+)\/(\d+)\s+Replicas Ready/i);
  const kubernetesVersion = data.architectureLayers
    .flatMap((layer) => layer.technologies)
    .map((technology) => technology.match(/Kubernetes\s+([0-9.]+)/i)?.[1] ?? null)
    .find((version): version is string => version !== null) ?? null;

  const helmStage = data.pipelineStages.find((stage) => /helm/i.test(stage.tool) || /helm/i.test(stage.name));
  const helmMatch = helmStage?.stdoutSnippet.match(/Packaging chart\s+([^\s]+)/i) ?? null;
  const observabilityStages = data.pipelineStages.filter((stage) => /prometheus|flagger|observability|telemetry|canary/i.test(`${stage.tool} ${stage.name}`));

  return {
    state: {
      schemaVersion: 'devops.v1',
      overview: 'Canonical DevOps delivery state normalized from the persisted GitOps/Kubernetes/Terraform project fixture.',
      repository: {
        name: project.slug,
        branch: data.branch,
        commitSha: data.gitCommitSha,
        source: 'RECORDED_PROJECT_FIXTURE',
      },
      pipelines: [{
        id: 'delivery',
        name: 'Recorded GitOps Delivery Pipeline',
        framework: data.framework,
        status: pipelineStatus,
        stages,
        source: 'RECORDED_PROJECT_FIXTURE',
      }],
      terraform: terraformFiles.length > 0 ? {
        present: true,
        workspace: null,
        backend: backendMatch?.[1] ?? null,
        files,
        source: 'RECORDED_PROJECT_FIXTURE',
      } : null,
      kubernetes: {
        clusters: clusterMatch ? [{
          name: clusterMatch[1]!,
          version: kubernetesVersion,
          status: /Health:\s*Healthy/i.test(argoOutput) ? 'READY' : 'UNKNOWN',
          provider: data.architectureLayers.flatMap((layer) => layer.technologies).some((technology) => /EKS/i.test(technology)) ? 'EKS' : null,
          source: 'RECORDED_PROJECT_FIXTURE',
        }] : [],
        workloads: workloadMatch ? [{
          kind: workloadMatch[1]!,
          namespace: null,
          name: workloadMatch[2]!,
          desiredReplicas: Number(workloadMatch[3]),
          readyReplicas: Number(workloadMatch[4]),
          status: 'READY',
          image: null,
          source: 'RECORDED_PROJECT_FIXTURE',
        }] : [],
      },
      gitops: argoStage ? [{
        name: 'recorded-argocd-reconciliation',
        controller: 'ArgoCD',
        syncStatus: /Sync status:\s*Synced/i.test(argoOutput) ? 'SYNCED' : 'UNKNOWN',
        healthStatus: /Health:\s*Healthy/i.test(argoOutput) ? 'HEALTHY' : 'UNKNOWN',
        revision: data.gitCommitSha,
        destination: clusterMatch?.[1] ?? null,
        source: 'RECORDED_PROJECT_FIXTURE',
      }] : [],
      helm: helmMatch ? [{
        name: 'recorded-chart-package',
        namespace: null,
        chart: helmMatch[1]!,
        version: null,
        status: 'READY',
        source: 'RECORDED_PROJECT_FIXTURE',
      }] : [],
      networkPolicies: /Cilium NetworkPolicies\s*->\s*Enforced/i.test(argoOutput) ? [{
        name: 'recorded-cilium-network-policies',
        namespace: null,
        provider: 'Cilium',
        status: 'ENFORCED',
        summary: 'Recorded pipeline output reports Cilium NetworkPolicies as enforced; this is not live policy telemetry.',
        source: 'RECORDED_PROJECT_FIXTURE',
      }] : [],
      observability: observabilityStages.map((stage) => ({
        id: `observation-${stage.id}`,
        name: stage.name,
        provider: stage.tool,
        status: stage.status === 'SUCCESS' ? 'PASS' as const : 'UNKNOWN' as const,
        summary: 'Recorded pipeline observation from the persisted project fixture.',
        recordedOutput: stage.stdoutSnippet,
        source: 'RECORDED_PROJECT_FIXTURE' as const,
      })),
      architecture: data.architectureLayers.map((layer) => ({
        tier: layer.tier,
        description: layer.description,
        technologies: layer.technologies,
        recordedMetric: /\d/.test(layer.slaMetrics) ? null : layer.slaMetrics,
      })),
      provenance: {
        sourceType: 'NORMALIZED_PROJECT_FIXTURE',
        notes: [
          'The DevOps engine renders persisted normalized Lab state and recorded pipeline/IaC snapshots.',
          'Cluster, workload, GitOps and observability values are recorded project-fixture observations, not live production telemetry.',
          'The UI does not execute pipelines, Terraform, kubectl, Helm or ArgoCD commands in Phase 5A.',
        ],
      },
    },
  };
}
async function reconcileLinuxHosts(labId: string, fixture: SeedLinuxFixture): Promise<void> {
  const host = fixture.host;
  await prisma.$transaction(async (tx) => {
    await tx.labNode.upsert({
      where: { labId_nodeKey: { labId, nodeKey: host.key } },
      update: {
        label: host.label,
        kind: 'linux_host',
        description: host.description,
        position: jsonValue({ x: 320, y: 180 }),
        configuration: jsonValue({ host }),
        metadata: jsonValue({ source: 'seeded-rhcsa-project-fixture' }),
      },
      create: {
        labId,
        nodeKey: host.key,
        label: host.label,
        kind: 'linux_host',
        description: host.description,
        position: jsonValue({ x: 320, y: 180 }),
        configuration: jsonValue({ host }),
        metadata: jsonValue({ source: 'seeded-rhcsa-project-fixture' }),
      },
    });
    await tx.labLink.deleteMany({ where: { labId } });
    await tx.labNode.deleteMany({ where: { labId, nodeKey: { notIn: [host.key] } } });
  }, { maxWait: 10_000, timeout: 30_000 });
}

async function reconcileNetworkingTopology(labId: string, fixture: SeedNetworkingFixture): Promise<void> {
  const nodeKeys = fixture.devices.map((device) => device.key);
  const linkKeys = fixture.links.map((link) => link.key);
  await prisma.$transaction(async (tx) => {
    for (const device of fixture.devices) {
      await tx.labNode.upsert({
        where: { labId_nodeKey: { labId, nodeKey: device.key } },
        update: {
          label: device.name,
          kind: device.kind,
          description: device.role,
          position: jsonValue(device.position),
          configuration: jsonValue({
            device: {
              vendor: device.vendor,
              model: device.model,
              role: device.role,
              managementIp: device.managementIp,
              status: device.status,
              interfaces: device.interfaces,
              routingProtocols: device.routingProtocols,
              configurationText: device.configurationText,
            },
          }),
          metadata: jsonValue(device.metadata),
        },
        create: {
          labId,
          nodeKey: device.key,
          label: device.name,
          kind: device.kind,
          description: device.role,
          position: jsonValue(device.position),
          configuration: jsonValue({
            device: {
              vendor: device.vendor,
              model: device.model,
              role: device.role,
              managementIp: device.managementIp,
              status: device.status,
              interfaces: device.interfaces,
              routingProtocols: device.routingProtocols,
              configurationText: device.configurationText,
            },
          }),
          metadata: jsonValue(device.metadata),
        },
      });
    }

    for (const link of fixture.links) {
      await tx.labLink.upsert({
        where: { labId_linkKey: { labId, linkKey: link.key } },
        update: {
          sourceNodeKey: link.source,
          targetNodeKey: link.target,
          label: link.label,
          kind: link.kind,
          configuration: jsonValue({
            protocol: link.protocol,
            speed: link.speed,
            status: link.status,
            sourceInterface: link.sourceInterface,
            targetInterface: link.targetInterface,
          }),
          metadata: jsonValue(link.metadata),
        },
        create: {
          labId,
          linkKey: link.key,
          sourceNodeKey: link.source,
          targetNodeKey: link.target,
          label: link.label,
          kind: link.kind,
          configuration: jsonValue({
            protocol: link.protocol,
            speed: link.speed,
            status: link.status,
            sourceInterface: link.sourceInterface,
            targetInterface: link.targetInterface,
          }),
          metadata: jsonValue(link.metadata),
        },
      });
    }

    await tx.labLink.deleteMany({ where: { labId, linkKey: { notIn: linkKeys } } });
    await tx.labNode.deleteMany({ where: { labId, nodeKey: { notIn: nodeKeys } } });
  }, {
    maxWait: 10_000,
    timeout: 30_000,
  });
}

function projectMetadata(project: ApiProject): Prisma.InputJsonValue | undefined {
  const metadata =
    project.formatType === 'cisco_pkt_lab'
      ? project.ciscoLabData
      : project.formatType === 'rhcsa_matrix'
        ? project.rhcsaMatrixData
        : project.formatType === 'devops_pipeline'
          ? project.devopsPipelineData
          : undefined;
  return metadata === undefined ? undefined : jsonValue(metadata);
}

async function upsertCategory(seed: ApiCategory) {
  const domain = categoryDomain(seed.slug);
  return prisma.category.upsert({
    where: { slug: seed.slug },
    update: {
      name: seed.name,
      tagline: seed.tagline,
      description: seed.description,
      icon: seed.icon,
      accentColor: seed.accentColor,
      terminalTheme: seed.terminalTheme,
      sortOrder: seed.sortOrder,
      domain,
      status: seed.isPublished ? ContentStatus.PUBLISHED : ContentStatus.DRAFT,
    },
    create: {
      id: seed.id,
      slug: seed.slug,
      name: seed.name,
      tagline: seed.tagline,
      description: seed.description,
      icon: seed.icon,
      accentColor: seed.accentColor,
      terminalTheme: seed.terminalTheme,
      sortOrder: seed.sortOrder,
      domain,
      status: seed.isPublished ? ContentStatus.PUBLISHED : ContentStatus.DRAFT,
      createdAt: new Date(seed.createdAt),
    },
  });
}

async function findProjectForReconciliation(slug: string) {
  const canonical = await prisma.project.findUnique({ where: { slug } });
  const legacySlug = legacyProjectSlugs[slug];
  const legacy = legacySlug
    ? await prisma.project.findUnique({ where: { slug: legacySlug } })
    : null;

  if (canonical && legacy && canonical.id !== legacy.id) {
    throw new Error(
      `Both canonical and legacy project slugs exist for ${slug}; refusing to delete or merge data`,
    );
  }

  return canonical ?? legacy;
}

async function upsertProject(seed: ApiProject, categoryId: string, domain: Domain) {
  const story = projectStories[seed.slug];
  if (!story) throw new Error(`Missing story fields for seed project: ${seed.slug}`);

  const lifecycle = lifecycleStatus(seed.status);
  const publication = publicationStatus(lifecycle);
  const data: Prisma.ProjectUncheckedUpdateInput = {
    slug: seed.slug,
    title: seed.title,
    domain,
    summary: seed.summary,
    descriptionMarkdown: seed.descriptionMarkdown,
    mission: story.mission,
    architectureSummary: story.architectureSummary,
    whatIBuilt: story.whatIBuilt,
    status: publication,
    lifecycleStatus: lifecycle,
    formatType: projectFormat(seed.formatType),
    featured: seed.isFeatured,
    sortOrder: seed.sortOrder,
    coverImageUrl: seed.coverImageUrl,
    architectureSvg: seed.architectureSvg,
    liveUrl: seed.liveUrl,
    githubUrl: seed.githubUrl,
    packetTracerFile: seed.packetTracerFile,
    topologyConfigJson: seed.topologyConfigJson,
    metrics: seed.metrics ? jsonValue(seed.metrics) : Prisma.DbNull,
    technologies: seed.devopsStack,
    tags: seed.tags,
    categoryId,
    publishedAt: publication === ContentStatus.PUBLISHED ? new Date(seed.createdAt) : null,
  };

  const existing = await findProjectForReconciliation(seed.slug);
  if (existing) {
    return prisma.project.update({ where: { id: existing.id }, data });
  }

  return prisma.project.create({
    data: {
      id: seed.id,
      ...(data as Prisma.ProjectUncheckedCreateInput),
      createdAt: new Date(seed.createdAt),
    },
  });
}

async function upsertCompatibilityLab(
  project: ApiProject,
  persisted: { id: string; domain: Domain },
) {
  const format = project.formatType ?? 'standard';
  const identity = labIdentities[format];
  if (!identity) return;

  const metadata = projectMetadata(project);
  if (!metadata) throw new Error(`Missing specialized payload for seed project: ${project.slug}`);

  const networkFixture = format === 'cisco_pkt_lab' ? networkingFixture(project) : null;
  const linuxFixtureData = format === 'rhcsa_matrix' ? linuxFixture(project) : null;
  const devOpsFixtureData = format === 'devops_pipeline' ? devOpsFixture(project) : null;
  const normalizedState = networkFixture
    ? jsonValue(networkFixture.controlPlane)
    : linuxFixtureData
      ? jsonValue(linuxFixtureData.state)
      : devOpsFixtureData
        ? jsonValue(devOpsFixtureData.state)
        : metadata;
  const primaryPayload = networkFixture
    ? jsonValue({
        schemaVersion: 'networking.input.v1',
        devices: networkFixture.devices,
        links: networkFixture.links,
        controlPlane: networkFixture.controlPlane,
      })
    : linuxFixtureData
      ? jsonValue({ schemaVersion: 'linux.input.v1', hosts: linuxFixtureData.state.hosts })
      : devOpsFixtureData
        ? jsonValue({ schemaVersion: 'devops.input.v1', state: devOpsFixtureData.state })
        : normalizedState;

  const capabilities = labCapabilities[format] ?? [];
  const primaryInput = primaryLabInputs[format];
  if (!primaryInput) throw new Error(`Missing canonical input fixture for seed project: ${project.slug}`);

  const lab = await prisma.lab.upsert({
    where: { slug: identity.slug },
    update: {
      title: identity.title,
      summary: identity.summary,
      domain: persisted.domain,
      kind: identity.kind,
      status: LabStatus.READY,
      projectId: persisted.id,
      isInteractive: true,
      manifestVersion: '1.0',
      capabilities,
      normalizedState,
      metadata,
    },
    create: {
      slug: identity.slug,
      title: identity.title,
      summary: identity.summary,
      domain: persisted.domain,
      kind: identity.kind,
      status: LabStatus.READY,
      projectId: persisted.id,
      isInteractive: true,
      manifestVersion: '1.0',
      capabilities,
      normalizedState,
      metadata,
    },
  });

  await prisma.labInput.upsert({
    where: { labId_inputKey: { labId: lab.id, inputKey: primaryInput.inputKey } },
    update: {
      inputType: primaryInput.inputType,
      label: primaryInput.label,
      description: networkFixture
        ? 'Canonical Networking input generated from persisted normalized topology, device, interface, configuration, and control-plane records.'
         : linuxFixtureData
          ? 'Canonical Linux system snapshot generated from the persisted RHEL 9.4 project fixture.'
          : devOpsFixtureData
            ? 'Canonical DevOps delivery snapshot generated from the persisted GitOps, Kubernetes, Terraform, and recorded pipeline project fixture.'
            : 'Normalized compatibility snapshot derived from the established project fixture.',
      sourceKind: LabInputSourceKind.INLINE,
      schemaVersion: networkFixture ? 'networking.input.v1' : linuxFixtureData ? 'linux.input.v1' : devOpsFixtureData ? 'devops.input.v1' : '1.0',
      payload: primaryPayload,
      externalUrl: null,
      artifactId: null,
      isPrimary: true,
      sortOrder: 0,
    },
    create: {
      labId: lab.id,
      inputKey: primaryInput.inputKey,
      inputType: primaryInput.inputType,
      label: primaryInput.label,
      description: networkFixture
        ? 'Canonical Networking input generated from persisted normalized topology, device, interface, configuration, and control-plane records.'
         : linuxFixtureData
          ? 'Canonical Linux system snapshot generated from the persisted RHEL 9.4 project fixture.'
          : devOpsFixtureData
            ? 'Canonical DevOps delivery snapshot generated from the persisted GitOps, Kubernetes, Terraform, and recorded pipeline project fixture.'
            : 'Normalized compatibility snapshot derived from the established project fixture.',
      sourceKind: LabInputSourceKind.INLINE,
      schemaVersion: networkFixture ? 'networking.input.v1' : linuxFixtureData ? 'linux.input.v1' : devOpsFixtureData ? 'devops.input.v1' : '1.0',
      payload: primaryPayload,
      isPrimary: true,
      sortOrder: 0,
    },
  });

  if (networkFixture && project.ciscoLabData) {
    await reconcileNetworkingTopology(lab.id, networkFixture);

    await prisma.labInput.upsert({
      where: { labId_inputKey: { labId: lab.id, inputKey: 'packet-tracer-reference' } },
      update: {
        inputType: 'PACKET_TRACER',
        label: 'Packet Tracer Lab Reference',
        description: 'Reference metadata for the original Packet Tracer lab. The portfolio does not claim arbitrary .pkt binary parsing.',
        sourceKind: LabInputSourceKind.INLINE,
        schemaVersion: 'networking.reference.v1',
        payload: jsonValue({
          fileName: project.ciscoLabData.pktFileName,
          sizeBytes: project.ciscoLabData.pktFileSizeBytes ?? null,
          recordedAt: project.ciscoLabData.uploadedAt ?? null,
          referenceOnly: true,
        }),
        externalUrl: null,
        artifactId: null,
        isPrimary: false,
        sortOrder: 10,
      },
      create: {
        labId: lab.id,
        inputKey: 'packet-tracer-reference',
        inputType: 'PACKET_TRACER',
        label: 'Packet Tracer Lab Reference',
        description: 'Reference metadata for the original Packet Tracer lab. The portfolio does not claim arbitrary .pkt binary parsing.',
        sourceKind: LabInputSourceKind.INLINE,
        schemaVersion: 'networking.reference.v1',
        payload: jsonValue({
          fileName: project.ciscoLabData.pktFileName,
          sizeBytes: project.ciscoLabData.pktFileSizeBytes ?? null,
          recordedAt: project.ciscoLabData.uploadedAt ?? null,
          referenceOnly: true,
        }),
        isPrimary: false,
        sortOrder: 10,
      },
    });

    for (const scenario of networkingScenarioDefinitions) {
      await prisma.labScenario.upsert({
        where: { labId_slug: { labId: lab.id, slug: scenario.slug } },
        update: {
          title: scenario.title,
          summary: scenario.summary,
          description: 'Scenario definition only. Generic mutation, remediation, verification, and reset execution is implemented by the later Scenario Engine.',
          order: scenario.order,
          isEnabled: true,
          baselineState: jsonValue(scenario.baselineState),
          actions: jsonValue(scenario.actions),
          expectedObservations: jsonValue(scenario.expectedObservations),
          verificationCriteria: jsonValue(scenario.verificationCriteria),
        },
        create: {
          labId: lab.id,
          slug: scenario.slug,
          title: scenario.title,
          summary: scenario.summary,
          description: 'Scenario definition only. Generic mutation, remediation, verification, and reset execution is implemented by the later Scenario Engine.',
          order: scenario.order,
          isEnabled: true,
          baselineState: jsonValue(scenario.baselineState),
          actions: jsonValue(scenario.actions),
          expectedObservations: jsonValue(scenario.expectedObservations),
          verificationCriteria: jsonValue(scenario.verificationCriteria),
        },
      });
    }
  }

  if (linuxFixtureData && project.rhcsaMatrixData) {
    await reconcileLinuxHosts(lab.id, linuxFixtureData);

    const linuxInputs = [
      {
        inputKey: 'fstab-snapshot',
        inputType: 'FSTAB',
        label: '/etc/fstab Snapshot',
        description: 'Normalized persistent mount configuration from the recorded RHEL project fixture.',
        schemaVersion: 'linux.fstab.v1',
        payload: { entries: linuxFixtureData.host.fstab, content: linuxFixtureData.fstabText },
        sortOrder: 10,
      },
      {
        inputKey: 'systemd-unit-snapshot',
        inputType: 'SYSTEMD_UNIT',
        label: 'systemd Unit Snapshot',
        description: 'Recorded systemd unit configuration used by the Linux Lab host model.',
        schemaVersion: 'linux.systemd.v1',
        payload: { services: linuxFixtureData.host.services, unitFile: linuxFixtureData.systemdUnitText },
        sortOrder: 20,
      },
      {
        inputKey: 'selinux-state',
        inputType: 'SELINUX_AUDIT',
        label: 'SELinux State',
        description: 'Normalized SELinux mode, policy, boolean, and context state from the project fixture.',
        schemaVersion: 'linux.selinux.v1',
        payload: linuxFixtureData.host.selinux,
        sortOrder: 30,
      },
      {
        inputKey: 'configuration-bundle',
        inputType: 'CONFIG_BUNDLE',
        label: 'Linux Configuration Bundle',
        description: 'Recorded configuration files and verification commands from the RHEL project fixture.',
        schemaVersion: 'linux.config.v1',
        payload: { configurations: linuxFixtureData.host.configurations, verificationRecords: linuxFixtureData.host.verificationRecords },
        sortOrder: 40,
      },
    ] as const;

    for (const input of linuxInputs) {
      await prisma.labInput.upsert({
        where: { labId_inputKey: { labId: lab.id, inputKey: input.inputKey } },
        update: {
          inputType: input.inputType,
          label: input.label,
          description: input.description,
          sourceKind: LabInputSourceKind.INLINE,
          schemaVersion: input.schemaVersion,
          payload: jsonValue(input.payload),
          externalUrl: null,
          artifactId: null,
          isPrimary: false,
          sortOrder: input.sortOrder,
        },
        create: {
          labId: lab.id,
          inputKey: input.inputKey,
          inputType: input.inputType,
          label: input.label,
          description: input.description,
          sourceKind: LabInputSourceKind.INLINE,
          schemaVersion: input.schemaVersion,
          payload: jsonValue(input.payload),
          isPrimary: false,
          sortOrder: input.sortOrder,
        },
      });
    }


    for (const scenario of linuxScenarioDefinitions) {
      await prisma.labScenario.upsert({
        where: { labId_slug: { labId: lab.id, slug: scenario.slug } },
        update: {
          title: scenario.title,
          summary: scenario.summary,
          description: 'Scenario definition only. Mutation, remediation verification, and reset execution are implemented by the later shared Scenario Engine.',
          order: scenario.order,
          isEnabled: true,
          baselineState: jsonValue(scenario.baselineState),
          actions: jsonValue(scenario.actions),
          expectedObservations: jsonValue(scenario.expectedObservations),
          verificationCriteria: jsonValue(scenario.verificationCriteria),
        },
        create: {
          labId: lab.id,
          slug: scenario.slug,
          title: scenario.title,
          summary: scenario.summary,
          description: 'Scenario definition only. Mutation, remediation verification, and reset execution are implemented by the later shared Scenario Engine.',
          order: scenario.order,
          isEnabled: true,
          baselineState: jsonValue(scenario.baselineState),
          actions: jsonValue(scenario.actions),
          expectedObservations: jsonValue(scenario.expectedObservations),
          verificationCriteria: jsonValue(scenario.verificationCriteria),
        },
      });
    }
  }


  if (devOpsFixtureData && project.devopsPipelineData) {
    const state = devOpsFixtureData.state;
    const devOpsInputs = [
      {
        inputKey: 'git-repository-snapshot',
        inputType: 'GIT_REPOSITORY',
        label: 'Git Repository Snapshot',
        description: 'Recorded repository branch and revision metadata from the persisted project fixture.',
        schemaVersion: 'devops.repository.v1',
        payload: state.repository,
        sortOrder: 5,
      },
      state.terraform ? {
        inputKey: 'terraform-snapshot',
        inputType: 'TERRAFORM',
        label: 'Terraform IaC Snapshot',
        description: 'Recorded Terraform files and backend metadata normalized from the persisted project fixture.',
        schemaVersion: 'devops.terraform.v1',
        payload: state.terraform,
        sortOrder: 10,
      } : null,
      state.kubernetes.clusters.length > 0 || state.kubernetes.workloads.length > 0 ? {
        inputKey: 'kubernetes-snapshot',
        inputType: 'KUBERNETES_MANIFEST',
        label: 'Kubernetes Runtime Snapshot',
        description: 'Recorded cluster and workload observations from the persisted GitOps pipeline fixture; not live Kubernetes telemetry.',
        schemaVersion: 'devops.kubernetes.v1',
        payload: state.kubernetes,
        sortOrder: 20,
      } : null,
      state.helm.length > 0 ? {
        inputKey: 'helm-snapshot',
        inputType: 'HELM',
        label: 'Helm Package Snapshot',
        description: 'Recorded Helm packaging metadata from the persisted delivery pipeline fixture.',
        schemaVersion: 'devops.helm.v1',
        payload: { releases: state.helm },
        sortOrder: 30,
      } : null,
      state.gitops.length > 0 ? {
        inputKey: 'argocd-snapshot',
        inputType: 'ARGOCD',
        label: 'ArgoCD Reconciliation Snapshot',
        description: 'Recorded ArgoCD reconciliation state from the persisted delivery pipeline fixture.',
        schemaVersion: 'devops.argocd.v1',
        payload: { applications: state.gitops },
        sortOrder: 40,
      } : null,
      state.networkPolicies.length > 0 ? {
        inputKey: 'cilium-policy-snapshot',
        inputType: 'CILIUM_POLICY',
        label: 'Cilium Policy Snapshot',
        description: 'Recorded Cilium policy observation from the project fixture; no live eBPF policy query is performed.',
        schemaVersion: 'devops.cilium.v1',
        payload: { policies: state.networkPolicies },
        sortOrder: 50,
      } : null,
      state.observability.length > 0 ? {
        inputKey: 'observability-snapshot',
        inputType: 'OBSERVABILITY_SNAPSHOT',
        label: 'Observability Snapshot',
        description: 'Recorded Prometheus/Flagger pipeline observations. The portfolio does not fabricate live metrics.',
        schemaVersion: 'devops.observability.v1',
        payload: { snapshots: state.observability },
        sortOrder: 60,
      } : null,
    ].filter((entry) => entry !== null) as Array<{
      inputKey: string;
      inputType: string;
      label: string;
      description: string;
      schemaVersion: string;
      payload: unknown;
      sortOrder: number;
    }>;

    for (const input of devOpsInputs) {
      await prisma.labInput.upsert({
        where: { labId_inputKey: { labId: lab.id, inputKey: input.inputKey } },
        update: {
          inputType: input.inputType,
          label: input.label,
          description: input.description,
          sourceKind: LabInputSourceKind.INLINE,
          schemaVersion: input.schemaVersion,
          payload: jsonValue(input.payload),
          externalUrl: null,
          artifactId: null,
          isPrimary: false,
          sortOrder: input.sortOrder,
        },
        create: {
          labId: lab.id,
          inputKey: input.inputKey,
          inputType: input.inputType,
          label: input.label,
          description: input.description,
          sourceKind: LabInputSourceKind.INLINE,
          schemaVersion: input.schemaVersion,
          payload: jsonValue(input.payload),
          isPrimary: false,
          sortOrder: input.sortOrder,
        },
      });
    }
  }
  for (const step of runbooks[project.slug] ?? []) {
    await prisma.labRunbookStep.upsert({
      where: { labId_order: { labId: lab.id, order: step.order } },
      update: { title: step.title, description: step.description, command: null, expectedObservation: null },
      create: { labId: lab.id, order: step.order, title: step.title, description: step.description },
    });
  }
}

async function upsertRunbook(projectId: string, projectSlug: string) {
  for (const step of runbooks[projectSlug] ?? []) {
    const existing = await prisma.projectRunbookStep.findFirst({
      where: { projectId, order: step.order },
      orderBy: { createdAt: 'asc' },
    });

    if (existing) {
      await prisma.projectRunbookStep.update({
        where: { id: existing.id },
        data: { title: step.title, description: step.description, command: null },
      });
    } else {
      await prisma.projectRunbookStep.create({ data: { projectId, ...step } });
    }
  }
}

async function upsertLearningTracks() {
  const tracks = [
    {
      slug: 'ccna-200-301',
      title: 'Cisco CCNA (200-301)',
      domain: Domain.NETWORKING,
      description: 'Routing and switching fundamentals.',
      totalObjectives: 10,
      completedObjectives: 8,
    },
    {
      slug: 'rhcsa-ex200',
      title: 'Red Hat RHCSA (EX200)',
      domain: Domain.LINUX,
      description: 'Linux systems administration.',
      totalObjectives: 15,
      completedObjectives: 12,
    },
    {
      slug: 'cloud-native-devops',
      title: 'Cloud-Native Kubernetes & DevOps',
      domain: Domain.DEVOPS,
      description: 'Containers, pipelines, and infrastructure as code.',
      totalObjectives: 12,
      completedObjectives: 9,
    },
  ];

  for (const track of tracks) {
    await prisma.learningTrack.upsert({
      where: { slug: track.slug },
      update: { ...track, status: ContentStatus.PUBLISHED },
      create: { ...track, status: ContentStatus.PUBLISHED },
    });
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log('NOT EXECUTED — DATABASE_URL NOT CONFIGURED');
    return;
  }

  const categories = new Map<string, Awaited<ReturnType<typeof upsertCategory>>>();
  for (const seed of seedSnapshot.categories) {
    categories.set(seed.id, await upsertCategory(seed));
  }

  let projectCount = 0;
  for (const seed of seedSnapshot.projects) {
    const category = categories.get(seed.categoryId);
    if (!category?.domain) {
      throw new Error(`Missing category domain for seed project: ${seed.slug}`);
    }

    const project = await upsertProject(seed, category.id, category.domain);
    await upsertCompatibilityLab(seed, project);
    await upsertRunbook(project.id, seed.slug);
    projectCount += 1;
  }

  for (const seed of seedSnapshot.blogs) {
    const category = categories.get(seed.categoryId);
    if (!category) throw new Error(`Missing category for seed blog: ${seed.slug}`);

    await prisma.blogPost.upsert({
      where: { slug: seed.slug },
      update: {
        title: seed.title,
        excerpt: seed.excerpt,
        content: seed.contentMarkdown,
        domain: category.domain,
        categoryId: category.id,
        coverImageUrl: seed.coverImageUrl,
        readTimeMinutes: seed.readTimeMinutes,
        tags: seed.tags,
        status: seed.isPublished ? ContentStatus.PUBLISHED : ContentStatus.DRAFT,
        publishedAt: new Date(seed.publishedAt),
        viewCount: seed.viewCount,
      },
      create: {
        id: seed.id,
        slug: seed.slug,
        title: seed.title,
        excerpt: seed.excerpt,
        content: seed.contentMarkdown,
        domain: category.domain,
        categoryId: category.id,
        coverImageUrl: seed.coverImageUrl,
        readTimeMinutes: seed.readTimeMinutes,
        tags: seed.tags,
        status: seed.isPublished ? ContentStatus.PUBLISHED : ContentStatus.DRAFT,
        publishedAt: new Date(seed.publishedAt),
        viewCount: seed.viewCount,
        createdAt: new Date(seed.createdAt),
      },
    });
  }

  for (const seed of seedSnapshot.certifications) {
    const category = categories.get(seed.categoryId);
    if (!category) throw new Error(`Missing category for seed certification: ${seed.id}`);

    const data = {
      title: seed.title,
      code: seed.code,
      issuer: seed.issuer,
      credentialId: seed.credentialId,
      verificationUrl: seed.verificationUrl,
      badgeIcon: seed.badgeIcon,
      issueDate: new Date(seed.issueDate),
      expiryDate: seed.expiryDate ? new Date(seed.expiryDate) : null,
      categoryId: category.id,
      skillsValidated: seed.skillsValidated,
      syllabusBreakdown: seed.syllabusBreakdown
        ? jsonValue(seed.syllabusBreakdown)
        : Prisma.DbNull,
      isFeatured: seed.isFeatured,
      sortOrder: seed.sortOrder,
    };

    await prisma.certification.upsert({
      where: { id: seed.id },
      update: data,
      create: { id: seed.id, ...data, createdAt: new Date(seed.createdAt) },
    });
  }

  for (const seed of seedSnapshot.skills) {
    const category = categories.get(seed.categoryId);
    if (!category) throw new Error(`Missing category for seed skill: ${seed.id}`);

    const data = {
      name: seed.name,
      level: seed.level,
      proficiencyPercent: seed.proficiencyPercent,
      yearsOfExperience: seed.yearsOfExperience,
      categoryId: category.id,
      iconName: seed.iconName,
      terminalSnippet: seed.terminalSnippet,
      sortOrder: seed.sortOrder,
    };

    await prisma.skill.upsert({
      where: { id: seed.id },
      update: data,
      create: { id: seed.id, ...data, createdAt: new Date(seed.createdAt) },
    });
  }

  await upsertLearningTracks();

  console.log(
    `Seed completed: ${seedSnapshot.categories.length} categories, ${projectCount} projects, ${seedSnapshot.blogs.length} blogs, ${seedSnapshot.certifications.length} certifications, and ${seedSnapshot.skills.length} skills.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
