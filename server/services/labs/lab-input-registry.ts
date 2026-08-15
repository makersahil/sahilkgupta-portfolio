import { ValidationError } from '../../lib/errors.js';
import type { LabDomain } from '../../types/lab-platform.js';

export interface LabInputTypeDefinition {
  type: string;
  label: string;
  description: string;
}

export const LAB_INPUT_REGISTRY: Readonly<Record<LabDomain, readonly LabInputTypeDefinition[]>> = {
  NETWORKING: [
    { type: 'PACKET_TRACER', label: 'Packet Tracer Reference', description: 'Reference metadata for a Packet Tracer lab artifact. No arbitrary .pkt binary parsing is implied.' },
    { type: 'NETWORK_TOPOLOGY', label: 'Network Topology', description: 'Normalized nodes, links, addressing, and topology metadata.' },
    { type: 'DEVICE_CONFIG', label: 'Device Configuration', description: 'Router, switch, firewall, or appliance configuration text/structure.' },
    { type: 'ROUTING_SNAPSHOT', label: 'Routing Snapshot', description: 'Normalized routing, adjacency, and route-selection state.' },
    { type: 'PCAP_REFERENCE', label: 'PCAP Reference', description: 'Reference metadata for a packet capture or externally stored trace.' },
  ],
  LINUX: [
    { type: 'SYSTEM_SNAPSHOT', label: 'System Snapshot', description: 'Normalized Linux host, package, kernel, service, and configuration state.' },
    { type: 'SYSTEMD_UNIT', label: 'systemd Unit', description: 'Service/unit configuration and operational metadata.' },
    { type: 'FSTAB', label: 'fstab', description: 'Persistent mount configuration and normalized filesystem metadata.' },
    { type: 'STORAGE_SNAPSHOT', label: 'Storage Snapshot', description: 'Block device, LVM, filesystem, and mount state.' },
    { type: 'SELINUX_AUDIT', label: 'SELinux Audit', description: 'Normalized SELinux mode, contexts, policy metadata, and audit events.' },
    { type: 'JOURNAL_EXTRACT', label: 'Journal Extract', description: 'Selected journald/system logs supplied as lab input.' },
    { type: 'NETWORK_CONFIG', label: 'Linux Network Configuration', description: 'Host interfaces, routes, DNS, and network-manager configuration.' },
    { type: 'ANSIBLE', label: 'Ansible', description: 'Playbook, inventory, role, or normalized automation metadata.' },
    { type: 'CONFIG_BUNDLE', label: 'Configuration Bundle', description: 'A normalized collection of Linux configuration inputs.' },
  ],
  DEVOPS: [
    { type: 'GIT_REPOSITORY', label: 'Git Repository', description: 'Repository metadata or selected source/configuration snapshot.' },
    { type: 'CI_PIPELINE', label: 'CI Pipeline', description: 'Workflow stages, jobs, gates, and build/deployment metadata.' },
    { type: 'TERRAFORM', label: 'Terraform', description: 'Terraform configuration or normalized infrastructure plan metadata.' },
    { type: 'KUBERNETES_MANIFEST', label: 'Kubernetes Manifest', description: 'Kubernetes workload/resource configuration.' },
    { type: 'HELM', label: 'Helm', description: 'Helm chart/values metadata used by the lab.' },
    { type: 'ARGOCD', label: 'Argo CD', description: 'GitOps application, sync, health, and drift state.' },
    { type: 'CILIUM_POLICY', label: 'Cilium Policy', description: 'Cilium network/security policy and connectivity state.' },
    { type: 'OBSERVABILITY_SNAPSHOT', label: 'Observability Snapshot', description: 'Selected metrics, logs, traces, alerts, or dashboard state.' },
  ],
};

export function listLabInputTypes(domain: LabDomain): readonly LabInputTypeDefinition[] {
  const definitions = LAB_INPUT_REGISTRY[domain];
  if (!definitions) throw new ValidationError('Unsupported lab domain', { domain });
  return definitions;
}

export function isSupportedLabInputType(domain: LabDomain, inputType: string): boolean {
  return listLabInputTypes(domain).some((entry) => entry.type === inputType);
}

export function getLabInputType(domain: LabDomain, inputType: string): LabInputTypeDefinition {
  const definition = listLabInputTypes(domain).find((entry) => entry.type === inputType);
  if (!definition) {
    throw new ValidationError('inputType is not supported for this lab domain', {
      domain,
      inputType,
      allowed: listLabInputTypes(domain).map((entry) => entry.type),
    });
  }
  return definition;
}
