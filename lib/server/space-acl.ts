import type {
  PortalGlobalRole,
  SpaceJoinPolicy,
  SpaceMemberRole,
  SpaceVisibility,
} from '@/lib/db/drizzle/schema';

export type SpaceCapability =
  | 'space.read'
  | 'space.manage'
  | 'space.members.manage'
  | 'space.invites.manage'
  | 'space.content.write'
  | 'space.content.publish'
  | 'space.system.write'
  | 'space.system.publish'
  | 'space.join.request';

export type SpaceContentVisibility = 'public' | 'members_only';

export type SpaceActorRole = SpaceMemberRole | 'guest';

export type SpaceAclSubject = {
  userId: string | null;
  globalRoles: PortalGlobalRole[];
};

export type SpaceAclResource = {
  visibility: SpaceVisibility;
  joinPolicy: SpaceJoinPolicy;
  ownerUserId: string;
  memberRole?: SpaceMemberRole | null;
};

type SpaceCapabilityMatrix = Record<SpaceActorRole, Record<Exclude<SpaceCapability, 'space.read' | 'space.join.request'>, boolean>>;

const SPACE_CAPABILITY_MATRIX: SpaceCapabilityMatrix = {
  owner: {
    'space.manage': true,
    'space.members.manage': true,
    'space.invites.manage': true,
    'space.content.write': true,
    'space.content.publish': true,
    'space.system.write': true,
    // Strict ownership policy for systems: publish is creator/owner only.
    'space.system.publish': true,
  },
  admin: {
    'space.manage': true,
    'space.members.manage': true,
    'space.invites.manage': true,
    'space.content.write': true,
    'space.content.publish': true,
    'space.system.write': true,
    'space.system.publish': false,
  },
  editor: {
    'space.manage': false,
    'space.members.manage': false,
    'space.invites.manage': false,
    'space.content.write': true,
    'space.content.publish': false,
    'space.system.write': true,
    'space.system.publish': false,
  },
  member: {
    'space.manage': false,
    'space.members.manage': false,
    'space.invites.manage': false,
    'space.content.write': false,
    'space.content.publish': false,
    'space.system.write': false,
    'space.system.publish': false,
  },
  guest: {
    'space.manage': false,
    'space.members.manage': false,
    'space.invites.manage': false,
    'space.content.write': false,
    'space.content.publish': false,
    'space.system.write': false,
    'space.system.publish': false,
  },
};

export function resolveSpaceActorRole(subject: SpaceAclSubject, resource: SpaceAclResource): SpaceActorRole {
  if (!subject.userId) return 'guest';
  if (subject.userId === resource.ownerUserId) return 'owner';
  if (subject.globalRoles.includes('admin')) return 'admin';
  return resource.memberRole ?? 'guest';
}

export function canSpaceCapability(
  subject: SpaceAclSubject,
  resource: SpaceAclResource,
  capability: SpaceCapability,
): boolean {
  const role = resolveSpaceActorRole(subject, resource);

  if (capability === 'space.read') {
    if (resource.visibility === 'public') return true;
    return role !== 'guest';
  }

  if (capability === 'space.join.request') {
    return role === 'guest'
      && resource.visibility === 'public'
      && resource.joinPolicy === 'request';
  }

  return SPACE_CAPABILITY_MATRIX[role][capability];
}

export function canReadSpace(subject: SpaceAclSubject, resource: SpaceAclResource): boolean {
  return canSpaceCapability(subject, resource, 'space.read');
}

export function canJoinSpace(subject: SpaceAclSubject, resource: SpaceAclResource): boolean {
  return canSpaceCapability(subject, resource, 'space.join.request');
}

export function canReadContent(
  subject: SpaceAclSubject,
  resource: SpaceAclResource,
  contentVisibility: SpaceContentVisibility,
): boolean {
  if (contentVisibility === 'public') return canReadSpace(subject, resource);
  const role = resolveSpaceActorRole(subject, resource);
  return role !== 'guest';
}

export function canPublishSystem(subject: SpaceAclSubject, resource: SpaceAclResource): boolean {
  return canSpaceCapability(subject, resource, 'space.system.publish');
}

export function listSpaceCapabilitiesForRole(role: SpaceActorRole): SpaceCapability[] {
  const permissions = SPACE_CAPABILITY_MATRIX[role];
  const capabilities: SpaceCapability[] = [];

  if (role !== 'guest') capabilities.push('space.read');

  for (const [capability, allowed] of Object.entries(permissions) as Array<[Exclude<SpaceCapability, 'space.read' | 'space.join.request'>, boolean]>) {
    if (allowed) capabilities.push(capability);
  }

  return capabilities;
}
