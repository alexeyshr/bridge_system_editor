import { forbidden, ok, serverError, unauthorized } from '@/lib/server/api-response';
import { requireAuthUser } from '@/lib/server/auth-guard';
import { AccessDeniedError } from '@/lib/server/domain-errors';
import { can, resolveEffectiveRoles, type PortalScopeRef } from '@/lib/server/portal-rbac';

type RouteContext = {
  params: Promise<{ tournamentId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await requireAuthUser();
  if (!user) return unauthorized();

  try {
    const { tournamentId } = await context.params;
    const scope: PortalScopeRef = { type: 'tournament', id: tournamentId };
    const principal = {
      userId: user.id,
      globalRoles: user.globalRoles,
    };

    const canRead = await can(principal, 'tournament.read', scope);
    if (!canRead) throw new AccessDeniedError();

    const [canManage, canModerate, effectiveRoles] = await Promise.all([
      can(principal, 'tournament.manage', scope),
      can(principal, 'discussion.moderate', scope),
      resolveEffectiveRoles(principal, scope),
    ]);

    return ok({
      tournament: {
        id: tournamentId,
        title: `Tournament ${tournamentId}`,
      },
      access: {
        canRead,
        canManage,
        canModerate,
        effectiveRoles,
      },
    });
  } catch (error) {
    if (error instanceof AccessDeniedError) return forbidden();
    console.error('Failed to resolve tournament scoped access', error);
    return serverError('Failed to resolve tournament scoped access');
  }
}
