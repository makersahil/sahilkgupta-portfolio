import { PrismaLabRepository } from '../../repositories/prisma/lab.repository.js';
import { NetworkingService } from './networking.service.js';

export { NetworkingLabAdapter, networkingLabAdapter } from './networking-lab-adapter.js';
export { NetworkingService } from './networking.service.js';

const networkingLabRepository = new PrismaLabRepository();
export const networkingService = new NetworkingService(networkingLabRepository);
