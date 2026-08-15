import { PrismaLabRepository } from '../../repositories/prisma/lab.repository.js';
import { LabManifestService } from './lab-manifest.service.js';
import { LabService } from './lab.service.js';

export { LAB_INPUT_REGISTRY, getLabInputType, isSupportedLabInputType, listLabInputTypes } from './lab-input-registry.js';
export { LabManifestService } from './lab-manifest.service.js';
export { LabService } from './lab.service.js';

const labRepository = new PrismaLabRepository();

export const labService = new LabService(labRepository);
export const labManifestService = new LabManifestService(labRepository);
