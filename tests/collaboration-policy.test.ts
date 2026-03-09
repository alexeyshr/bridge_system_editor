import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canRoleAccessCapability,
  getCollaborationRoleMatrix,
  listCapabilitiesForRole,
  type CollaborationCapability,
} from '../lib/server/collaboration-policy';
import type { AccessRole } from '../lib/server/drivers/types';

const ROLES: AccessRole[] = ['owner', 'editor', 'reviewer', 'viewer', 'none'];
const CAPABILITIES: CollaborationCapability[] = [
  'system.read',
  'system.edit',
  'lifecycle.publish',
  'shares.manage',
  'invites.manage',
  'users.search',
  'discussions.read',
  'discussions.write',
  'links.manage',
];

test('collaboration policy matrix has all roles and capabilities', () => {
  const matrix = getCollaborationRoleMatrix();
  for (const role of ROLES) {
    for (const capability of CAPABILITIES) {
      assert.equal(typeof matrix[role][capability], 'boolean');
    }
  }
});

test('owner has all capabilities', () => {
  for (const capability of CAPABILITIES) {
    assert.equal(canRoleAccessCapability('owner', capability), true);
  }
});

test('reviewer is read/comment only (no edit/share/invite/search/publish)', () => {
  assert.equal(canRoleAccessCapability('reviewer', 'system.read'), true);
  assert.equal(canRoleAccessCapability('reviewer', 'discussions.read'), true);
  assert.equal(canRoleAccessCapability('reviewer', 'discussions.write'), true);
  assert.equal(canRoleAccessCapability('reviewer', 'system.edit'), false);
  assert.equal(canRoleAccessCapability('reviewer', 'lifecycle.publish'), false);
  assert.equal(canRoleAccessCapability('reviewer', 'shares.manage'), false);
  assert.equal(canRoleAccessCapability('reviewer', 'invites.manage'), false);
  assert.equal(canRoleAccessCapability('reviewer', 'users.search'), false);
  assert.equal(canRoleAccessCapability('reviewer', 'links.manage'), false);
});

test('viewer cannot write discussion messages', () => {
  assert.equal(canRoleAccessCapability('viewer', 'discussions.read'), true);
  assert.equal(canRoleAccessCapability('viewer', 'discussions.write'), false);
});

test('none role has zero capabilities', () => {
  const capabilities = listCapabilitiesForRole('none');
  assert.deepEqual(capabilities, []);
});
