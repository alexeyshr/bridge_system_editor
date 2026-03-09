import type { AccessRole } from '@/lib/server/drivers/types';

export type CollaborationCapability =
  | 'system.read'
  | 'system.edit'
  | 'lifecycle.publish'
  | 'shares.manage'
  | 'invites.manage'
  | 'users.search'
  | 'discussions.read'
  | 'discussions.write'
  | 'links.manage';

type CapabilityMatrix = Record<AccessRole, Record<CollaborationCapability, boolean>>;

const CAPABILITY_MATRIX: CapabilityMatrix = {
  owner: {
    'system.read': true,
    'system.edit': true,
    'lifecycle.publish': true,
    'shares.manage': true,
    'invites.manage': true,
    'users.search': true,
    'discussions.read': true,
    'discussions.write': true,
    'links.manage': true,
  },
  editor: {
    'system.read': true,
    'system.edit': true,
    'lifecycle.publish': true,
    'shares.manage': false,
    'invites.manage': false,
    'users.search': false,
    'discussions.read': true,
    'discussions.write': true,
    'links.manage': false,
  },
  reviewer: {
    'system.read': true,
    'system.edit': false,
    'lifecycle.publish': false,
    'shares.manage': false,
    'invites.manage': false,
    'users.search': false,
    'discussions.read': true,
    'discussions.write': true,
    'links.manage': false,
  },
  viewer: {
    'system.read': true,
    'system.edit': false,
    'lifecycle.publish': false,
    'shares.manage': false,
    'invites.manage': false,
    'users.search': false,
    'discussions.read': true,
    'discussions.write': false,
    'links.manage': false,
  },
  none: {
    'system.read': false,
    'system.edit': false,
    'lifecycle.publish': false,
    'shares.manage': false,
    'invites.manage': false,
    'users.search': false,
    'discussions.read': false,
    'discussions.write': false,
    'links.manage': false,
  },
};

export function canRoleAccessCapability(role: AccessRole, capability: CollaborationCapability): boolean {
  return CAPABILITY_MATRIX[role][capability];
}

export function listCapabilitiesForRole(role: AccessRole): CollaborationCapability[] {
  return (Object.entries(CAPABILITY_MATRIX[role]) as Array<[CollaborationCapability, boolean]>)
    .filter(([, allowed]) => allowed)
    .map(([capability]) => capability);
}

export function getCollaborationRoleMatrix(): CapabilityMatrix {
  return CAPABILITY_MATRIX;
}
