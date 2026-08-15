import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';

const EXPECTED_CATEGORY_SLUGS = ['networking', 'linux', 'devops'] as const;
const EXPECTED_PROJECT_SLUGS = [
  'cisco-enterprise-wan-bgp-hsrp',
  'rhel-9-rhcsa-hardening-storage-selinux',
  'cloud-native-gitops-k8s-cilium-terraform',
] as const;
const EXPECTED_LAB_SLUGS = ['cisco-wan-topology', 'rhel9-hardening-environment', 'gitops-k8s-cluster'] as const;

async function main() {
  if (!env.DATABASE_URL?.trim()) {
    console.error('NOT EXECUTED — DATABASE_URL NOT CONFIGURED');
    process.exitCode = 1;
    return;
  }

  try {
    await prisma.$queryRaw`SELECT 1`;

    const [categories, projects, blogCount, certificationCount, skillCount, userCount, authSessionCount, labs, labInputCount, labRunbookCount, networkingLab, linuxLab, devOpsLab] = await Promise.all([
      prisma.category.findMany({
        select: {
          slug: true,
          domain: true,
          tagline: true,
          icon: true,
          accentColor: true,
          terminalTheme: true,
        },
      }),
      prisma.project.findMany({
        select: {
          slug: true,
          mission: true,
          architectureSummary: true,
          whatIBuilt: true,
          categoryId: true,
          domain: true,
        },
      }),
      prisma.blogPost.count(),
      prisma.certification.count(),
      prisma.skill.count(),
      prisma.user.count(),
      prisma.authSession.count(),
      prisma.lab.findMany({ select: { slug: true, projectId: true, status: true, manifestVersion: true, capabilities: true, normalizedState: true } }),
      prisma.labInput.count(),
      prisma.labRunbookStep.count(),
      prisma.lab.findUnique({
        where: { slug: 'cisco-wan-topology' },
        include: { nodes: true, links: true, inputs: true, scenarios: true },
      }),
      prisma.lab.findUnique({
        where: { slug: 'rhel9-hardening-environment' },
        include: { nodes: true, inputs: true, scenarios: true },
      }),
      prisma.lab.findUnique({
        where: { slug: 'gitops-k8s-cluster' },
        include: { inputs: true, scenarios: true },
      }),
    ]);

    for (const slug of EXPECTED_CATEGORY_SLUGS) {
      const category = categories.find((item) => item.slug === slug);
      if (!category) throw new Error(`Missing canonical category: ${slug}`);
      if (!category.domain) throw new Error(`Category ${slug} has no domain`);
      if (!category.tagline?.trim()) throw new Error(`Category ${slug} has no tagline`);
      if (!category.icon?.trim()) throw new Error(`Category ${slug} has no icon`);
      if (!category.accentColor?.trim()) throw new Error(`Category ${slug} has no accentColor`);
      if (!category.terminalTheme?.trim()) throw new Error(`Category ${slug} has no terminalTheme`);
    }

    for (const slug of EXPECTED_PROJECT_SLUGS) {
      const project = projects.find((item) => item.slug === slug);
      if (!project) throw new Error(`Missing canonical project: ${slug}`);
      if (!project.categoryId) throw new Error(`Project ${slug} has no categoryId`);
      if (!project.domain) throw new Error(`Project ${slug} has no domain`);
      // Querying these fields also catches schema drift such as a missing Project.mission column.
      void project.mission;
      void project.architectureSummary;
      void project.whatIBuilt;
    }

    for (const slug of EXPECTED_LAB_SLUGS) {
      const lab = labs.find((item) => item.slug === slug);
      if (!lab) throw new Error(`Missing canonical lab: ${slug}`);
      if (!lab.projectId) throw new Error(`Lab ${slug} is not connected to a project`);
      if (lab.status !== 'READY') throw new Error(`Lab ${slug} is not READY`);
      if (lab.manifestVersion !== '1.0') throw new Error(`Lab ${slug} is not on Lab Manifest v1.0`);
      if (!Array.isArray(lab.capabilities)) throw new Error(`Lab ${slug} capabilities are invalid`);
      if (lab.normalizedState === null) throw new Error(`Lab ${slug} has no normalizedState`);
    }
    if (labInputCount < 3) throw new Error(`Expected at least 3 lab inputs, found ${labInputCount}`);
    if (labRunbookCount < 12) throw new Error(`Expected at least 12 lab runbook steps, found ${labRunbookCount}`);
    if (!networkingLab) throw new Error('Missing canonical Networking Lab');
    if (networkingLab.nodes.length < 8) throw new Error(`Expected at least 8 persisted Networking devices, found ${networkingLab.nodes.length}`);
    if (networkingLab.links.length < 8) throw new Error(`Expected at least 8 persisted Networking links, found ${networkingLab.links.length}`);
    if (!networkingLab.inputs.some((input) => input.inputType === 'NETWORK_TOPOLOGY')) throw new Error('Networking Lab is missing its normalized topology input');
    if (!networkingLab.inputs.some((input) => input.inputType === 'PACKET_TRACER')) throw new Error('Networking Lab is missing its truthful Packet Tracer reference input');
    const networkingState = networkingLab.normalizedState as Record<string, unknown> | null;
    if (networkingState?.schemaVersion !== 'networking.v1') throw new Error('Networking Lab normalizedState is not networking.v1');
    if (!Array.isArray(networkingState.bgpNeighbors) || networkingState.bgpNeighbors.length < 1) throw new Error('Networking Lab is missing normalized BGP neighbor state');
    if (!Array.isArray(networkingState.ospfNeighbors) || networkingState.ospfNeighbors.length < 1) throw new Error('Networking Lab is missing normalized OSPF adjacency state');
    if (!Array.isArray(networkingState.gatewayRedundancy) || networkingState.gatewayRedundancy.length < 1) throw new Error('Networking Lab is missing normalized first-hop redundancy state');
    if (networkingLab.scenarios.length < 4) throw new Error(`Expected at least 4 Networking scenario definitions, found ${networkingLab.scenarios.length}`);

    if (!linuxLab) throw new Error('Missing canonical Linux Lab');
    if (linuxLab.nodes.length < 1) throw new Error('Linux Lab is missing its persisted host record');
    if (!linuxLab.inputs.some((input) => input.inputType === 'SYSTEM_SNAPSHOT')) throw new Error('Linux Lab is missing SYSTEM_SNAPSHOT input');
    if (!linuxLab.inputs.some((input) => input.inputType === 'FSTAB')) throw new Error('Linux Lab is missing FSTAB input');
    if (!linuxLab.inputs.some((input) => input.inputType === 'SYSTEMD_UNIT')) throw new Error('Linux Lab is missing SYSTEMD_UNIT input');
    if (!linuxLab.inputs.some((input) => input.inputType === 'SELINUX_AUDIT')) throw new Error('Linux Lab is missing SELINUX_AUDIT input');
    const linuxState = linuxLab.normalizedState as Record<string, unknown> | null;
    if (linuxState?.schemaVersion !== 'linux.v1') throw new Error('Linux Lab normalizedState is not linux.v1');
    if (!Array.isArray(linuxState.hosts) || linuxState.hosts.length < 1) throw new Error('Linux Lab is missing normalized host state');
    const firstLinuxHost = linuxState.hosts[0] as Record<string, unknown> | undefined;
    if (!Array.isArray(firstLinuxHost?.services) || firstLinuxHost.services.length < 1) throw new Error('Linux Lab is missing normalized systemd service state');
    if (!Array.isArray(firstLinuxHost?.fstab) || firstLinuxHost.fstab.length < 1) throw new Error('Linux Lab is missing normalized fstab state');
    for (const capability of ['health-analysis', 'diagnostics', 'operator-context', 'scenario-readiness']) {
      if (!linuxLab.capabilities.includes(capability)) throw new Error(`Linux Lab is missing Phase 4B capability: ${capability}`);
    }
    const expectedLinuxScenarios = ['service-failure', 'selinux-denial', 'mount-failure', 'network-interface-loss'];
    for (const slug of expectedLinuxScenarios) {
      if (!linuxLab.scenarios.some((scenario) => scenario.slug === slug && scenario.isEnabled)) {
        throw new Error(`Linux Lab is missing enabled scenario-ready definition: ${slug}`);
      }
    }

    if (!devOpsLab) throw new Error('Missing canonical DevOps Lab');
    for (const inputType of ['CI_PIPELINE', 'GIT_REPOSITORY', 'TERRAFORM', 'KUBERNETES_MANIFEST', 'HELM', 'ARGOCD', 'CILIUM_POLICY', 'OBSERVABILITY_SNAPSHOT']) {
      if (!devOpsLab.inputs.some((input) => input.inputType === inputType)) {
        throw new Error(`DevOps Lab is missing ${inputType} input`);
      }
    }
    const devOpsState = devOpsLab.normalizedState as Record<string, unknown> | null;
    if (devOpsState?.schemaVersion !== 'devops.v1') throw new Error('DevOps Lab normalizedState is not devops.v1');
    if (!Array.isArray(devOpsState.pipelines) || devOpsState.pipelines.length < 1) throw new Error('DevOps Lab is missing normalized pipeline state');
    const kubernetes = devOpsState.kubernetes as Record<string, unknown> | undefined;
    if (!Array.isArray(kubernetes?.clusters) || kubernetes.clusters.length < 1) throw new Error('DevOps Lab is missing recorded Kubernetes cluster state');
    if (!Array.isArray(devOpsState.gitops) || devOpsState.gitops.length < 1) throw new Error('DevOps Lab is missing normalized GitOps state');
    if (!Array.isArray(devOpsState.observability) || devOpsState.observability.length < 1) throw new Error('DevOps Lab is missing recorded observability snapshots');
    for (const capability of ['pipeline', 'repository', 'terraform', 'kubernetes', 'gitops', 'observability']) {
      if (!devOpsLab.capabilities.includes(capability)) throw new Error(`DevOps Lab is missing Phase 5A capability: ${capability}`);
    }

    if (blogCount < 3) throw new Error(`Expected at least 3 blogs, found ${blogCount}`);
    if (certificationCount < 3) {
      throw new Error(`Expected at least 3 certification cards, found ${certificationCount}`);
    }
    if (skillCount < 7) throw new Error(`Expected at least 7 skills, found ${skillCount}`);

    console.log('DATABASE CONNECTION: OK');
    console.log('DATABASE SCHEMA: OK');
    console.log(`AUTH SCHEMA: OK (${userCount} users, ${authSessionCount} sessions)`);
    console.log(`LAB PLATFORM: OK (${labs.length} labs, ${labInputCount} inputs, ${labRunbookCount} runbook steps)`);
    console.log(`NETWORKING ENGINE: OK (${networkingLab.nodes.length} devices, ${networkingLab.links.length} links, ${networkingLab.inputs.length} inputs, ${networkingLab.scenarios.length} scenario definitions)`);
    console.log(`LINUX ENGINE: OK (${linuxLab.nodes.length} hosts, ${linuxLab.inputs.length} inputs, ${linuxLab.scenarios.length} scenario-ready definitions)`);
    console.log(`DEVOPS ENGINE: OK (${devOpsLab.inputs.length} inputs, normalized delivery state available)`);
    console.log(
      `CONTENT BASELINE: OK (${categories.length} categories, ${projects.length} projects, ${blogCount} blogs, ${certificationCount} certifications, ${skillCount} skills)`,
    );
  } catch (error) {
    console.error('DATABASE CHECK: FAILED');
    console.error(error instanceof Error ? `${error.name}: ${error.message}` : 'Unknown database error');
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
