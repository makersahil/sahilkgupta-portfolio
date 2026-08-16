import { portfolioOrchestratorRepository } from '../repositories/prisma/portfolio-orchestrator.repository.js';

/**
 * Fixture-only transition used by legacy domain regressions.
 * Production/Admin callers must use PortfolioOrchestratorService so validation and audit rules run.
 */
export async function markRegressionLabReady(labId: string): Promise<void> {
  const current = await portfolioOrchestratorRepository.getLabAggregate(labId);
  if (!current) throw new Error(`Regression Lab not found: ${labId}`);
  const result = await portfolioOrchestratorRepository.markLabReady(labId, current.revision);
  if (result.status !== 'OK') throw new Error(`Unable to mark regression Lab READY: ${labId} (${result.status})`);
}
