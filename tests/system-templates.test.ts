import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getSystemTemplateProfile,
  getSystemTemplateSeed,
  listSystemTemplateProfiles,
  SYSTEM_TEMPLATE_IDS,
} from '../lib/system-templates';

test('template profiles expose Standard, 2/1, Precision', () => {
  const profiles = listSystemTemplateProfiles();
  const ids = profiles.map((item) => item.id);
  assert.deepEqual(ids, [...SYSTEM_TEMPLATE_IDS]);
  assert.equal(profiles.length, 3);
});

test('template seed returns deterministic non-empty nodes', () => {
  const first = getSystemTemplateSeed('standard');
  const second = getSystemTemplateSeed('standard');

  assert.ok(first.length > 0);
  assert.deepEqual(first, second);
  assert.equal(new Set(first.map((item) => item.sequenceId)).size, first.length);
});

test('precision profile metadata is available for create flow', () => {
  const profile = getSystemTemplateProfile('precision');
  assert.equal(profile.name, 'Precision');
  assert.ok(profile.defaultTitle.length > 0);
  assert.ok(profile.defaultDescription.length > 0);
  assert.ok(profile.nodeCount > 0);
});
