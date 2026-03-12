import { notFound } from 'next/navigation';

import { requireAuthUser } from '@/lib/server/auth-guard';
import { can, resolveEffectiveRoles } from '@/lib/server/portal-rbac';

type PageProps = {
  params: Promise<{ tournamentId: string }>;
};

export default async function TournamentScopePage({ params }: PageProps) {
  const user = await requireAuthUser();
  if (!user) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <section className="rounded-xl border border-[#d8dbe1] bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-[#1f2734]">Tournament workspace</h1>
          <p className="mt-2 text-sm text-[#6e7788]">
            Sign in to view scoped permissions for this tournament.
          </p>
        </section>
      </main>
    );
  }

  const { tournamentId } = await params;
  if (!tournamentId) notFound();

  const scope = { type: 'tournament' as const, id: tournamentId };
  const principal = { userId: user.id, globalRoles: user.globalRoles };

  const [canRead, canManage, canModerate, effectiveRoles] = await Promise.all([
    can(principal, 'tournament.read', scope),
    can(principal, 'tournament.manage', scope),
    can(principal, 'discussion.moderate', scope),
    resolveEffectiveRoles(principal, scope),
  ]);

  return (
    <main className="mx-auto max-w-4xl p-6">
      <section className="rounded-xl border border-[#d8dbe1] bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-[#1f2734]">Tournament scope demo</h1>
        <p className="mt-2 text-sm text-[#6e7788]">
          Scoped permissions are resolved from DB assignments for
          {' '}
          <span className="font-medium text-[#1f2734]">tournament:{tournamentId}</span>
          .
        </p>

        <dl className="mt-4 grid gap-3 rounded-lg border border-[#d8dbe1] bg-[#f8f9fc] p-4 text-sm text-[#1f2734]">
          <div className="flex items-center justify-between">
            <dt className="text-[#6e7788]">Can read tournament</dt>
            <dd className="font-semibold">{canRead ? 'Yes' : 'No'}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-[#6e7788]">Can manage tournament</dt>
            <dd className="font-semibold">{canManage ? 'Yes' : 'No'}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-[#6e7788]">Can moderate tournament discussions</dt>
            <dd className="font-semibold">{canModerate ? 'Yes' : 'No'}</dd>
          </div>
          <div className="flex items-start justify-between gap-4">
            <dt className="text-[#6e7788]">Effective roles</dt>
            <dd className="font-semibold">{effectiveRoles.join(', ')}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
