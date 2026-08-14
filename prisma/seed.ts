import { prisma } from '../server/lib/prisma';
import { Domain, ContentStatus, LabKind, LabStatus, EvidenceKind } from '@prisma/client';


async function main() {
  if (!process.env.DATABASE_URL) {
    console.log('NOT EXECUTED — DATABASE_URL NOT CONFIGURED');
    return;
  }

  console.log('Starting seed...');

  // Categories
  const catNetworking = await prisma.category.upsert({
    where: { slug: 'networking' },
    update: {},
    create: {
      name: 'Networking',
      slug: 'networking',
      domain: Domain.NETWORKING,
      description: 'Enterprise networking projects and labs.'
    }
  });

  const catLinux = await prisma.category.upsert({
    where: { slug: 'linux' },
    update: {},
    create: {
      name: 'Linux',
      slug: 'linux',
      domain: Domain.LINUX,
      description: 'Linux systems administration and engineering.'
    }
  });

  const catDevops = await prisma.category.upsert({
    where: { slug: 'devops' },
    update: {},
    create: {
      name: 'DevOps',
      slug: 'devops',
      domain: Domain.DEVOPS,
      description: 'DevOps, CI/CD, and Cloud-Native infrastructure.'
    }
  });

  // Projects
  const proj1 = await prisma.project.upsert({
    where: { slug: 'enterprise-wan-routing-lab' },
    update: {},
    create: {
      title: 'Enterprise WAN Architecture Lab',
      slug: 'enterprise-wan-routing-lab',
      domain: Domain.NETWORKING,
      categoryId: catNetworking.id,
      summary: 'Interactive Cisco .PKT sandbox lab with real-time XML topology parser, dual-homed eBGP uplink failover, OSPF Area 0 backbone, and HSRP gateway redundancy.',
      mission: 'Engineer and validate an enterprise-style, dual-homed WAN edge topology connecting headquarters to redundant Tier-1 transit providers (AS 100 / AS 200). Guarantee deterministic inbound/outbound path selection, gateway tracking, and zero lateral pivot between segmented departmental VLANs.',
      architectureSummary: 'Dual-homed BGP Edge, OSPF Core, Multi-VLAN distribution.',
      whatIBuilt: 'Built an enterprise-style lab architecture in Cisco Packet Tracer.',
      technologies: ['Cisco IOS-XE', 'Packet Tracer 8.2', 'BGP AS 65001', 'OSPF Area 0', 'HSRP', '802.1Q VLANs'],
      tags: ['Cisco', 'CCNA', 'BGP', 'OSPF', 'HSRP', 'Packet-Tracer'],
      featured: true,
      publishedAt: new Date()
    }
  });

  const proj2 = await prisma.project.upsert({
    where: { slug: 'rhel9-systems-lab' },
    update: {},
    create: {
      title: 'RHEL 9.4 Systems & Hardening',
      slug: 'rhel9-systems-lab',
      domain: Domain.LINUX,
      categoryId: catLinux.id,
      summary: 'Structural competency-based audit matrix matching official RHCSA EX200 objectives: LVM thin pools, SELinux enforcement, systemd sandbox units, and persistent UUID mounts.',
      mission: 'Deploy, harden, and audit an enterprise Red Hat Enterprise Linux 9.4 compute node in a security-hardening lab covering SELinux, firewalld, permissions, and benchmark-oriented configuration practices. Deliver immutable storage volumes via thin LVM, full targeted SELinux policy confinement, and automated rootless container lifecycle via systemd Quadlets.',
      architectureSummary: 'Hardened Linux environment with LVM, systemd, and SELinux.',
      whatIBuilt: 'Engineered a security-hardening lab covering SELinux, firewalld, permissions, and benchmark-oriented configuration practices.',
      technologies: ['RHEL 9', 'SELinux', 'LVM / XFS Storage', 'Systemd', 'Podman Containers', 'Firewalld', 'Chrony NTP'],
      tags: ['Linux', 'Storage', 'Systemd', 'SELinux', 'Automation'],
      featured: true,
      publishedAt: new Date()
    }
  });

  const proj3 = await prisma.project.upsert({
    where: { slug: 'cloud-native-gitops-lab' },
    update: {},
    create: {
      title: 'GitOps & eBPF Kubernetes Lab',
      slug: 'cloud-native-gitops-lab',
      domain: Domain.DEVOPS,
      categoryId: catDevops.id,
      summary: 'A resilient hybrid Kubernetes platform engineered for high-throughput enterprise workloads and declarative zero-trust network policies.',
      mission: 'Architect a self-healing GitOps delivery workflow and cloud-native Kubernetes cluster with Cilium eBPF network security and modular Terraform IaC. Eliminate manual cluster drift, enforce kernel-level L7 security policies, and achieve automated canary rollouts.',
      architectureSummary: 'Kubernetes cluster with ArgoCD and Cilium.',
      whatIBuilt: 'Provisioned a GitOps pipeline and Kubernetes environment.',
      technologies: ['Kubernetes', 'Cilium eBPF', 'Terraform', 'ArgoCD', 'Helm', 'HashiCorp Vault', 'Prometheus'],
      tags: ['DevOps', 'Kubernetes', 'GitOps', 'Terraform', 'eBPF', 'CI/CD'],
      featured: true,
      publishedAt: new Date()
    }
  });

  // Labs
  await prisma.lab.upsert({
    where: { slug: 'cisco-wan-topology' },
    update: {},
    create: {
      title: 'Cisco WAN Topology',
      slug: 'cisco-wan-topology',
      domain: Domain.NETWORKING,
      kind: LabKind.NETWORK_TOPOLOGY,
      projectId: proj1.id,
      summary: 'Interactive network topology simulation.'
    }
  });

  await prisma.lab.upsert({
    where: { slug: 'rhel9-hardening-environment' },
    update: {},
    create: {
      title: 'RHEL9 Hardening Environment',
      slug: 'rhel9-hardening-environment',
      domain: Domain.LINUX,
      kind: LabKind.LINUX_SYSTEM,
      projectId: proj2.id,
      summary: 'Linux system hardening and auditing.'
    }
  });

  await prisma.lab.upsert({
    where: { slug: 'gitops-k8s-cluster' },
    update: {},
    create: {
      title: 'GitOps K8s Cluster',
      slug: 'gitops-k8s-cluster',
      domain: Domain.DEVOPS,
      kind: LabKind.DEVOPS_PIPELINE,
      projectId: proj3.id,
      summary: 'ArgoCD and Kubernetes pipeline visualization.'
    }
  });

  // Learning Tracks
  await prisma.learningTrack.upsert({
    where: { slug: 'ccna-200-301' },
    update: {},
    create: {
      title: 'Cisco CCNA (200-301)',
      slug: 'ccna-200-301',
      domain: Domain.NETWORKING,
      description: 'Routing and switching fundamentals.',
      totalObjectives: 10,
      completedObjectives: 8
    }
  });

  await prisma.learningTrack.upsert({
    where: { slug: 'rhcsa-ex200' },
    update: {},
    create: {
      title: 'Red Hat RHCSA (EX200)',
      slug: 'rhcsa-ex200',
      domain: Domain.LINUX,
      description: 'Linux systems administration.',
      totalObjectives: 15,
      completedObjectives: 12
    }
  });

  await prisma.learningTrack.upsert({
    where: { slug: 'cloud-native-devops' },
    update: {},
    create: {
      title: 'Cloud-Native Kubernetes & DevOps',
      slug: 'cloud-native-devops',
      domain: Domain.DEVOPS,
      description: 'Containers, pipelines, and infrastructure as code.',
      totalObjectives: 12,
      completedObjectives: 9
    }
  });

    // Runbook Steps
  // Networking Project
  await prisma.projectRunbookStep.deleteMany({});
  
  await prisma.projectRunbookStep.create({
    data: {
      projectId: proj1.id,
      order: 1,
      title: 'Inspect topology',
      description: 'Review the dual-homed WAN edge topology connecting headquarters.'
    }
  });
  await prisma.projectRunbookStep.create({
    data: {
      projectId: proj1.id,
      order: 2,
      title: 'Select edge router',
      description: 'Identify the active AS 100 edge router.'
    }
  });
  await prisma.projectRunbookStep.create({
    data: {
      projectId: proj1.id,
      order: 3,
      title: 'Review routing state',
      description: 'Verify OSPF Area 0 and BGP peering.'
    }
  });
  await prisma.projectRunbookStep.create({
    data: {
      projectId: proj1.id,
      order: 4,
      title: 'Trace packet flow',
      description: 'Test deterministic inbound and outbound path selection.'
    }
  });

  // Linux Project
  await prisma.projectRunbookStep.create({
    data: {
      projectId: proj2.id,
      order: 1,
      title: 'Inspect host',
      description: 'Examine the RHEL 9.4 compute node baseline.'
    }
  });
  await prisma.projectRunbookStep.create({
    data: {
      projectId: proj2.id,
      order: 2,
      title: 'Select system area',
      description: 'Review LVM thin pools and storage volumes.'
    }
  });
  await prisma.projectRunbookStep.create({
    data: {
      projectId: proj2.id,
      order: 3,
      title: 'Review configuration',
      description: 'Check SELinux enforcement and firewalld rules.'
    }
  });
  await prisma.projectRunbookStep.create({
    data: {
      projectId: proj2.id,
      order: 4,
      title: 'Verify lab state',
      description: 'Ensure systemd sandboxed units are healthy.'
    }
  });

  // DevOps Project
  await prisma.projectRunbookStep.create({
    data: {
      projectId: proj3.id,
      order: 1,
      title: 'Follow pipeline',
      description: 'Trace the self-healing GitOps delivery workflow.'
    }
  });
  await prisma.projectRunbookStep.create({
    data: {
      projectId: proj3.id,
      order: 2,
      title: 'Inspect stage',
      description: 'Review ArgoCD deployment metrics.'
    }
  });
  await prisma.projectRunbookStep.create({
    data: {
      projectId: proj3.id,
      order: 3,
      title: 'Review artifact/state',
      description: 'Examine Cilium eBPF network security policies.'
    }
  });
  await prisma.projectRunbookStep.create({
    data: {
      projectId: proj3.id,
      order: 4,
      title: 'Verify runtime representation',
      description: 'Ensure automated canary rollouts succeeded.'
    }
  });

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
