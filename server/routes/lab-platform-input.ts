import { ValidationError } from '../lib/errors.js';
import type {
  CreateLabEvidenceInput,
  CreateLabInput,
  CreateLabRunbookStepInput,
  CreateLabScenarioInput,
  CreateLabSourceInput,
  LabLinkInput,
  LabNodeInput,
  UpdateLabEvidenceInput,
  UpdateLabInput,
  UpdateLabRunbookStepInput,
  UpdateLabScenarioInput,
  UpdateLabSourceInput,
} from '../repositories/contracts/lab.repository.js';
import type { LabDomain, LabKind, LabStatus } from '../types/lab-platform.js';

type Body = Record<string, unknown>;
const own = (body: Body, key: string) => Object.prototype.hasOwnProperty.call(body, key);

function body(value: unknown): Body {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ValidationError('Request body must be a JSON object');
  return value as Body;
}
function str(value: unknown, field: string): string {
  if (typeof value !== 'string') throw new ValidationError(`${field} must be a string`);
  return value.trim();
}
function required(body: Body, field: string): string {
  if (!own(body, field)) throw new ValidationError(`${field} is required`);
  const value = str(body[field], field);
  if (!value) throw new ValidationError(`${field} is required`);
  return value;
}
function optionalString(body: Body, field: string): string | null | undefined {
  if (!own(body, field) || body[field] === undefined) return undefined;
  if (body[field] === null) return null;
  return str(body[field], field);
}
function bool(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') throw new ValidationError(`${field} must be a boolean`);
  return value;
}
function optionalBool(body: Body, field: string): boolean | undefined {
  if (!own(body, field) || body[field] === undefined) return undefined;
  return bool(body[field], field);
}
function int(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) throw new ValidationError(`${field} must be an integer`);
  return value;
}
function optionalInt(body: Body, field: string): number | undefined {
  if (!own(body, field) || body[field] === undefined) return undefined;
  return int(body[field], field);
}
function strings(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) throw new ValidationError(`${field} must be an array of strings`);
  return value.map((entry) => entry.trim()).filter(Boolean);
}
function optionalStrings(body: Body, field: string): string[] | undefined {
  if (!own(body, field) || body[field] === undefined) return undefined;
  return strings(body[field], field);
}
function json(body: Body, field: string): unknown | undefined {
  return own(body, field) ? body[field] : undefined;
}
function arrayOfObjects(value: unknown, field: string): Body[] {
  if (!Array.isArray(value)) throw new ValidationError(`${field} must be an array`);
  return value.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new ValidationError(`${field}[${index}] must be an object`);
    return entry as Body;
  });
}

export function parseLabDomain(value: unknown, field = 'domain'): LabDomain {
  const normalized = str(value, field).toUpperCase();
  if (!['NETWORKING', 'LINUX', 'DEVOPS'].includes(normalized)) throw new ValidationError(`${field} must be NETWORKING, LINUX, or DEVOPS`);
  return normalized as LabDomain;
}
export function parseOptionalLabDomain(value: unknown): LabDomain | undefined {
  if (value === undefined) return undefined;
  return parseLabDomain(value);
}
export function parseOptionalLabKind(value: unknown): LabKind | undefined {
  if (value === undefined) return undefined;
  const normalized = str(value, 'kind').toUpperCase();
  if (!['NETWORK_TOPOLOGY', 'LINUX_SYSTEM', 'DEVOPS_PIPELINE'].includes(normalized)) throw new ValidationError('Unsupported lab kind');
  return normalized as LabKind;
}
export function parseOptionalLabStatus(value: unknown): LabStatus | undefined {
  if (value === undefined) return undefined;
  const normalized = str(value, 'status').toUpperCase();
  if (!['DRAFT', 'READY', 'ARCHIVED'].includes(normalized)) throw new ValidationError('Unsupported lab status');
  return normalized as LabStatus;
}
export function optionalLabQuery(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  const normalized = str(value, field);
  return normalized || undefined;
}

export function parseLabCreate(value: unknown): CreateLabInput {
  const b = body(value);
  const domain = parseLabDomain(b.domain);
  const kind = parseOptionalLabKind(b.kind);
  if (!kind) throw new ValidationError('kind is required');
  return {
    slug: required(b, 'slug'), title: required(b, 'title'), summary: optionalString(b, 'summary'),
    domain, kind, status: parseOptionalLabStatus(b.status) ?? 'DRAFT', projectId: required(b, 'projectId'),
    isInteractive: optionalBool(b, 'isInteractive') ?? true, manifestVersion: optionalString(b, 'manifestVersion') ?? '1.0',
    capabilities: optionalStrings(b, 'capabilities') ?? [], normalizedState: json(b, 'normalizedState'), metadata: json(b, 'metadata'),
  };
}
export function parseLabUpdate(value: unknown): UpdateLabInput {
  const b = body(value); const out: UpdateLabInput = {};
  if (own(b, 'slug')) out.slug = required(b, 'slug');
  if (own(b, 'title')) out.title = required(b, 'title');
  if (own(b, 'summary')) out.summary = optionalString(b, 'summary');
  if (own(b, 'domain')) out.domain = parseLabDomain(b.domain);
  if (own(b, 'kind')) out.kind = parseOptionalLabKind(b.kind);
  if (own(b, 'status')) out.status = parseOptionalLabStatus(b.status);
  if (own(b, 'projectId')) out.projectId = required(b, 'projectId');
  if (own(b, 'isInteractive')) out.isInteractive = bool(b.isInteractive, 'isInteractive');
  if (own(b, 'manifestVersion')) out.manifestVersion = required(b, 'manifestVersion');
  if (own(b, 'capabilities')) out.capabilities = strings(b.capabilities, 'capabilities');
  if (own(b, 'normalizedState')) out.normalizedState = b.normalizedState;
  if (own(b, 'metadata')) out.metadata = b.metadata;
  return out;
}
export function parseLabSourceCreate(value: unknown): CreateLabSourceInput {
  const b = body(value);
  return {
    inputKey: required(b, 'inputKey'), inputType: required(b, 'inputType'), label: required(b, 'label'),
    description: optionalString(b, 'description'), sourceKind: required(b, 'sourceKind').toUpperCase() as CreateLabSourceInput['sourceKind'],
    schemaVersion: optionalString(b, 'schemaVersion') ?? '1.0', payload: json(b, 'payload'), externalUrl: optionalString(b, 'externalUrl'),
    artifactId: optionalString(b, 'artifactId'), isPrimary: optionalBool(b, 'isPrimary') ?? false, sortOrder: optionalInt(b, 'sortOrder') ?? 0,
  };
}
export function parseLabSourceUpdate(value: unknown): UpdateLabSourceInput {
  const b = body(value); const out: UpdateLabSourceInput = {};
  if (own(b,'inputKey')) out.inputKey=required(b,'inputKey'); if(own(b,'inputType')) out.inputType=required(b,'inputType');
  if(own(b,'label')) out.label=required(b,'label'); if(own(b,'description')) out.description=optionalString(b,'description');
  if(own(b,'sourceKind')) out.sourceKind=required(b,'sourceKind').toUpperCase() as UpdateLabSourceInput['sourceKind'];
  if(own(b,'schemaVersion')) out.schemaVersion=required(b,'schemaVersion'); if(own(b,'payload')) out.payload=b.payload;
  if(own(b,'externalUrl')) out.externalUrl=optionalString(b,'externalUrl'); if(own(b,'artifactId')) out.artifactId=optionalString(b,'artifactId');
  if(own(b,'isPrimary')) out.isPrimary=bool(b.isPrimary,'isPrimary'); if(own(b,'sortOrder')) out.sortOrder=int(b.sortOrder,'sortOrder'); return out;
}
export function parseTopology(value: unknown): { nodes: LabNodeInput[]; links: LabLinkInput[] } {
  const b=body(value); const ns=arrayOfObjects(b.nodes,'nodes'); const ls=arrayOfObjects(b.links,'links');
  return {
    nodes: ns.map((n)=>({ nodeKey:required(n,'nodeKey'), label:required(n,'label'), kind:required(n,'kind'), description:optionalString(n,'description'), position:json(n,'position'), configuration:json(n,'configuration'), metadata:json(n,'metadata') })),
    links: ls.map((l)=>({ linkKey:required(l,'linkKey'), sourceNodeKey:required(l,'sourceNodeKey'), targetNodeKey:required(l,'targetNodeKey'), label:optionalString(l,'label'), kind:optionalString(l,'kind'), configuration:json(l,'configuration'), metadata:json(l,'metadata') })),
  };
}
export function parseScenarioCreate(value: unknown): CreateLabScenarioInput {
  const b=body(value); return { slug:required(b,'slug'), title:required(b,'title'), summary:required(b,'summary'), description:optionalString(b,'description'), order:optionalInt(b,'order')??0, isEnabled:optionalBool(b,'isEnabled')??true, baselineState:json(b,'baselineState'), actions:json(b,'actions'), expectedObservations:json(b,'expectedObservations'), verificationCriteria:json(b,'verificationCriteria') };
}
export function parseScenarioUpdate(value: unknown): UpdateLabScenarioInput {
  const b=body(value); const out:UpdateLabScenarioInput={};
  for (const field of ['slug','title','summary'] as const) if(own(b,field)) out[field]=required(b,field);
  if(own(b,'description')) out.description=optionalString(b,'description'); if(own(b,'order')) out.order=int(b.order,'order'); if(own(b,'isEnabled')) out.isEnabled=bool(b.isEnabled,'isEnabled');
  for (const field of ['baselineState','actions','expectedObservations','verificationCriteria'] as const) if(own(b,field)) out[field]=b[field]; return out;
}
export function parseRunbookCreate(value: unknown): CreateLabRunbookStepInput { const b=body(value); return { order:int(b.order,'order'), title:required(b,'title'), description:optionalString(b,'description'), command:optionalString(b,'command'), expectedObservation:optionalString(b,'expectedObservation') }; }
export function parseRunbookUpdate(value: unknown): UpdateLabRunbookStepInput { const b=body(value); const out:UpdateLabRunbookStepInput={}; if(own(b,'order')) out.order=int(b.order,'order'); if(own(b,'title')) out.title=required(b,'title'); for(const f of ['description','command','expectedObservation'] as const) if(own(b,f)) out[f]=optionalString(b,f); return out; }
export function parseEvidenceCreate(value: unknown): CreateLabEvidenceInput { const b=body(value); return { kind:required(b,'kind').toUpperCase() as CreateLabEvidenceInput['kind'], title:required(b,'title'), description:optionalString(b,'description'), content:json(b,'content'), artifactId:optionalString(b,'artifactId'), externalUrl:optionalString(b,'externalUrl'), isPublic:optionalBool(b,'isPublic')??true, sortOrder:optionalInt(b,'sortOrder')??0 }; }
export function parseEvidenceUpdate(value: unknown): UpdateLabEvidenceInput { const b=body(value); const out:UpdateLabEvidenceInput={}; if(own(b,'kind')) out.kind=required(b,'kind').toUpperCase() as UpdateLabEvidenceInput['kind']; if(own(b,'title')) out.title=required(b,'title'); if(own(b,'description')) out.description=optionalString(b,'description'); if(own(b,'content')) out.content=b.content; if(own(b,'artifactId')) out.artifactId=optionalString(b,'artifactId'); if(own(b,'externalUrl')) out.externalUrl=optionalString(b,'externalUrl'); if(own(b,'isPublic')) out.isPublic=bool(b.isPublic,'isPublic'); if(own(b,'sortOrder')) out.sortOrder=int(b.sortOrder,'sortOrder'); return out; }
