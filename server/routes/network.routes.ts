import { Router } from 'express';
import { dbService } from '../services/db.service.js';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

// Simulated Cisco network topology nodes and links
const defaultTopologyData = {
  nodes: [
    {
      id: 'isp1',
      name: 'ISP-1 Uplink (AS 100)',
      type: 'isp',
      ip: '198.51.100.1/30',
      vlan: null,
      status: 'UP',
      bgpAs: 100,
      x: 180,
      y: 60,
      details: 'Primary Carrier (Level 3 / Lumen), BGP Weight 200, BGP MED 100',
    },
    {
      id: 'isp2',
      name: 'ISP-2 Backup (AS 200)',
      type: 'isp',
      ip: '203.0.113.1/30',
      vlan: null,
      status: 'UP',
      bgpAs: 200,
      x: 620,
      y: 60,
      details: 'Secondary Redundant Carrier (Cogent), BGP Weight 100, BGP MED 200',
    },
    {
      id: 'r1',
      name: 'Edge-Router-01 (HQ Active)',
      type: 'router',
      ip: '198.51.100.2/30 (Gi0/0/0)',
      vlan: 'VLAN 99 Mgmt',
      status: 'UP',
      bgpAs: 65001,
      x: 280,
      y: 170,
      details: 'Cisco ISR 4451-X. OSPF Area 0 ABR, BGP AS 65001, HSRP Active Router (10.10.0.1)',
    },
    {
      id: 'r2',
      name: 'Edge-Router-02 (HQ Standby)',
      type: 'router',
      ip: '203.0.113.2/30 (Gi0/0/0)',
      vlan: 'VLAN 99 Mgmt',
      status: 'STANDBY',
      bgpAs: 65001,
      x: 520,
      y: 170,
      details: 'Cisco ISR 4451-X. OSPF Area 0, BGP AS 65001, HSRP Standby (Priority 90)',
    },
    {
      id: 'sw_core',
      name: 'Core-Switch-MLS01',
      type: 'multilayer_switch',
      ip: '10.10.0.1/24 (SVI)',
      vlan: 'VLAN 10,20,30,99',
      status: 'UP',
      x: 400,
      y: 280,
      details: 'Cisco Catalyst 9500 (48-Port 10G/25G). LACP EtherChannel 1&2, Inter-VLAN Routing',
    },
    {
      id: 'fw_asa',
      name: 'Cisco ASA 5506-X Firepower',
      type: 'firewall',
      ip: '10.30.0.1/24 (DMZ)',
      vlan: 'VLAN 30 DMZ',
      status: 'UP',
      x: 180,
      y: 360,
      details: 'Stateful Packet Inspection, Next-Gen IPS, IPsec Site-to-Site VPN Endpoint',
    },
    {
      id: 'srv_k8s',
      name: 'K8s Cluster Node (RHEL 9)',
      type: 'server',
      ip: '10.20.0.50/24 (VLAN 20)',
      vlan: 'VLAN 20 Prod',
      status: 'UP',
      x: 400,
      y: 440,
      details: 'RHCSA Production Server with Cilium eBPF CNI & ArgoCD GitOps',
    },
    {
      id: 'pc_devops',
      name: 'DevOps Admin Workstation',
      type: 'workstation',
      ip: '10.10.0.105/24 (VLAN 10)',
      vlan: 'VLAN 10 Dev',
      status: 'UP',
      x: 620,
      y: 360,
      details: 'Client PC with SSH Keyrings, Wireshark, and Terraform CLI',
    },
  ],
  links: [
    { source: 'isp1', target: 'r1', protocol: 'eBGP (AS 100 <-> 65001)', speed: '10 Gbps', active: true },
    { source: 'isp2', target: 'r2', protocol: 'eBGP (AS 200 <-> 65001)', speed: '10 Gbps', active: true },
    { source: 'r1', target: 'r2', protocol: 'iBGP & HSRP Heartbeat', speed: '40 Gbps', active: true },
    { source: 'r1', target: 'sw_core', protocol: '802.1Q Trunk / OSPF Area 0', speed: '20 Gbps (LACP)', active: true },
    { source: 'r2', target: 'sw_core', protocol: '802.1Q Trunk / OSPF Area 0', speed: '20 Gbps (LACP)', active: true },
    { source: 'sw_core', target: 'fw_asa', protocol: 'DMZ Trunk (VLAN 30)', speed: '10 Gbps', active: true },
    { source: 'sw_core', target: 'srv_k8s', protocol: 'Access Port (VLAN 20)', speed: '10 Gbps', active: true },
    { source: 'sw_core', target: 'pc_devops', protocol: 'Access Port (VLAN 10)', speed: '1 Gbps', active: true },
  ],
};

// GET /api/network/topology
router.get('/topology', async (req, res) => {
  res.json({ success: true, data: defaultTopologyData });
});

// POST /api/network/simulate-packet
router.post('/simulate-packet', async (req, res) => {
  const { sourceId, targetId, protocol } = req.body;

  const validNodes = defaultTopologyData.nodes.map((n) => n.id);
  const src = sourceId || 'pc_devops';
  const dst = targetId || 'srv_k8s';

  if (!validNodes.includes(src) || !validNodes.includes(dst)) {
    res.status(400).json({ success: false, message: 'Invalid source or target node ID' });
    return;
  }

  // Calculate simulated packet hops
  let hops: string[] = [];
  if (src === 'pc_devops' && dst === 'srv_k8s') {
    hops = ['pc_devops', 'sw_core', 'srv_k8s'];
  } else if (src === 'pc_devops' && dst === 'isp1') {
    hops = ['pc_devops', 'sw_core', 'r1', 'isp1'];
  } else if (src === 'srv_k8s' && dst === 'fw_asa') {
    hops = ['srv_k8s', 'sw_core', 'fw_asa'];
  } else if (src === 'isp1' && dst === 'srv_k8s') {
    hops = ['isp1', 'r1', 'sw_core', 'srv_k8s'];
  } else {
    hops = [src, 'sw_core', 'r1', dst];
  }

  res.json({
    success: true,
    data: {
      source: src,
      target: dst,
      protocol: protocol || 'ICMP Echo (Ping)',
      hops,
      roundTripMs: (Math.random() * 2 + 1.2).toFixed(2),
      status: 'DELIVERED',
      ttl: 64 - hops.length,
      inspectedByFirewall: hops.includes('fw_asa'),
      vlanTransitions: ['VLAN 10 (Access) -> 802.1Q Tagged (Trunk) -> VLAN 20 (SVI Gateway)'],
    },
  });
});

// POST /api/network/upload-pkt (Cisco Packet Tracer File Parser Pipeline)
router.post('/upload-pkt', async (req, res) => {
  const { fileName, rawXml, fileSize, projectId } = req.body;

  if (!fileName) {
    res.status(400).json({ success: false, message: 'fileName is required' });
    return;
  }

  const targetProjectId = projectId || 'proj-cisco-wan-pkt';
  const parsedLab = dbService.parseAndAttachPktFile(
    targetProjectId,
    fileName,
    rawXml || `<PacketTracerTopology version="8.2.1" file="${fileName}">
  <NetworkWorkspace name="Enterprise_HQ_WAN">
    <Device type="Router" name="R1-HQ-Edge" model="Cisco ISR 4451-X" />
    <Device type="Router" name="R2-Backup-Edge" model="Cisco ISR 4451-X" />
    <Device type="MultilayerSwitch" name="SW-Core-MLS" model="Cisco Catalyst 9500" />
  </NetworkWorkspace>
</PacketTracerTopology>`,
    fileSize || 184520
  );

  res.json({
    success: true,
    message: `Packet Tracer file '${fileName}' parsed and attached successfully.`,
    data: parsedLab,
  });
});

export default router;
