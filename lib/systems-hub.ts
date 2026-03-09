export type SystemAccessRole = 'owner' | 'editor' | 'reviewer' | 'viewer';
export type SystemsHubAccessFilter = 'all' | 'owner' | 'shared';
export type SystemsHubStatusFilter = 'all' | 'active' | 'stale';
export type SystemsHubStatus = 'active' | 'stale';

export interface SystemsHubSystemSummary {
  id: string;
  title: string;
  description: string | null;
  schemaVersion: number;
  revision: number;
  updatedAt: string;
  role: SystemAccessRole;
}

export interface SystemsHubFilterInput {
  query?: string;
  access?: SystemsHubAccessFilter;
  status?: SystemsHubStatusFilter;
  tag?: string;
}

const ACTIVE_WINDOW_DAYS = 30;
const ACTIVE_WINDOW_MS = ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export function getSystemStatus(updatedAt: string, nowMs = Date.now()): SystemsHubStatus {
  const timestamp = Date.parse(updatedAt);
  if (!Number.isFinite(timestamp)) return 'stale';
  return nowMs - timestamp <= ACTIVE_WINDOW_MS ? 'active' : 'stale';
}

function normalizeTag(tag: string): string {
  return tag.trim().toLocaleLowerCase();
}

export function extractSystemTags(system: SystemsHubSystemSummary): string[] {
  const tags = new Set<string>();
  tags.add(system.role);
  tags.add(`schema-v${system.schemaVersion}`);

  const source = `${system.title} ${system.description ?? ''}`;
  const hashtagRegex = /#([a-zA-Z0-9][a-zA-Z0-9_-]{0,30})/g;
  for (const match of source.matchAll(hashtagRegex)) {
    const raw = match[1];
    if (!raw) continue;
    tags.add(normalizeTag(raw));
  }

  return [...tags];
}

function includesQuery(system: SystemsHubSystemSummary, query: string): boolean {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return true;
  const haystack = `${system.title} ${system.description ?? ''}`.toLocaleLowerCase();
  return haystack.includes(normalized);
}

function matchesAccess(system: SystemsHubSystemSummary, access: SystemsHubAccessFilter): boolean {
  if (access === 'all') return true;
  if (access === 'owner') return system.role === 'owner';
  return system.role !== 'owner';
}

function matchesStatus(system: SystemsHubSystemSummary, status: SystemsHubStatusFilter, nowMs: number): boolean {
  if (status === 'all') return true;
  return getSystemStatus(system.updatedAt, nowMs) === status;
}

function matchesTag(system: SystemsHubSystemSummary, tag: string): boolean {
  const normalized = normalizeTag(tag);
  if (!normalized) return true;
  const tags = extractSystemTags(system);
  return tags.includes(normalized);
}

const ROLE_SORT_PRIORITY: Record<SystemAccessRole, number> = {
  owner: 0,
  editor: 1,
  reviewer: 2,
  viewer: 3,
};

export function sortSystemsForHub(
  systems: SystemsHubSystemSummary[],
  nowMs = Date.now(),
): SystemsHubSystemSummary[] {
  return [...systems].sort((left, right) => {
    const leftRole = ROLE_SORT_PRIORITY[left.role];
    const rightRole = ROLE_SORT_PRIORITY[right.role];
    if (leftRole !== rightRole) return leftRole - rightRole;

    const leftStatus = getSystemStatus(left.updatedAt, nowMs);
    const rightStatus = getSystemStatus(right.updatedAt, nowMs);
    if (leftStatus !== rightStatus) return leftStatus === 'active' ? -1 : 1;

    const leftTs = Date.parse(left.updatedAt);
    const rightTs = Date.parse(right.updatedAt);
    if (Number.isFinite(leftTs) && Number.isFinite(rightTs) && leftTs !== rightTs) {
      return rightTs - leftTs;
    }

    return left.title.localeCompare(right.title);
  });
}

export function filterSystemsForHub(
  systems: SystemsHubSystemSummary[],
  filters?: SystemsHubFilterInput,
  nowMs = Date.now(),
): SystemsHubSystemSummary[] {
  if (!filters) return sortSystemsForHub(systems, nowMs);

  const query = filters.query?.trim() ?? '';
  const access = filters.access ?? 'all';
  const status = filters.status ?? 'all';
  const tag = filters.tag?.trim() ?? '';

  const filtered = systems.filter((system) => (
    includesQuery(system, query)
    && matchesAccess(system, access)
    && matchesStatus(system, status, nowMs)
    && matchesTag(system, tag)
  ));

  return sortSystemsForHub(filtered, nowMs);
}

export function collectSystemsHubTags(systems: SystemsHubSystemSummary[]): string[] {
  const tags = new Set<string>();
  systems.forEach((system) => {
    extractSystemTags(system).forEach((tag) => tags.add(tag));
  });
  return [...tags].sort((a, b) => a.localeCompare(b));
}
