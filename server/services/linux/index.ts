import { PrismaLabRepository } from '../../repositories/prisma/lab.repository.js';
import { scenarioStateService } from '../scenarios/runtime.js';
import { LinuxOperationsService } from './linux-operations.service.js';
import { LinuxService } from './linux.service.js';

export { LinuxLabAdapter, linuxLabAdapter } from './linux-lab-adapter.js';
export { LinuxOperationsService } from './linux-operations.service.js';
export { LinuxService } from './linux.service.js';

const linuxLabRepository = new PrismaLabRepository();
export const linuxService = new LinuxService(linuxLabRepository, undefined, scenarioStateService);
export const linuxOperationsService = new LinuxOperationsService(linuxService);
