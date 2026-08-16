import React, { useEffect, useMemo, useState } from 'react';
import { Archive, Boxes, Database, FileJson, FolderCog, RefreshCw, ShieldCheck } from 'lucide-react';

import type { Category, OrchestratorArtifactAdminRecord } from '../../types.js';
import { usePortfolioOrchestrator } from '../../hooks/usePortfolioOrchestrator.js';
import { ArtifactReferencePicker } from './ArtifactReferencePicker.js';
import { BundleImportExportPanel } from './BundleImportExportPanel.js';
import { EvidenceEditor } from './EvidenceEditor.js';
import { LabEditor } from './LabEditor.js';
import { LabInputEditor } from './LabInputEditor.js';
import { LabNavigator } from './LabNavigator.js';
import { OrchestratorDashboard } from './OrchestratorDashboard.js';
import { PreviewPanel } from './PreviewPanel.js';
import { ProjectEditor } from './ProjectEditor.js';
import { ProjectLifecyclePanel } from './ProjectLifecyclePanel.js';
import { ProjectNavigator } from './ProjectNavigator.js';
import { PublicationWizard } from './PublicationWizard.js';
import { RevisionConflictPanel } from './RevisionConflictPanel.js';
import { RunbookEditor } from './RunbookEditor.js';
import { ScenarioEditor } from './ScenarioEditor.js';
import { TopologyEditor } from './TopologyEditor.js';
import { ValidationPanel } from './ValidationPanel.js';

interface AdminOrchestratorProps {
  categories: Category[];
  showToast: (message: string, type: 'success' | 'error') => void;
  canPermanentDelete?: boolean;
}

type OrchestratorTab = 'overview' | 'project' | 'labs' | 'validation' | 'preview' | 'bundles' | 'artifacts';

export const AdminOrchestrator: React.FC<AdminOrchestratorProps> = ({ categories, showToast, canPermanentDelete = false }) => {
  const { state, actions } = usePortfolioOrchestrator();
  const [activeTab, setActiveTab] = useState<OrchestratorTab>('overview');
  const [selectedLabId, setSelectedLabId] = useState<string | null>(null);
  const selectedLabEntry = useMemo(() => state.aggregate?.labs.find((entry) => entry.id === selectedLabId) ?? state.aggregate?.labs[0] ?? null, [state.aggregate, selectedLabId]);
  const selectedLab = selectedLabEntry?.aggregate ?? null;
  useEffect(() => { if (!selectedLabId && state.aggregate?.labs[0]) setSelectedLabId(state.aggregate.labs[0].id); if (selectedLabId && !state.aggregate?.labs.some((entry) => entry.id === selectedLabId)) setSelectedLabId(state.aggregate?.labs[0]?.id ?? null); }, [state.aggregate, selectedLabId]);

  const run = async (operation: () => Promise<unknown>, success: string) => {
    try { await operation(); showToast(success, 'success'); }
    catch (error) { showToast(error instanceof Error ? error.message : 'Portfolio Orchestrator operation failed', 'error'); }
  };
  const reloadSelected = async () => { if (state.selectedProjectId) await actions.selectProject(state.selectedProjectId); };

  const tabs: Array<[OrchestratorTab, string, React.ComponentType<{ className?: string }>]> = [
    ['overview', 'Dashboard', Boxes], ['project', 'Project', FolderCog], ['labs', 'Labs', Database], ['validation', 'Validate & Publish', ShieldCheck], ['preview', 'Preview', Archive], ['bundles', 'Bundles', FileJson], ['artifacts', 'Artifacts', Archive],
  ];

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#111114] p-4"><div><div className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#00d4ff]">Portfolio Orchestrator</div><p className="mt-1 text-[10px] text-white/40">Single writable Project/Lab control plane · revision-safe · data-driven · recorded-state truthful</p></div><button type="button" disabled={state.loading || state.saving} onClick={() => void actions.reload()} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 font-mono text-[9px] font-bold uppercase text-white/60 hover:text-white disabled:opacity-40"><RefreshCw className={`h-3.5 w-3.5 ${state.loading ? 'animate-spin' : ''}`} />Reload</button></div>
    <RevisionConflictPanel visible={state.conflict} onReload={() => void actions.reload()} />
    {state.error && <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-3 text-xs text-red-200">{state.error}</div>}
    <div className="flex gap-2 overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-2">{tabs.map(([id, label, Icon]) => <button key={id} type="button" onClick={() => setActiveTab(id)} className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 font-mono text-[9px] font-bold uppercase ${activeTab === id ? 'bg-[#00d4ff]/15 text-[#00d4ff]' : 'text-white/40 hover:text-white'}`}><Icon className="h-3.5 w-3.5" />{label}</button>)}</div>
    {activeTab === 'overview' && <OrchestratorDashboard data={state.dashboard} />}
    {activeTab !== 'overview' && <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]"><ProjectNavigator projects={state.projects} categories={categories} selectedId={state.selectedProjectId} disabled={state.saving} onSelect={(id) => void actions.selectProject(id)} onCreate={(input) => run(() => actions.createProject(input), 'Draft Project created')} onDuplicate={(id) => run(() => actions.duplicateProject(id), 'Project duplicated as DRAFT')} onReorder={(items) => run(() => actions.reorderProjects(items), 'Projects reordered')} /><main className="min-w-0 space-y-4">
      {!state.aggregate && <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-xs text-white/35">Select or create a Project.</div>}
      {state.aggregate && activeTab === 'project' && <ProjectEditor project={state.aggregate.project} categories={categories} disabled={state.saving} onSave={(input) => run(() => actions.updateProject(state.aggregate!.project.id, input), 'Project saved')} />}
      {state.aggregate && activeTab === 'labs' && <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]"><LabNavigator labs={state.aggregate.labs} selectedId={selectedLabId} disabled={state.saving} onSelect={setSelectedLabId} onCreate={(input) => run(() => actions.createLab(state.aggregate!.project.id, input), 'Draft Lab created')} onDuplicate={(id) => run(() => actions.duplicateLab(id), 'Lab duplicated as DRAFT')} onReorder={(items) => run(() => actions.reorderLabs(state.aggregate!.project.id, items), 'Labs reordered')} /><div className="min-w-0 space-y-4">{selectedLab && selectedLabEntry && <><LabEditor lab={selectedLab} activeRuntimeCount={selectedLabEntry.activeRuntimeCount} disabled={state.saving} onSave={(input) => run(() => actions.updateLab(selectedLab.id, input), 'Lab saved')} onReady={() => run(() => actions.markLabReady(selectedLab.id, selectedLab.revision), 'Lab validated and marked READY')} onArchive={() => run(() => actions.archiveLab(selectedLab.id, selectedLab.revision), 'Lab archived')} onResetRuntimes={() => run(() => actions.resetRuntimes(selectedLab.id), 'Scenario runtimes reset')} canPermanentDelete={canPermanentDelete} onPermanentDelete={async () => { const confirmation = window.prompt(`Type the Lab title to permanently delete:\n${selectedLab.title}`); if (confirmation !== selectedLab.title) return; await run(() => actions.deleteLab(selectedLab.id, confirmation), 'Lab permanently deleted'); setSelectedLabId(null); }} /><LabInputEditor lab={selectedLab} disabled={state.saving} onChanged={reloadSelected} /><TopologyEditor lab={selectedLab} disabled={state.saving} onChanged={reloadSelected} /><ScenarioEditor lab={selectedLab} disabled={state.saving} onChanged={reloadSelected} /><RunbookEditor lab={selectedLab} disabled={state.saving} onChanged={reloadSelected} /><EvidenceEditor lab={selectedLab} disabled={state.saving} onChanged={reloadSelected} /></>}</div></div>}
      {state.aggregate && activeTab === 'validation' && <div className="space-y-4"><PublicationWizard aggregate={state.aggregate} validation={state.validation} previewReady={Boolean(state.preview)} /><ProjectLifecyclePanel aggregate={state.aggregate} validation={state.validation} disabled={state.saving} onValidate={() => actions.validateProject(state.aggregate!.project.id)} onPreview={() => actions.previewProject(state.aggregate!.project.id)} onPublish={(readyLabIds) => run(() => actions.publishProject(state.aggregate!.project.id, { expectedProjectRevision: state.aggregate!.project.revision, expectedLabRevisions: Object.fromEntries(state.aggregate!.labs.map((lab) => [lab.id, lab.revision])), readyLabIds }), 'Project published')} onArchive={() => run(() => actions.archiveProject(state.aggregate!.project.id, state.aggregate!.project.revision), 'Project archived')} onRestore={() => run(() => actions.restoreProject(state.aggregate!.project.id, state.aggregate!.project.revision, 'PLANNED'), 'Project restored to DRAFT')} canPermanentDelete={canPermanentDelete} onPermanentDelete={async () => { const title = state.aggregate!.project.title; const confirmation = window.prompt(`Type the Project title to permanently delete:\n${title}`); if (confirmation !== title) return; await run(() => actions.deleteProject(state.aggregate!.project.id, confirmation), 'Project permanently deleted'); }} /><ValidationPanel report={state.validation} /></div>}
      {state.aggregate && activeTab === 'preview' && <div className="space-y-3"><button disabled={state.saving} onClick={() => void actions.previewProject(state.aggregate!.project.id)} className="rounded-lg border border-[#00d4ff]/25 bg-[#00d4ff]/10 px-3 py-2 font-mono text-[9px] font-bold uppercase text-[#00d4ff]">Refresh exact preview</button><PreviewPanel preview={state.preview} /></div>}
      {state.aggregate && activeTab === 'bundles' && <BundleImportExportPanel selectedProjectId={state.aggregate.project.id} selectedLabId={selectedLabId} selectedLabDomain={selectedLab?.domain ?? null} disabled={state.saving} onProjectExport={actions.exportProject} onLabExport={actions.exportLab} onNetworkingCompanionExport={actions.exportNetworkingCompanion} onDryRun={actions.importDryRun} onImport={(bundle, mode, target) => run(() => actions.importBundle(bundle, mode, target), 'Bundle imported as DRAFT')} />}
      {activeTab === 'artifacts' && <ArtifactReferencePicker artifacts={state.artifacts} disabled={state.saving} onTogglePublic={(artifact: OrchestratorArtifactAdminRecord) => run(() => actions.updateArtifact(artifact.id, { expectedUpdatedAt: artifact.updatedAt, isPublic: !artifact.isPublic }), `Artifact marked ${artifact.isPublic ? 'private' : 'public'}`)} onDelete={(artifact) => run(() => actions.deleteArtifact(artifact.id), 'Artifact reference deleted')} />}
    </main></div>}
  </div>;
};
