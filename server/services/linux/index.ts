import { PrismaLabRepository } from '../../repositories/prisma/lab.repository.js';
import { LinuxService } from './linux.service.js';

export { LinuxLabAdapter, linuxLabAdapter } from './linux-lab-adapter.js';
export { LinuxService } from './linux.service.js';

const linuxLabRepository = new PrismaLabRepository();
export const linuxService = new LinuxService(linuxLabRepository);
