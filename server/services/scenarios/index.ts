import { PrismaLabRepository } from '../../repositories/prisma/lab.repository.js';
import { devOpsService } from '../devops/index.js';
import { linuxService } from '../linux/index.js';
import { networkingService } from '../networking/index.js';
import { ScenarioEngineService } from './scenario-engine.service.js';
import { scenarioRuntimeRepository, scenarioStateService } from './runtime.js';

export { ScenarioEngineService } from './scenario-engine.service.js';
export { ScenarioStateService } from './scenario-state.service.js';
export { applyScenarioActions, verifyScenarioActions } from './scenario-mutators.js';
export { scenarioRuntimeRepository, scenarioStateService } from './runtime.js';

const labRepository = new PrismaLabRepository();
export const scenarioEngineService = new ScenarioEngineService(
  labRepository,
  scenarioRuntimeRepository,
  networkingService,
  linuxService,
  devOpsService,
);
