import assert from 'node:assert/strict';
import test from 'node:test';

import {
  contentFormatEnum,
  contentLinkTargetEnum,
  contentStatusEnum,
  contentVisibilityEnum,
  schema,
} from '../lib/db/drizzle/schema';

test('content domain enums keep expected values', () => {
  assert.deepEqual(contentFormatEnum.enumValues, ['article', 'deal_analysis', 'auction_lesson', 'tournament_recap', 'quiz']);
  assert.deepEqual(contentVisibilityEnum.enumValues, ['public', 'members_only']);
  assert.deepEqual(contentStatusEnum.enumValues, ['draft', 'published', 'archived']);
  assert.deepEqual(contentLinkTargetEnum.enumValues, ['system', 'tournament', 'content', 'external']);
});

test('schema exports content domain tables', () => {
  assert.equal(typeof schema.contentItems, 'object');
  assert.equal(typeof schema.contentVersions, 'object');
  assert.equal(typeof schema.contentTags, 'object');
  assert.equal(typeof schema.contentLinks, 'object');
});
