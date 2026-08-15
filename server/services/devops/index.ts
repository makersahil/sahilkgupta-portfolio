import { PrismaLabRepository } from '../../repositories/prisma/lab.repository.js';
import { DevOpsService } from './devops.service.js';

export { DevOpsLabAdapter, devOpsLabAdapter } from './devops-lab-adapter.js';
export { DevOpsService } from './devops.service.js';

const devOpsLabRepository = new PrismaLabRepository();
export const devOpsService = new DevOpsService(devOpsLabRepository);
