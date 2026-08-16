export type DomainSlug = 'networking' | 'linux' | 'devops';

export interface DomainExperienceConfig {
  slug: DomainSlug;
  categoryId: string;
  name: string;
  operatorLabel: string;
  eyebrow: string;
  mission: string;
  description: string;
  primaryActionLabel: string;
  primaryActionTarget: string;
  secondaryActionLabel: string;
  secondaryActionTarget: string;
  consoleLabel: string;
  accentColor: string;
  systemCapabilities: string[];
  statusLabel: string;
  operatorPath: Array<{
    step: string;
    title: string;
    description: string;
  }>;
}

export const DOMAIN_CONFIGS: Record<DomainSlug, DomainExperienceConfig> = {
  networking: {
    slug: 'networking',
    categoryId: 'cat-networking',
    name: 'Networking',
    operatorLabel: 'NETWORK CONTROL PLANE',
    eyebrow: 'NETWORKING // ROUTING & SWITCHING',
    mission: 'Design, inspect and troubleshoot resilient enterprise network infrastructure.',
    description:
      'Explore topology, Cisco device configuration, routing state, VLAN boundaries and packet paths through hands-on network labs.',
    primaryActionLabel: 'OPEN NETWORK LAB',
    primaryActionTarget: '#network-topology-section',
    secondaryActionLabel: 'VIEW NETWORK PROJECTS',
    secondaryActionTarget: '#projects-section',
    consoleLabel: 'OPEN NETOPS CLI',
    accentColor: '#00d4ff',
    systemCapabilities: ['BGP', 'OSPF', 'HSRP', 'VLAN', 'ACL', 'PACKET TRACE'],
    statusLabel: 'CONTROL PLANE READY',
    operatorPath: [
      {
        step: '01',
        title: 'INSPECT TOPOLOGY',
        description: 'Analyze multi-site BGP & OSPF dual-homed edge WAN routers.',
      },
      {
        step: '02',
        title: 'SELECT DEVICE',
        description: 'Examine Cisco IOS-XE running configs, SVIs, and HSRP VIPs.',
      },
      {
        step: '03',
        title: 'TRACE / VERIFY',
        description: 'Simulate packet routing hops and verify convergence across links.',
      },
    ],
  },
  linux: {
    slug: 'linux',
    categoryId: 'cat-linux',
    name: 'Linux',
    operatorLabel: 'RHEL SYSTEMS CONSOLE',
    eyebrow: 'LINUX // SYSTEMS ADMINISTRATION',
    mission: 'Administer and troubleshoot enterprise Linux systems from service state to kernel security.',
    description:
      'Inspect RHEL services, storage, SELinux, firewalld, users, networking and operational verification evidence.',
    primaryActionLabel: 'OPEN RHEL LAB',
    primaryActionTarget: '#linux-workspace-section',
    secondaryActionLabel: 'VIEW LINUX PROJECTS',
    secondaryActionTarget: '#projects-section',
    consoleLabel: 'OPEN LINUX SHELL',
    accentColor: '#00ff41',
    systemCapabilities: ['RHEL 9', 'SYSTEMD', 'SELINUX', 'LVM', 'FIREWALLD', 'PODMAN'],
    statusLabel: 'SYSTEM CONSOLE READY',
    operatorPath: [
      {
        step: '01',
        title: 'INSPECT HOST',
        description: 'Review RHEL 9 system specifications, kernel status, and uptime.',
      },
      {
        step: '02',
        title: 'SELECT SYSTEM AREA',
        description: 'Switch between Systemd services, LVM storage, SELinux, and network.',
      },
      {
        step: '03',
        title: 'VERIFY CONFIGURATION',
        description: 'Audit recorded configuration files (/etc/fstab, units) and CLI evidence.',
      },
    ],
  },
  devops: {
    slug: 'devops',
    categoryId: 'cat-devops',
    name: 'DevOps',
    operatorLabel: 'DELIVERY CONTROL PLANE',
    eyebrow: 'DEVOPS // CLOUD-NATIVE AUTOMATION',
    mission: 'Follow infrastructure and application changes from source control to production-like runtime.',
    description:
      'Inspect CI/CD stages, Terraform infrastructure, GitOps reconciliation, Kubernetes workloads and cloud-native networking.',
    primaryActionLabel: 'OPEN DELIVERY PIPELINE',
    primaryActionTarget: '#devops-pipeline-section',
    secondaryActionLabel: 'VIEW DEVOPS PROJECTS',
    secondaryActionTarget: '#projects-section',
    consoleLabel: 'OPEN DEVOPS CLI',
    accentColor: '#06b6d4',
    systemCapabilities: ['KUBERNETES', 'ARGOCD', 'TERRAFORM', 'CILIUM', 'HELM', 'CI/CD'],
    statusLabel: 'PIPELINE READY',
    operatorPath: [
      {
        step: '01',
        title: 'FOLLOW PIPELINE',
        description: 'Observe automated stages from Git push to security SAST scans.',
      },
      {
        step: '02',
        title: 'INSPECT ARTIFACT',
        description: 'Review Terraform IaC plans, container digests, and Helm manifests.',
      },
      {
        step: '03',
        title: 'VERIFY RUNTIME',
        description: 'Validate ArgoCD sync status and Cilium eBPF cluster telemetry.',
      },
    ],
  },
};

export const getDomainConfigBySlug = (slug?: string | null): DomainExperienceConfig | null => {
  if (!slug) return null;
  const normalized = slug.toLowerCase().replace('cat-', '').replace('-infra', '');
  if (normalized.includes('network')) return DOMAIN_CONFIGS.networking;
  if (normalized.includes('linux')) return DOMAIN_CONFIGS.linux;
  if (normalized.includes('devops')) return DOMAIN_CONFIGS.devops;
  return null;
};
