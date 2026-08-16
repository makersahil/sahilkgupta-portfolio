import { devOpsOperationsService, devOpsService } from '../devops/index.js';
import { linuxOperationsService, linuxService } from '../linux/index.js';
import { networkingOperationsService, networkingService } from '../networking/index.js';
import { scenarioEngineService } from '../scenarios/index.js';
import { UnifiedCliService } from './unified-cli.service.js';

export { UnifiedCliService } from './unified-cli.service.js';

export const unifiedCliService = new UnifiedCliService(
  networkingService,
  networkingOperationsService,
  linuxService,
  linuxOperationsService,
  devOpsService,
  devOpsOperationsService,
  scenarioEngineService,
);
