import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canSpaceCapability,
  listSpaceCapabilitiesForRole,
  resolveSpaceActorRole,
  type SpaceAclSubject,
} from '../lib/server/space-acl';

test('public space is readable by guests, hidden space is not', () => {
  const guest = { userId: null, globalRoles: [] };

  const canReadPublic = canSpaceCapability(guest, {
    visibility: 'public',
    joinPolicy: 'request',
    ownerUserId: 'owner-1',
    memberRole: null,
  }, 'space.read');
  assert.equal(canReadPublic, true);

  const canReadHidden = canSpaceCapability(guest, {
    visibility: 'hidden',
    joinPolicy: 'invite_only',
    ownerUserId: 'owner-1',
    memberRole: null,
  }, 'space.read');
  assert.equal(canReadHidden, false);
});

test('guest join request depends on policy and visibility', () => {
  const guest = { userId: null, globalRoles: [] };

  assert.equal(canSpaceCapability(guest, {
    visibility: 'public',
    joinPolicy: 'request',
    ownerUserId: 'owner-1',
  }, 'space.join.request'), true);

  assert.equal(canSpaceCapability(guest, {
    visibility: 'public',
    joinPolicy: 'invite_only',
    ownerUserId: 'owner-1',
  }, 'space.join.request'), false);

  assert.equal(canSpaceCapability(guest, {
    visibility: 'hidden',
    joinPolicy: 'request',
    ownerUserId: 'owner-1',
  }, 'space.join.request'), false);
});

test('system publish is owner-only in baseline ACL matrix', () => {
  const adminUser: SpaceAclSubject = { userId: 'user-2', globalRoles: ['admin'] };
  const ownerUser: SpaceAclSubject = { userId: 'owner-1', globalRoles: ['user'] };

  const adminCanPublish = canSpaceCapability(adminUser, {
    visibility: 'hidden',
    joinPolicy: 'invite_only',
    ownerUserId: 'owner-1',
    memberRole: 'admin',
  }, 'space.system.publish');
  assert.equal(adminCanPublish, false);

  const ownerCanPublish = canSpaceCapability(ownerUser, {
    visibility: 'hidden',
    joinPolicy: 'invite_only',
    ownerUserId: 'owner-1',
    memberRole: 'owner',
  }, 'space.system.publish');
  assert.equal(ownerCanPublish, true);
});

test('global admin resolves as admin role for non-owner spaces', () => {
  const role = resolveSpaceActorRole(
    { userId: 'user-2', globalRoles: ['admin'] },
    {
      visibility: 'public',
      joinPolicy: 'request',
      ownerUserId: 'owner-1',
      memberRole: null,
    },
  );

  assert.equal(role, 'admin');
  assert.equal(listSpaceCapabilitiesForRole('guest').includes('space.manage'), false);
});
