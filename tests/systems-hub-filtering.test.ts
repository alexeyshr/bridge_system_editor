import assert from 'node:assert/strict';
import test from 'node:test';
import {
  collectSystemsHubTags,
  extractSystemTags,
  filterSystemsForHub,
  getSystemStatus,
  type SystemsHubSystemSummary,
} from '../lib/systems-hub';

const NOW = Date.parse('2026-03-09T12:00:00.000Z');

function mkSystem(input: Partial<SystemsHubSystemSummary> & { id: string; title: string }): SystemsHubSystemSummary {
  return {
    id: input.id,
    title: input.title,
    description: input.description ?? null,
    schemaVersion: input.schemaVersion ?? 1,
    revision: input.revision ?? 1,
    updatedAt: input.updatedAt ?? '2026-03-09T10:00:00.000Z',
    role: input.role ?? 'owner',
  };
}

test('getSystemStatus marks old systems as stale', () => {
  const active = getSystemStatus('2026-03-01T12:00:00.000Z', NOW);
  const stale = getSystemStatus('2025-12-01T12:00:00.000Z', NOW);
  assert.equal(active, 'active');
  assert.equal(stale, 'stale');
});

test('extractSystemTags includes role, schema and hashtags', () => {
  const tags = extractSystemTags(mkSystem({
    id: 'sys-1',
    title: 'Precision #club',
    description: 'Relay ideas #forcing',
    schemaVersion: 2,
    role: 'editor',
  }));

  assert.equal(tags.includes('editor'), true);
  assert.equal(tags.includes('schema-v2'), true);
  assert.equal(tags.includes('club'), true);
  assert.equal(tags.includes('forcing'), true);
});

test('filterSystemsForHub applies query/access/status/tag filters', () => {
  const systems: SystemsHubSystemSummary[] = [
    mkSystem({
      id: 'sys-owner-active',
      title: 'Precision Relay',
      description: 'Core #relay',
      role: 'owner',
      updatedAt: '2026-03-08T10:00:00.000Z',
    }),
    mkSystem({
      id: 'sys-shared-stale',
      title: 'Standard',
      description: 'Legacy #old',
      role: 'viewer',
      updatedAt: '2025-12-01T10:00:00.000Z',
    }),
  ];

  const byQuery = filterSystemsForHub(systems, { query: 'prec' }, NOW);
  assert.deepEqual(byQuery.map((item) => item.id), ['sys-owner-active']);

  const byAccess = filterSystemsForHub(systems, { access: 'shared' }, NOW);
  assert.deepEqual(byAccess.map((item) => item.id), ['sys-shared-stale']);

  const byStatus = filterSystemsForHub(systems, { status: 'stale' }, NOW);
  assert.deepEqual(byStatus.map((item) => item.id), ['sys-shared-stale']);

  const byTag = filterSystemsForHub(systems, { tag: 'relay' }, NOW);
  assert.deepEqual(byTag.map((item) => item.id), ['sys-owner-active']);
});

test('collectSystemsHubTags returns sorted unique tags', () => {
  const systems: SystemsHubSystemSummary[] = [
    mkSystem({ id: 'a', title: 'Alpha #x', role: 'owner' }),
    mkSystem({ id: 'b', title: 'Beta #y', role: 'viewer' }),
    mkSystem({ id: 'c', title: 'Gamma #x', role: 'editor' }),
  ];

  const tags = collectSystemsHubTags(systems);
  assert.deepEqual(tags, [...tags].sort((a, b) => a.localeCompare(b)));
  assert.equal(tags.filter((tag) => tag === 'x').length, 1);
});
