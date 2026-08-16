import { PrismaScenarioRuntimeRepository } from '../../repositories/prisma/scenario-runtime.repository.js';
import { ScenarioStateService } from './scenario-state.service.js';

export const scenarioRuntimeRepository = new PrismaScenarioRuntimeRepository();
export const scenarioStateService = new ScenarioStateService(scenarioRuntimeRepository);
