import type { SystemRepository } from '../../repositories/contracts/system.repository.js';
import { systemRepository } from '../../repositories/prisma/system.repository.js';

export class SystemMetricsService {
  constructor(private readonly repository: SystemRepository = systemRepository) {}

  getPortfolioRuntimeMetrics() {
    return this.repository.getPortfolioRuntimeMetrics();
  }
}

export const systemMetricsService = new SystemMetricsService();
