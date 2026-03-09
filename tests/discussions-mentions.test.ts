import assert from 'node:assert/strict';
import test from 'node:test';
import { extractMentionCandidates } from '../lib/server/discussion-service';

test('mention parser extracts user-id and username mentions', () => {
  const mentions = extractMentionCandidates('Ping [user:user_123] and @BridgePartner please');
  assert.equal(mentions.length, 2);
  assert.equal(mentions[0]?.userId, 'user_123');
  assert.equal(mentions[1]?.username, 'bridgepartner');
});

test('mention parser returns empty list for plain text', () => {
  const mentions = extractMentionCandidates('No mentions here');
  assert.deepEqual(mentions, []);
});
