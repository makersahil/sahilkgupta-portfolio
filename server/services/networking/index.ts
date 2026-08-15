import { PrismaLabRepository } from '../../repositories/prisma/lab.repository.js';
import { NetworkingOperationsService } from './networking-operations.service.js';
import { NetworkingService } from './networking.service.js';

export { NetworkingLabAdapter, networkingLabAdapter } from './networking-lab-adapter.js';
export { NetworkingOperationsService } from './networking-operations.service.js';
export { NetworkingService } from './networking.service.js';

const networkingLabRepository = new PrismaLabRepository();
export const networkingService = new NetworkingService(networkingLabRepository);
export const networkingOperationsService = new NetworkingOperationsService(networkingService);
