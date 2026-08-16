import { useCallback, useEffect, useMemo, useState } from 'react';

import { ApiError, api } from '../lib/api.js';
import type {
  LabAggregate,
  OrchestratorArtifactAdminRecord,
  OrchestratorDashboardSummary,
  OrchestratorImportDryRunResult,
  OrchestratorImportResult,
  OrchestratorProjectAggregate,
  OrchestratorProjectPreview,
  OrchestratorProjectRecord,
  OrchestratorValidationReport,
} from '../types.js';

export interface PortfolioOrchestratorState {
  dashboard: OrchestratorDashboardSummary | null;
  projects: OrchestratorProjectRecord[];
  aggregate: OrchestratorProjectAggregate | null;
  validation: OrchestratorValidationReport | null;
  preview: OrchestratorProjectPreview | null;
  artifacts: OrchestratorArtifactAdminRecord[];
  selectedProjectId: string | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  conflict: boolean;
}

function message(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return error instanceof Error ? error.message : 'The Portfolio Orchestrator request failed.';
}

function isConflict(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409;
}

export function usePortfolioOrchestrator() {
  const [state, setState] = useState<PortfolioOrchestratorState>({
    dashboard: null,
    projects: [],
    aggregate: null,
    validation: null,
    preview: null,
    artifacts: [],
    selectedProjectId: null,
    loading: true,
    saving: false,
    error: null,
    conflict: false,
  });

  const fail = useCallback((error: unknown) => {
    setState((current) => ({ ...current, loading: false, saving: false, error: message(error), conflict: isConflict(error) }));
  }, []);

  const loadProject = useCallback(async (projectId: string) => {
    setState((current) => ({ ...current, selectedProjectId: projectId, loading: true, error: null, conflict: false, validation: null, preview: null }));
    try {
      const aggregate = await api.getOrchestratorProject(projectId);
      setState((current) => ({ ...current, aggregate, selectedProjectId: projectId, loading: false }));
      return aggregate;
    } catch (error) {
      fail(error);
      throw error;
    }
  }, [fail]);

  const refresh = useCallback(async (preferredProjectId?: string | null) => {
    setState((current) => ({ ...current, loading: true, error: null, conflict: false }));
    try {
      const [dashboard, projects, artifacts] = await Promise.all([
        api.getOrchestratorDashboard(),
        api.getOrchestratorProjects(),
        api.getOrchestratorArtifacts(),
      ]);
      const selected = preferredProjectId ?? state.selectedProjectId ?? projects[0]?.id ?? null;
      const aggregate = selected ? await api.getOrchestratorProject(selected) : null;
      setState((current) => ({
        ...current,
        dashboard,
        projects,
        artifacts,
        aggregate,
        selectedProjectId: selected,
        loading: false,
        saving: false,
        error: null,
        conflict: false,
      }));
    } catch (error) {
      fail(error);
    }
  }, [fail, state.selectedProjectId]);

  useEffect(() => { void refresh(null); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const mutate = useCallback(async <T,>(operation: () => Promise<T>, projectId?: string | null): Promise<T> => {
    setState((current) => ({ ...current, saving: true, error: null, conflict: false }));
    try {
      const result = await operation();
      await refresh(projectId ?? state.selectedProjectId);
      return result;
    } catch (error) {
      fail(error);
      throw error;
    }
  }, [fail, refresh, state.selectedProjectId]);

  const actions = useMemo(() => ({
    selectProject: loadProject,
    reload: () => refresh(state.selectedProjectId),
    createProject: (input: Record<string, unknown>) => mutate(() => api.createOrchestratorProject(input), null),
    updateProject: (projectId: string, input: Record<string, unknown>) => mutate(() => api.updateOrchestratorProject(projectId, input), projectId),
    duplicateProject: (projectId: string, input: { slug?: string; title?: string } = {}) => mutate(() => api.duplicateOrchestratorProject(projectId, input), null),
    reorderProjects: (items: Array<{ id: string; sortOrder: number; expectedRevision: number }>) => mutate(() => api.reorderOrchestratorProjects(items), state.selectedProjectId),
    deleteProject: (projectId: string, confirmation: string) => mutate(() => api.deleteOrchestratorProject(projectId, confirmation), null),
    archiveProject: (projectId: string, revision: number) => mutate(() => api.archiveOrchestratorProject(projectId, revision), projectId),
    restoreProject: (projectId: string, revision: number, lifecycleStatus: 'COMPLETED' | 'IN_PROGRESS' | 'PLANNED') => mutate(() => api.restoreOrchestratorProject(projectId, revision, lifecycleStatus), projectId),
    validateProject: async (projectId: string) => {
      setState((current) => ({ ...current, saving: true, error: null, conflict: false }));
      try {
        const validation = await api.validateOrchestratorProject(projectId);
        setState((current) => ({ ...current, validation, saving: false }));
        return validation;
      } catch (error) { fail(error); throw error; }
    },
    previewProject: async (projectId: string) => {
      setState((current) => ({ ...current, saving: true, error: null, conflict: false }));
      try {
        const preview = await api.previewOrchestratorProject(projectId);
        setState((current) => ({ ...current, preview, validation: preview.validation, saving: false }));
        return preview;
      } catch (error) { fail(error); throw error; }
    },
    publishProject: (projectId: string, input: { expectedProjectRevision: number; expectedLabRevisions: Record<string, number>; readyLabIds: string[] }) => mutate(() => api.publishOrchestratorProject(projectId, input), projectId),
    createLab: (projectId: string, input: Record<string, unknown>) => mutate(() => api.createOrchestratorLab(projectId, input), projectId),
    updateLab: (labId: string, input: Record<string, unknown>) => mutate(() => api.updateOrchestratorLab(labId, input), state.selectedProjectId),
    duplicateLab: (labId: string, input: { projectId?: string; slug?: string; title?: string } = {}) => mutate(() => api.duplicateOrchestratorLab(labId, input), state.selectedProjectId),
    reorderLabs: (projectId: string, items: Array<{ id: string; sortOrder: number; expectedRevision: number }>) => mutate(() => api.reorderOrchestratorLabs(projectId, items), projectId),
    deleteLab: (labId: string, confirmation: string) => mutate(() => api.deleteOrchestratorLab(labId, confirmation), state.selectedProjectId),
    markLabReady: (labId: string, revision: number) => mutate(() => api.markOrchestratorLabReady(labId, revision), state.selectedProjectId),
    archiveLab: (labId: string, revision: number) => mutate(() => api.archiveOrchestratorLab(labId, revision), state.selectedProjectId),
    resetRuntimes: (labId: string) => mutate(() => api.resetOrchestratorLabRuntimes(labId), state.selectedProjectId),
    exportProject: (projectId: string) => api.exportOrchestratorProject(projectId),
    exportLab: (labId: string) => api.exportOrchestratorLab(labId),
    exportNetworkingCompanion: (labId: string) => api.exportNetworkingCompanion(labId),
    importDryRun: async (bundle: unknown, conflictMode: 'REJECT' | 'RENAME', targetProjectId?: string): Promise<OrchestratorImportDryRunResult> => api.orchestratorImportDryRun(bundle, conflictMode, targetProjectId),
    importBundle: (bundle: unknown, conflictMode: 'REJECT' | 'RENAME', targetProjectId?: string): Promise<OrchestratorImportResult> => mutate(() => api.orchestratorImport(bundle, conflictMode, targetProjectId), null),
    updateArtifact: (artifactId: string, input: Record<string, unknown>) => mutate(() => api.updateOrchestratorArtifact(artifactId, input), state.selectedProjectId),
    deleteArtifact: (artifactId: string) => mutate(() => api.deleteOrchestratorArtifact(artifactId), state.selectedProjectId),
  }), [fail, loadProject, mutate, refresh, state.selectedProjectId]);

  return { state, actions };
}

export type PortfolioOrchestratorActions = ReturnType<typeof usePortfolioOrchestrator>['actions'];
export type OrchestratorSelectedLab = LabAggregate | null;
