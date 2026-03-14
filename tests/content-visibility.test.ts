import assert from 'node:assert/strict';
import test from 'node:test';

import { assertContentPublishVisibilityPolicy } from '../lib/server/content-service';
import { canReadContent, type SpaceAclSubject } from '../lib/server/space-acl';

const publicSpaceResource = {
  visibility: 'public' as const,
  joinPolicy: 'request' as const,
  ownerUserId: 'owner-1',
};

const hiddenSpaceResource = {
  visibility: 'hidden' as const,
  joinPolicy: 'invite_only' as const,
  ownerUserId: 'owner-1',
};

test('visibility leak prevention for guest/non-member/member read paths', () => {
  const guest: SpaceAclSubject = { userId: null, globalRoles: [] };
  const nonMember: SpaceAclSubject = { userId: 'user-2', globalRoles: ['user'] };
  const member: SpaceAclSubject = { userId: 'user-3', globalRoles: ['user'] };

  assert.equal(canReadContent(guest, publicSpaceResource, 'public'), true);
  assert.equal(canReadContent(guest, publicSpaceResource, 'members_only'), false);

  assert.equal(canReadContent(nonMember, publicSpaceResource, 'public'), true);
  assert.equal(canReadContent(nonMember, publicSpaceResource, 'members_only'), false);

  assert.equal(
    canReadContent(
      member,
      { ...publicSpaceResource, memberRole: 'member' as const },
      'members_only',
    ),
    true,
  );

  assert.equal(
    canReadContent(
      member,
      { ...hiddenSpaceResource, memberRole: 'member' as const },
      'members_only',
    ),
    true,
  );

  assert.equal(canReadContent(nonMember, hiddenSpaceResource, 'public'), false);
});

test('hidden spaces cannot publish public content', () => {
  assert.throws(
    () => assertContentPublishVisibilityPolicy('hidden', 'public'),
    /Hidden spaces cannot publish public content/,
  );
  assert.doesNotThrow(() => assertContentPublishVisibilityPolicy('public', 'public'));
  assert.doesNotThrow(() => assertContentPublishVisibilityPolicy('hidden', 'members_only'));
});
