import { and, eq } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle/client';
import { userGlobalRoles, userScopedRoles } from '@/lib/db/drizzle/schema';
import type {
  PortalCapability,
  PortalGlobalRole,
  PortalRole,
  PortalScopeType,
  PortalScopedRole,
} from '@/lib/portal-access';
import {
  hasCapability,
  listCapabilitiesForRoles,
  normalizePortalRoles,
} from '@/lib/portal-access';
import { AccessDeniedError } from '@/lib/server/domain-errors';

export type PortalScopeRef = {
  type: PortalScopeType;
  id: string;
};

export type PortalPrincipal = {
  userId: string | null;
  globalRoles: PortalGlobalRole[];
};

export async function listGlobalRolesForUser(userId: string): Promise<PortalGlobalRole[]> {
  const rows = await db
    .select({
      role: userGlobalRoles.role,
    })
    .from(userGlobalRoles)
    .where(eq(userGlobalRoles.userId, userId));

  if (rows.length === 0) return ['user'];
  return [...new Set(rows.map((row) => row.role as PortalGlobalRole))];
}

export async function listScopedRolesForUser(
  userId: string,
  scope: PortalScopeRef,
): Promise<PortalScopedRole[]> {
  const rows = await db
    .select({
      role: userScopedRoles.role,
    })
    .from(userScopedRoles)
    .where(
      and(
        eq(userScopedRoles.userId, userId),
        eq(userScopedRoles.scopeType, scope.type),
        eq(userScopedRoles.scopeId, scope.id),
      ),
    );

  return [...new Set(rows.map((row) => row.role as PortalScopedRole))];
}

export async function resolveEffectiveRoles(
  principal: PortalPrincipal,
  scope?: PortalScopeRef,
): Promise<PortalRole[]> {
  if (!principal.userId) {
    return ['anonymous'];
  }

  const globalRoles: PortalGlobalRole[] = principal.globalRoles.length > 0
    ? principal.globalRoles
    : ['user'];
  if (!scope) {
    return normalizePortalRoles(globalRoles);
  }

  const scopedRoles = await listScopedRolesForUser(principal.userId, scope);
  // Scoped checks are strict by context:
  // only explicit scope assignments are considered, with admin as global override.
  const effective = [...scopedRoles];
  if (globalRoles.includes('admin')) {
    effective.push('admin');
  }

  if (effective.length === 0) {
    return ['anonymous'];
  }

  return normalizePortalRoles(effective);
}

export async function can(
  principal: PortalPrincipal,
  capability: PortalCapability,
  scope?: PortalScopeRef,
): Promise<boolean> {
  const roles = await resolveEffectiveRoles(principal, scope);
  const capabilities = listCapabilitiesForRoles(roles);
  return hasCapability(capabilities, capability);
}

export async function assertCan(
  principal: PortalPrincipal,
  capability: PortalCapability,
  scope?: PortalScopeRef,
): Promise<void> {
  const allowed = await can(principal, capability, scope);
  if (!allowed) throw new AccessDeniedError();
}
