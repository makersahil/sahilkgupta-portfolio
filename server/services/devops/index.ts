import { PrismaLabRepository } from '../../repositories/prisma/lab.repository.js';
import { scenarioStateService } from '../scenarios/runtime.js';
import { DevOpsOperationsService } from './devops-operations.service.js';
import { DevOpsService } from './devops.service.js';

export { DevOpsLabAdapter, devOpsLabAdapter } from './devops-lab-adapter.js';
export { DevOpsOperationsService } from './devops-operations.service.js';
export { DevOpsService } from './devops.service.js';

const devOpsLabRepository = new PrismaLabRepository();
export const devOpsService = new DevOpsService(devOpsLabRepository, undefined, scenarioStateService);
export const devOpsOperationsService = new DevOpsOperationsService(devOpsService);
