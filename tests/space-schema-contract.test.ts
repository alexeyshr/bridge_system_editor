import assert from 'node:assert/strict';
import test from 'node:test';

import {
  schema,
  spaceInviteStatusEnum,
  spaceJoinPolicyEnum,
  spaceJoinRequestStatusEnum,
  spaceMemberRoleEnum,
  spaceReviewPolicyEnum,
  spaceTypeEnum,
  spaceVisibilityEnum,
} from '../lib/db/drizzle/schema';

test('space domain enums keep expected values', () => {
  assert.deepEqual(spaceTypeEnum.enumValues, ['personal', 'team']);
  assert.deepEqual(spaceVisibilityEnum.enumValues, ['public', 'hidden']);
  assert.deepEqual(spaceJoinPolicyEnum.enumValues, ['request', 'invite_only']);
  assert.deepEqual(spaceReviewPolicyEnum.enumValues, ['none', 'required']);
  assert.deepEqual(spaceMemberRoleEnum.enumValues, ['owner', 'admin', 'editor', 'member']);
  assert.deepEqual(spaceJoinRequestStatusEnum.enumValues, ['pending', 'approved', 'rejected', 'cancelled']);
  assert.deepEqual(spaceInviteStatusEnum.enumValues, ['pending', 'accepted', 'revoked', 'expired']);
});

test('schema exports new space governance tables', () => {
  assert.equal(typeof schema.spaces, 'object');
  assert.equal(typeof schema.spaceMembers, 'object');
  assert.equal(typeof schema.spaceJoinRequests, 'object');
  assert.equal(typeof schema.spaceInvites, 'object');
});
