import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Boxes,
  Braces,
  CheckCircle2,
  Eye,
  FileCheck2,
  GitBranch,
  Network,
  Plus,
  RefreshCw,
  Save,
  ScrollText,
  Trash2,
  X,
} from 'lucide-react';

import { api } from '../../lib/api.js';
import type {
  CanonicalLabManifestV1,
  Category,
  LabAggregate,
  LabDomain,
  LabEvidenceKind,
  LabEvidenceRecord,
  LabInputRecord,
  LabInputSourceKind,
  LabInputTypeDefinition,
  LabKind,
  LabRecord,
  LabRunbookStepRecord,
  LabScenarioRecord,
  LabStatus,
  Project,
} from '../../types.js';

interface Props {
  projects: Project[];
  categories: Category[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

type DetailTab = 'inputs' | 'topology' | 'scenarios' | 'runbook' | 'evidence' | 'manifest';

interface LabDraft {
  id?: string;
  projectId: string;
  slug: string;
  title: string;
  summary: string;
  status: LabStatus;
  isInteractive: boolean;
  capabilities: string;
  normalizedState: string;
}

interface InputDraft {
  id?: string;
  inputKey: string;
  inputType: string;
  label: string;
  description: string;
  sourceKind: LabInputSourceKind;
  schemaVersion: string;
  payload: string;
  externalUrl: string;
  artifactId: string;
  isPrimary: boolean;
  sortOrder: number;
}

interface ScenarioDraft {
  id?: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  order: number;
  isEnabled: boolean;
  baselineState: string;
  actions: string;
  expectedObservations: string;
  verificationCriteria: string;
}

interface RunbookDraft {
  id?: string;
  order: number;
  title: string;
  description: string;
  command: string;
  expectedObservation: string;
}

interface EvidenceDraft {
  id?: string;
  kind: LabEvidenceKind;
  title: string;
  description: string;
  content: string;
  externalUrl: string;
  artifactId: string;
  isPublic: boolean;
  sortOrder: number;
}

const LAB_KIND_BY_DOMAIN: Record<LabDomain, LabKind> = {
  NETWORKING: 'NETWORK_TOPOLOGY',
  LINUX: 'LINUX_SYSTEM',
  DEVOPS: 'DEVOPS_PIPELINE',
};

const EVIDENCE_KINDS: LabEvidenceKind[] = [
  'CONFIGURATION',
  'COMMAND_OUTPUT',
  'TOPOLOGY',
  'RUNBOOK',
  'SCREENSHOT',
  'ARTIFACT',
  'LINK',
  'OTHER',
];

function pretty(value: unknown): string {
  return JSON.stringify(value ?? {}, null, 2);
}

function parseJson(value: string, field: string): unknown {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    throw new Error(`${field} must contain valid JSON`);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unexpected Admin Lab Builder error';
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function Overlay({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-3xl rounded-xl bg-[#111114] border border-white/15 shadow-2xl my-8">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h4 className="text-white font-bold uppercase tracking-tight">{title}</h4>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

const inputClass = 'w-full bg-black border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-[#00d4ff]';
const labelClass = 'text-white/50 block mb-1 uppercase tracking-wider text-[10px]';
const actionClass = 'px-3 py-2 rounded bg-[#00d4ff] hover:bg-[#00d4ff]/90 text-black font-bold uppercase tracking-wider disabled:opacity-50';
const subtleClass = 'px-3 py-2 rounded bg-white/5 hover:bg-white/10 text-white/70';

export const AdminLabBuilder: React.FC<Props> = ({ projects, categories, showToast }) => {
  const [labs, setLabs] = useState<LabRecord[]>([]);
  const [selectedLabId, setSelectedLabId] = useState<string>('');
  const [selectedLab, setSelectedLab] = useState<LabAggregate | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('inputs');
  const [registry, setRegistry] = useState<LabInputTypeDefinition[]>([]);
  const [manifest, setManifest] = useState<CanonicalLabManifestV1 | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [labDraft, setLabDraft] = useState<LabDraft | null>(null);
  const [inputDraft, setInputDraft] = useState<InputDraft | null>(null);
  const [scenarioDraft, setScenarioDraft] = useState<ScenarioDraft | null>(null);
  const [runbookDraft, setRunbookDraft] = useState<RunbookDraft | null>(null);
  const [evidenceDraft, setEvidenceDraft] = useState<EvidenceDraft | null>(null);
  const [nodesJson, setNodesJson] = useState('[]');
  const [linksJson, setLinksJson] = useState('[]');

  const projectDomain = (projectId: string): LabDomain => {
    const project = projects.find((entry) => entry.id === projectId);
    const category = categories.find((entry) => entry.id === project?.categoryId);
    return (category?.domain ?? 'NETWORKING') as LabDomain;
  };

  const loadLabs = async (keepSelection = true) => {
    setLoading(true);
    try {
      const next = await api.getAdminLabs();
      setLabs(next);
      const nextSelection = keepSelection && selectedLabId && next.some((entry) => entry.id === selectedLabId)
        ? selectedLabId
        : (next[0]?.id ?? '');
      setSelectedLabId(nextSelection);
      if (!nextSelection) setSelectedLab(null);
    } catch (error) {
      showToast(errorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadLab = async (identifier: string) => {
    if (!identifier) return;
    setLoading(true);
    try {
      const aggregate = await api.getAdminLab(identifier);
      setSelectedLab(aggregate);
      setNodesJson(pretty(aggregate.nodes.map(({ nodeKey, label, kind, description, position, configuration, metadata }) => ({ nodeKey, label, kind, description, position, configuration, metadata }))));
      setLinksJson(pretty(aggregate.links.map(({ linkKey, sourceNodeKey, targetNodeKey, label, kind, configuration, metadata }) => ({ linkKey, sourceNodeKey, targetNodeKey, label, kind, configuration, metadata }))));
      const types = await api.getLabInputRegistry(aggregate.domain);
      setRegistry(types);
      setManifest(null);
    } catch (error) {
      showToast(errorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadLabs(false); }, []);
  useEffect(() => { if (selectedLabId) void loadLab(selectedLabId); }, [selectedLabId]);

  const selectedProject = useMemo(
    () => projects.find((entry) => entry.id === selectedLab?.projectId),
    [projects, selectedLab?.projectId],
  );

  const refreshSelected = async () => {
    await loadLabs(true);
    if (selectedLabId) await loadLab(selectedLabId);
  };

  const openNewLab = () => {
    const projectId = projects[0]?.id ?? '';
    setLabDraft({
      projectId,
      slug: '',
      title: '',
      summary: '',
      status: 'DRAFT',
      isInteractive: true,
      capabilities: '',
      normalizedState: '{}',
    });
  };

  const openEditLab = (lab: LabAggregate) => {
    setLabDraft({
      id: lab.id,
      projectId: lab.projectId ?? '',
      slug: lab.slug,
      title: lab.title,
      summary: lab.summary ?? '',
      status: lab.status,
      isInteractive: lab.isInteractive,
      capabilities: lab.capabilities.join(', '),
      normalizedState: pretty(lab.normalizedState),
    });
  };

  const saveLab = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!labDraft) return;
    const domain = projectDomain(labDraft.projectId);
    const payload: Partial<LabRecord> = {
      projectId: labDraft.projectId,
      slug: labDraft.slug.trim(),
      title: labDraft.title.trim(),
      summary: labDraft.summary.trim(),
      domain,
      kind: LAB_KIND_BY_DOMAIN[domain],
      status: labDraft.status,
      isInteractive: labDraft.isInteractive,
      manifestVersion: '1.0',
      capabilities: labDraft.capabilities.split(',').map((entry) => entry.trim()).filter(Boolean),
      normalizedState: parseJson(labDraft.normalizedState, 'Normalized state'),
    };
    setSaving(true);
    try {
      const saved = labDraft.id ? await api.updateLab(labDraft.id, payload) : await api.createLab(payload);
      setLabDraft(null);
      setSelectedLabId(saved.id);
      await refreshSelected();
      showToast(labDraft.id ? 'Lab updated' : 'Lab created', 'success');
    } catch (error) {
      showToast(errorMessage(error), 'error');
    } finally { setSaving(false); }
  };

  const deleteLab = async () => {
    if (!selectedLab || !window.confirm(`Delete lab "${selectedLab.title}" and its persisted lab state?`)) return;
    try {
      await api.deleteLab(selectedLab.id);
      setSelectedLabId('');
      setSelectedLab(null);
      await loadLabs(false);
      showToast('Lab deleted', 'info');
    } catch (error) { showToast(errorMessage(error), 'error'); }
  };

  const openNewInput = () => {
    setInputDraft({
      inputKey: '', inputType: registry[0]?.type ?? '', label: '', description: '', sourceKind: 'INLINE', schemaVersion: '1.0',
      payload: '{}', externalUrl: '', artifactId: '', isPrimary: selectedLab?.inputs.length === 0, sortOrder: selectedLab?.inputs.length ?? 0,
    });
  };

  const editInput = (input: LabInputRecord) => setInputDraft({
    id: input.id, inputKey: input.inputKey, inputType: input.inputType, label: input.label, description: input.description ?? '',
    sourceKind: input.sourceKind, schemaVersion: input.schemaVersion, payload: input.payload == null ? '{}' : pretty(input.payload),
    externalUrl: input.externalUrl ?? '', artifactId: input.artifactId ?? '', isPrimary: input.isPrimary, sortOrder: input.sortOrder,
  });

  const saveInput = async (event: React.FormEvent) => {
    event.preventDefault(); if (!selectedLab || !inputDraft) return;
    const payload: Partial<LabInputRecord> = {
      inputKey: inputDraft.inputKey.trim(), inputType: inputDraft.inputType, label: inputDraft.label.trim(), description: inputDraft.description.trim(),
      sourceKind: inputDraft.sourceKind, schemaVersion: inputDraft.schemaVersion.trim(), isPrimary: inputDraft.isPrimary, sortOrder: inputDraft.sortOrder,
      ...(inputDraft.sourceKind === 'INLINE' ? { payload: parseJson(inputDraft.payload, 'Input payload'), externalUrl: null, artifactId: null } : {}),
      ...(inputDraft.sourceKind === 'EXTERNAL' ? { payload: null, externalUrl: inputDraft.externalUrl.trim(), artifactId: null } : {}),
      ...(inputDraft.sourceKind === 'ARTIFACT_REFERENCE' ? { payload: null, externalUrl: null, artifactId: inputDraft.artifactId.trim() } : {}),
    };
    setSaving(true);
    try {
      inputDraft.id ? await api.updateLabInput(selectedLab.id, inputDraft.id, payload) : await api.createLabInput(selectedLab.id, payload);
      setInputDraft(null); await refreshSelected(); showToast('Lab input saved', 'success');
    } catch (error) { showToast(errorMessage(error), 'error'); } finally { setSaving(false); }
  };

  const deleteInput = async (id: string) => {
    if (!selectedLab || !window.confirm('Delete this lab input?')) return;
    try { await api.deleteLabInput(selectedLab.id, id); await refreshSelected(); showToast('Lab input deleted', 'info'); }
    catch (error) { showToast(errorMessage(error), 'error'); }
  };

  const saveTopology = async () => {
    if (!selectedLab) return;
    setSaving(true);
    try {
      const nodes = parseJson(nodesJson, 'Nodes');
      const links = parseJson(linksJson, 'Links');
      if (!Array.isArray(nodes) || !Array.isArray(links)) throw new Error('Topology nodes and links must be JSON arrays');
      await api.replaceLabTopology(selectedLab.id, nodes, links);
      await refreshSelected(); showToast('Topology persisted', 'success');
    } catch (error) { showToast(errorMessage(error), 'error'); } finally { setSaving(false); }
  };

  const openNewScenario = () => setScenarioDraft({
    slug: '', title: '', summary: '', description: '', order: (selectedLab?.scenarios.length ?? 0) + 1, isEnabled: true,
    baselineState: '{}', actions: '[]', expectedObservations: '[]', verificationCriteria: '{}',
  });
  const editScenario = (value: LabScenarioRecord) => setScenarioDraft({
    id: value.id, slug: value.slug, title: value.title, summary: value.summary, description: value.description ?? '', order: value.order,
    isEnabled: value.isEnabled, baselineState: pretty(value.baselineState), actions: pretty(value.actions), expectedObservations: pretty(value.expectedObservations), verificationCriteria: pretty(value.verificationCriteria),
  });
  const saveScenario = async (event: React.FormEvent) => {
    event.preventDefault(); if (!selectedLab || !scenarioDraft) return;
    const payload: Partial<LabScenarioRecord> = {
      slug: scenarioDraft.slug.trim(), title: scenarioDraft.title.trim(), summary: scenarioDraft.summary.trim(), description: scenarioDraft.description.trim(),
      order: scenarioDraft.order, isEnabled: scenarioDraft.isEnabled, baselineState: parseJson(scenarioDraft.baselineState, 'Baseline state'),
      actions: parseJson(scenarioDraft.actions, 'Scenario actions'), expectedObservations: parseJson(scenarioDraft.expectedObservations, 'Expected observations'),
      verificationCriteria: parseJson(scenarioDraft.verificationCriteria, 'Verification criteria'),
    };
    setSaving(true);
    try {
      scenarioDraft.id ? await api.updateLabScenario(selectedLab.id, scenarioDraft.id, payload) : await api.createLabScenario(selectedLab.id, payload);
      setScenarioDraft(null); await refreshSelected(); showToast('Scenario saved', 'success');
    } catch (error) { showToast(errorMessage(error), 'error'); } finally { setSaving(false); }
  };
  const deleteScenario = async (id: string) => {
    if (!selectedLab || !window.confirm('Delete this scenario?')) return;
    try { await api.deleteLabScenario(selectedLab.id, id); await refreshSelected(); showToast('Scenario deleted', 'info'); }
    catch (error) { showToast(errorMessage(error), 'error'); }
  };

  const openNewRunbook = () => setRunbookDraft({ order: (selectedLab?.runbookSteps.length ?? 0) + 1, title: '', description: '', command: '', expectedObservation: '' });
  const editRunbook = (value: LabRunbookStepRecord) => setRunbookDraft({ id: value.id, order: value.order, title: value.title, description: value.description ?? '', command: value.command ?? '', expectedObservation: value.expectedObservation ?? '' });
  const saveRunbook = async (event: React.FormEvent) => {
    event.preventDefault(); if (!selectedLab || !runbookDraft) return;
    const payload = { order: runbookDraft.order, title: runbookDraft.title.trim(), description: runbookDraft.description.trim(), command: runbookDraft.command.trim(), expectedObservation: runbookDraft.expectedObservation.trim() };
    setSaving(true);
    try {
      runbookDraft.id ? await api.updateLabRunbookStep(selectedLab.id, runbookDraft.id, payload) : await api.createLabRunbookStep(selectedLab.id, payload);
      setRunbookDraft(null); await refreshSelected(); showToast('Runbook step saved', 'success');
    } catch (error) { showToast(errorMessage(error), 'error'); } finally { setSaving(false); }
  };
  const deleteRunbook = async (id: string) => {
    if (!selectedLab || !window.confirm('Delete this runbook step?')) return;
    try { await api.deleteLabRunbookStep(selectedLab.id, id); await refreshSelected(); showToast('Runbook step deleted', 'info'); }
    catch (error) { showToast(errorMessage(error), 'error'); }
  };

  const openNewEvidence = () => setEvidenceDraft({ kind: 'OTHER', title: '', description: '', content: '{}', externalUrl: '', artifactId: '', isPublic: true, sortOrder: selectedLab?.evidence.length ?? 0 });
  const editEvidence = (value: LabEvidenceRecord) => setEvidenceDraft({ id: value.id, kind: value.kind, title: value.title, description: value.description ?? '', content: pretty(value.content), externalUrl: value.externalUrl ?? '', artifactId: value.artifactId ?? '', isPublic: value.isPublic, sortOrder: value.sortOrder });
  const saveEvidence = async (event: React.FormEvent) => {
    event.preventDefault(); if (!selectedLab || !evidenceDraft) return;
    const payload: Partial<LabEvidenceRecord> = { kind: evidenceDraft.kind, title: evidenceDraft.title.trim(), description: evidenceDraft.description.trim(), content: parseJson(evidenceDraft.content, 'Evidence content'), externalUrl: evidenceDraft.externalUrl.trim() || null, artifactId: evidenceDraft.artifactId.trim() || null, isPublic: evidenceDraft.isPublic, sortOrder: evidenceDraft.sortOrder };
    setSaving(true);
    try {
      evidenceDraft.id ? await api.updateLabEvidence(selectedLab.id, evidenceDraft.id, payload) : await api.createLabEvidence(selectedLab.id, payload);
      setEvidenceDraft(null); await refreshSelected(); showToast('Evidence saved', 'success');
    } catch (error) { showToast(errorMessage(error), 'error'); } finally { setSaving(false); }
  };
  const deleteEvidence = async (id: string) => {
    if (!selectedLab || !window.confirm('Delete this evidence record?')) return;
    try { await api.deleteLabEvidence(selectedLab.id, id); await refreshSelected(); showToast('Evidence deleted', 'info'); }
    catch (error) { showToast(errorMessage(error), 'error'); }
  };

  const previewManifest = async () => {
    if (!selectedLab) return;
    setLoading(true);
    try { setManifest(await api.getLabManifestPreview(selectedLab.id)); }
    catch (error) { showToast(errorMessage(error), 'error'); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-white font-bold text-sm">Portfolio Lab Orchestrator</div>
          <div className="text-white/40 text-[10px] mt-1">Project → Labs → Inputs → State → Scenarios → Runbook → Evidence → Manifest</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void refreshSelected()} className={subtleClass}><RefreshCw className="w-3.5 h-3.5 inline mr-1" />Refresh</button>
          <button onClick={openNewLab} className={actionClass}><Plus className="w-3.5 h-3.5 inline mr-1" />Add Lab</button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-4 min-h-[480px]">
        <div className="rounded-xl border border-white/10 bg-black overflow-hidden">
          <div className="px-3 py-2 border-b border-white/10 text-[10px] uppercase tracking-wider text-white/40">Labs ({labs.length})</div>
          <div className="max-h-[560px] overflow-y-auto">
            {loading && labs.length === 0 ? <div className="p-4 text-white/40">Loading persisted labs…</div> : null}
            {!loading && labs.length === 0 ? <div className="p-4 text-white/40">No labs configured.</div> : null}
            {labs.map((lab) => (
              <button key={lab.id} onClick={() => setSelectedLabId(lab.id)} className={`w-full text-left p-3 border-b border-white/[0.06] transition-colors ${selectedLabId === lab.id ? 'bg-[#00d4ff]/10' : 'hover:bg-white/[0.03]'}`}>
                <div className="flex items-center justify-between gap-2"><span className="text-white font-semibold truncate">{lab.title}</span><span className={`text-[9px] px-1.5 py-0.5 rounded border ${lab.status === 'READY' ? 'text-[#00ff41] border-[#00ff41]/30' : 'text-amber-300 border-amber-300/30'}`}>{lab.status}</span></div>
                <div className="mt-1 text-[10px] text-white/40 font-mono truncate">{lab.domain} / {lab.slug}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black min-w-0">
          {!selectedLab ? (
            <div className="h-full min-h-[420px] flex items-center justify-center text-white/35">Select or create a lab.</div>
          ) : (
            <>
              <div className="p-4 border-b border-white/10 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2"><span className="text-white text-sm font-bold">{selectedLab.title}</span><span className="text-[9px] px-2 py-0.5 rounded bg-white/5 text-[#00d4ff]">Manifest {selectedLab.manifestVersion}</span></div>
                  <div className="text-[10px] text-white/40 mt-1">{selectedProject?.title ?? selectedLab.project?.title ?? 'Project'} · {selectedLab.domain} · {selectedLab.kind}</div>
                </div>
                <div className="flex gap-2"><button onClick={() => openEditLab(selectedLab)} className={subtleClass}>Edit Lab</button><button onClick={() => void deleteLab()} className="px-3 py-2 rounded bg-red-500/10 text-red-300 hover:bg-red-500/20"><Trash2 className="w-3.5 h-3.5" /></button></div>
              </div>

              <div className="flex overflow-x-auto border-b border-white/10 bg-[#111114]">
                {([
                  ['inputs', Braces, `Inputs ${selectedLab.inputs.length}`],
                  ['topology', Network, `Topology ${selectedLab.nodes.length}/${selectedLab.links.length}`],
                  ['scenarios', Activity, `Scenarios ${selectedLab.scenarios.length}`],
                  ['runbook', ScrollText, `Runbook ${selectedLab.runbookSteps.length}`],
                  ['evidence', FileCheck2, `Evidence ${selectedLab.evidence.length}`],
                  ['manifest', Eye, 'Manifest'],
                ] as const).map(([tab, Icon, label]) => <button key={tab} onClick={() => setDetailTab(tab)} className={`px-3 py-2.5 flex items-center gap-1.5 text-[10px] whitespace-nowrap border-b-2 ${detailTab === tab ? 'text-[#00d4ff] border-[#00d4ff]' : 'text-white/40 border-transparent hover:text-white'}`}><Icon className="w-3.5 h-3.5" />{label}</button>)}
              </div>

              <div className="p-4 max-h-[500px] overflow-y-auto">
                {detailTab === 'inputs' && <div className="space-y-3"><div className="flex justify-between items-center"><span className="text-white/50">Standardized domain inputs</span><button onClick={openNewInput} className={actionClass}><Plus className="w-3 h-3 inline mr-1" />Input</button></div>{selectedLab.inputs.length === 0 ? <div className="p-6 text-center text-white/30 border border-dashed border-white/10 rounded">No inputs yet.</div> : selectedLab.inputs.map((input) => <div key={input.id} className="p-3 border border-white/10 rounded-lg bg-[#111114] flex justify-between gap-3"><div><div className="text-white font-semibold">{input.label}</div><div className="text-[10px] text-white/40 mt-1 font-mono">{input.inputKey} · {input.inputType} · {input.sourceKind}{input.isPrimary ? ' · PRIMARY' : ''}</div></div><div className="flex gap-2"><button onClick={() => editInput(input)} className={subtleClass}>Edit</button><button onClick={() => void deleteInput(input.id)} className="text-red-300"><Trash2 className="w-4 h-4" /></button></div></div>)}</div>}

                {detailTab === 'topology' && <div className="space-y-3"><div className="text-white/50">Persisted canonical topology. Replace nodes and links atomically.</div><div><label className={labelClass}>Nodes JSON array</label><textarea rows={10} value={nodesJson} onChange={(e) => setNodesJson(e.target.value)} className={`${inputClass} font-mono text-[10px]`} /></div><div><label className={labelClass}>Links JSON array</label><textarea rows={8} value={linksJson} onChange={(e) => setLinksJson(e.target.value)} className={`${inputClass} font-mono text-[10px]`} /></div><div className="flex justify-end"><button disabled={saving} onClick={() => void saveTopology()} className={actionClass}><Save className="w-3.5 h-3.5 inline mr-1" />Persist Topology</button></div></div>}

                {detailTab === 'scenarios' && <div className="space-y-3"><div className="flex justify-between items-center"><span className="text-white/50">Investigation scenarios configured for later execution engines</span><button onClick={openNewScenario} className={actionClass}><Plus className="w-3 h-3 inline mr-1" />Scenario</button></div>{selectedLab.scenarios.length === 0 ? <div className="p-6 text-center text-white/30 border border-dashed border-white/10 rounded">No scenarios yet.</div> : selectedLab.scenarios.map((item) => <div key={item.id} className="p-3 border border-white/10 rounded-lg bg-[#111114] flex justify-between gap-3"><div><div className="text-white font-semibold">{item.title}</div><div className="text-[10px] text-white/40 mt-1">/{item.slug} · order {item.order} · {item.isEnabled ? 'ENABLED' : 'DISABLED'}</div><div className="text-white/50 mt-1">{item.summary}</div></div><div className="flex gap-2"><button onClick={() => editScenario(item)} className={subtleClass}>Edit</button><button onClick={() => void deleteScenario(item.id)} className="text-red-300"><Trash2 className="w-4 h-4" /></button></div></div>)}</div>}

                {detailTab === 'runbook' && <div className="space-y-3"><div className="flex justify-between items-center"><span className="text-white/50">Ordered operator runbook</span><button onClick={openNewRunbook} className={actionClass}><Plus className="w-3 h-3 inline mr-1" />Step</button></div>{selectedLab.runbookSteps.length === 0 ? <div className="p-6 text-center text-white/30 border border-dashed border-white/10 rounded">No runbook steps yet.</div> : selectedLab.runbookSteps.map((item) => <div key={item.id} className="p-3 border border-white/10 rounded-lg bg-[#111114] flex justify-between gap-3"><div><div className="text-white font-semibold">{item.order}. {item.title}</div>{item.command ? <div className="font-mono text-[10px] text-[#00ff41] mt-1">$ {item.command}</div> : null}<div className="text-white/50 mt-1">{item.description}</div></div><div className="flex gap-2"><button onClick={() => editRunbook(item)} className={subtleClass}>Edit</button><button onClick={() => void deleteRunbook(item.id)} className="text-red-300"><Trash2 className="w-4 h-4" /></button></div></div>)}</div>}

                {detailTab === 'evidence' && <div className="space-y-3"><div className="flex justify-between items-center"><span className="text-white/50">Truthful persisted evidence metadata</span><button onClick={openNewEvidence} className={actionClass}><Plus className="w-3 h-3 inline mr-1" />Evidence</button></div>{selectedLab.evidence.length === 0 ? <div className="p-6 text-center text-white/30 border border-dashed border-white/10 rounded">No evidence records yet.</div> : selectedLab.evidence.map((item) => <div key={item.id} className="p-3 border border-white/10 rounded-lg bg-[#111114] flex justify-between gap-3"><div><div className="text-white font-semibold">{item.title}</div><div className="text-[10px] text-white/40 mt-1">{item.kind} · {item.isPublic ? 'PUBLIC' : 'PRIVATE'}</div><div className="text-white/50 mt-1">{item.description}</div></div><div className="flex gap-2"><button onClick={() => editEvidence(item)} className={subtleClass}>Edit</button><button onClick={() => void deleteEvidence(item.id)} className="text-red-300"><Trash2 className="w-4 h-4" /></button></div></div>)}</div>}

                {detailTab === 'manifest' && <div className="space-y-3"><div className="flex justify-between items-center"><div><div className="text-white font-semibold">Canonical Lab Manifest v1 Preview</div><div className="text-white/40 text-[10px] mt-1">Public-shaped preview. Raw inline payloads and private input URLs are intentionally omitted.</div></div><button onClick={() => void previewManifest()} className={actionClass}><Eye className="w-3.5 h-3.5 inline mr-1" />Preview</button></div>{manifest ? <pre className="p-3 rounded-lg bg-[#050505] border border-white/10 overflow-auto max-h-[400px] text-[10px] text-[#00ff41]">{pretty(manifest)}</pre> : <div className="p-8 text-center text-white/30 border border-dashed border-white/10 rounded">Generate a persisted manifest preview.</div>}</div>}
              </div>
            </>
          )}
        </div>
      </div>

      {labDraft && <Overlay title={labDraft.id ? 'Edit Lab' : 'Create Lab'} onClose={() => setLabDraft(null)}><form onSubmit={saveLab} className="space-y-3 text-xs"><div className="grid sm:grid-cols-2 gap-3"><div><label className={labelClass}>Project</label><select value={labDraft.projectId} onChange={(e) => setLabDraft({ ...labDraft, projectId: e.target.value })} className={inputClass}>{projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></div><div><label className={labelClass}>Status</label><select value={labDraft.status} onChange={(e) => setLabDraft({ ...labDraft, status: e.target.value as LabStatus })} className={inputClass}><option>DRAFT</option><option>READY</option><option>ARCHIVED</option></select></div></div><div><label className={labelClass}>Title</label><input required value={labDraft.title} onChange={(e) => setLabDraft({ ...labDraft, title: e.target.value, ...(!labDraft.id && !labDraft.slug ? { slug: slugify(e.target.value) } : {}) })} className={inputClass} /></div><div><label className={labelClass}>Slug</label><input required value={labDraft.slug} onChange={(e) => setLabDraft({ ...labDraft, slug: e.target.value })} className={`${inputClass} font-mono`} /></div><div><label className={labelClass}>Summary</label><textarea rows={3} value={labDraft.summary} onChange={(e) => setLabDraft({ ...labDraft, summary: e.target.value })} className={inputClass} /></div><div><label className={labelClass}>Capabilities (comma separated)</label><input value={labDraft.capabilities} onChange={(e) => setLabDraft({ ...labDraft, capabilities: e.target.value })} className={inputClass} /></div><div><label className={labelClass}>Normalized State JSON</label><textarea rows={8} value={labDraft.normalizedState} onChange={(e) => setLabDraft({ ...labDraft, normalizedState: e.target.value })} className={`${inputClass} font-mono text-[10px]`} /></div><label className="flex items-center gap-2 text-white/70"><input type="checkbox" checked={labDraft.isInteractive} onChange={(e) => setLabDraft({ ...labDraft, isInteractive: e.target.checked })} />Interactive lab</label><div className="flex justify-end gap-2 pt-3 border-t border-white/10"><button type="button" onClick={() => setLabDraft(null)} className={subtleClass}>Cancel</button><button disabled={saving} className={actionClass}>{saving ? 'Saving…' : 'Save Lab'}</button></div></form></Overlay>}

      {inputDraft && <Overlay title={inputDraft.id ? 'Edit Lab Input' : 'Add Lab Input'} onClose={() => setInputDraft(null)}><form onSubmit={saveInput} className="space-y-3 text-xs"><div className="grid sm:grid-cols-2 gap-3"><div><label className={labelClass}>Input Key</label><input required value={inputDraft.inputKey} onChange={(e) => setInputDraft({ ...inputDraft, inputKey: e.target.value })} className={inputClass} /></div><div><label className={labelClass}>Input Type</label><select value={inputDraft.inputType} onChange={(e) => setInputDraft({ ...inputDraft, inputType: e.target.value })} className={inputClass}>{registry.map((item) => <option key={item.type} value={item.type}>{item.label} ({item.type})</option>)}</select></div></div><div><label className={labelClass}>Label</label><input required value={inputDraft.label} onChange={(e) => setInputDraft({ ...inputDraft, label: e.target.value })} className={inputClass} /></div><div><label className={labelClass}>Description</label><textarea rows={2} value={inputDraft.description} onChange={(e) => setInputDraft({ ...inputDraft, description: e.target.value })} className={inputClass} /></div><div className="grid sm:grid-cols-3 gap-3"><div><label className={labelClass}>Source</label><select value={inputDraft.sourceKind} onChange={(e) => setInputDraft({ ...inputDraft, sourceKind: e.target.value as LabInputSourceKind })} className={inputClass}><option>INLINE</option><option>EXTERNAL</option><option>ARTIFACT_REFERENCE</option></select></div><div><label className={labelClass}>Schema Version</label><input value={inputDraft.schemaVersion} onChange={(e) => setInputDraft({ ...inputDraft, schemaVersion: e.target.value })} className={inputClass} /></div><div><label className={labelClass}>Sort Order</label><input type="number" min={0} value={inputDraft.sortOrder} onChange={(e) => setInputDraft({ ...inputDraft, sortOrder: Number(e.target.value) })} className={inputClass} /></div></div>{inputDraft.sourceKind === 'INLINE' && <div><label className={labelClass}>Payload JSON</label><textarea rows={10} value={inputDraft.payload} onChange={(e) => setInputDraft({ ...inputDraft, payload: e.target.value })} className={`${inputClass} font-mono text-[10px]`} /></div>}{inputDraft.sourceKind === 'EXTERNAL' && <div><label className={labelClass}>External HTTP(S) reference</label><input value={inputDraft.externalUrl} onChange={(e) => setInputDraft({ ...inputDraft, externalUrl: e.target.value })} className={inputClass} /></div>}{inputDraft.sourceKind === 'ARTIFACT_REFERENCE' && <div><label className={labelClass}>Existing Artifact ID</label><input value={inputDraft.artifactId} onChange={(e) => setInputDraft({ ...inputDraft, artifactId: e.target.value })} className={inputClass} /></div>}<label className="flex items-center gap-2 text-white/70"><input type="checkbox" checked={inputDraft.isPrimary} onChange={(e) => setInputDraft({ ...inputDraft, isPrimary: e.target.checked })} />Primary input</label><div className="flex justify-end gap-2 pt-3 border-t border-white/10"><button type="button" onClick={() => setInputDraft(null)} className={subtleClass}>Cancel</button><button disabled={saving} className={actionClass}>Save Input</button></div></form></Overlay>}

      {scenarioDraft && <Overlay title={scenarioDraft.id ? 'Edit Scenario' : 'Add Scenario'} onClose={() => setScenarioDraft(null)}><form onSubmit={saveScenario} className="space-y-3 text-xs"><div className="grid sm:grid-cols-2 gap-3"><div><label className={labelClass}>Title</label><input required value={scenarioDraft.title} onChange={(e) => setScenarioDraft({ ...scenarioDraft, title: e.target.value, ...(!scenarioDraft.id && !scenarioDraft.slug ? { slug: slugify(e.target.value) } : {}) })} className={inputClass} /></div><div><label className={labelClass}>Slug</label><input required value={scenarioDraft.slug} onChange={(e) => setScenarioDraft({ ...scenarioDraft, slug: e.target.value })} className={`${inputClass} font-mono`} /></div></div><div><label className={labelClass}>Summary</label><input required value={scenarioDraft.summary} onChange={(e) => setScenarioDraft({ ...scenarioDraft, summary: e.target.value })} className={inputClass} /></div><div><label className={labelClass}>Description</label><textarea rows={2} value={scenarioDraft.description} onChange={(e) => setScenarioDraft({ ...scenarioDraft, description: e.target.value })} className={inputClass} /></div><div className="grid grid-cols-2 gap-3"><div><label className={labelClass}>Order</label><input type="number" min={0} value={scenarioDraft.order} onChange={(e) => setScenarioDraft({ ...scenarioDraft, order: Number(e.target.value) })} className={inputClass} /></div><label className="flex items-center gap-2 text-white/70 pt-5"><input type="checkbox" checked={scenarioDraft.isEnabled} onChange={(e) => setScenarioDraft({ ...scenarioDraft, isEnabled: e.target.checked })} />Enabled</label></div>{([['baselineState','Baseline State'],['actions','Actions'],['expectedObservations','Expected Observations'],['verificationCriteria','Verification Criteria']] as const).map(([field,label]) => <div key={field}><label className={labelClass}>{label} JSON</label><textarea rows={4} value={scenarioDraft[field]} onChange={(e) => setScenarioDraft({ ...scenarioDraft, [field]: e.target.value })} className={`${inputClass} font-mono text-[10px]`} /></div>)}<div className="flex justify-end gap-2 pt-3 border-t border-white/10"><button type="button" onClick={() => setScenarioDraft(null)} className={subtleClass}>Cancel</button><button disabled={saving} className={actionClass}>Save Scenario</button></div></form></Overlay>}

      {runbookDraft && <Overlay title={runbookDraft.id ? 'Edit Runbook Step' : 'Add Runbook Step'} onClose={() => setRunbookDraft(null)}><form onSubmit={saveRunbook} className="space-y-3 text-xs"><div className="grid grid-cols-[100px_1fr] gap-3"><div><label className={labelClass}>Order</label><input type="number" min={1} value={runbookDraft.order} onChange={(e) => setRunbookDraft({ ...runbookDraft, order: Number(e.target.value) })} className={inputClass} /></div><div><label className={labelClass}>Title</label><input required value={runbookDraft.title} onChange={(e) => setRunbookDraft({ ...runbookDraft, title: e.target.value })} className={inputClass} /></div></div><div><label className={labelClass}>Description</label><textarea rows={3} value={runbookDraft.description} onChange={(e) => setRunbookDraft({ ...runbookDraft, description: e.target.value })} className={inputClass} /></div><div><label className={labelClass}>Command</label><input value={runbookDraft.command} onChange={(e) => setRunbookDraft({ ...runbookDraft, command: e.target.value })} className={`${inputClass} font-mono`} /></div><div><label className={labelClass}>Expected Observation</label><textarea rows={2} value={runbookDraft.expectedObservation} onChange={(e) => setRunbookDraft({ ...runbookDraft, expectedObservation: e.target.value })} className={inputClass} /></div><div className="flex justify-end gap-2 pt-3 border-t border-white/10"><button type="button" onClick={() => setRunbookDraft(null)} className={subtleClass}>Cancel</button><button disabled={saving} className={actionClass}>Save Step</button></div></form></Overlay>}

      {evidenceDraft && <Overlay title={evidenceDraft.id ? 'Edit Evidence' : 'Add Evidence'} onClose={() => setEvidenceDraft(null)}><form onSubmit={saveEvidence} className="space-y-3 text-xs"><div className="grid sm:grid-cols-2 gap-3"><div><label className={labelClass}>Kind</label><select value={evidenceDraft.kind} onChange={(e) => setEvidenceDraft({ ...evidenceDraft, kind: e.target.value as LabEvidenceKind })} className={inputClass}>{EVIDENCE_KINDS.map((kind) => <option key={kind}>{kind}</option>)}</select></div><div><label className={labelClass}>Sort Order</label><input type="number" min={0} value={evidenceDraft.sortOrder} onChange={(e) => setEvidenceDraft({ ...evidenceDraft, sortOrder: Number(e.target.value) })} className={inputClass} /></div></div><div><label className={labelClass}>Title</label><input required value={evidenceDraft.title} onChange={(e) => setEvidenceDraft({ ...evidenceDraft, title: e.target.value })} className={inputClass} /></div><div><label className={labelClass}>Description</label><textarea rows={2} value={evidenceDraft.description} onChange={(e) => setEvidenceDraft({ ...evidenceDraft, description: e.target.value })} className={inputClass} /></div><div><label className={labelClass}>Content JSON</label><textarea rows={6} value={evidenceDraft.content} onChange={(e) => setEvidenceDraft({ ...evidenceDraft, content: e.target.value })} className={`${inputClass} font-mono text-[10px]`} /></div><div className="grid sm:grid-cols-2 gap-3"><div><label className={labelClass}>External URL (optional)</label><input value={evidenceDraft.externalUrl} onChange={(e) => setEvidenceDraft({ ...evidenceDraft, externalUrl: e.target.value })} className={inputClass} /></div><div><label className={labelClass}>Artifact ID (optional)</label><input value={evidenceDraft.artifactId} onChange={(e) => setEvidenceDraft({ ...evidenceDraft, artifactId: e.target.value })} className={inputClass} /></div></div><label className="flex items-center gap-2 text-white/70"><input type="checkbox" checked={evidenceDraft.isPublic} onChange={(e) => setEvidenceDraft({ ...evidenceDraft, isPublic: e.target.checked })} />Public evidence</label><div className="flex justify-end gap-2 pt-3 border-t border-white/10"><button type="button" onClick={() => setEvidenceDraft(null)} className={subtleClass}>Cancel</button><button disabled={saving} className={actionClass}>Save Evidence</button></div></form></Overlay>}
    </div>
  );
};
