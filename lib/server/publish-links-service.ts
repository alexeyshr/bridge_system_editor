import crypto from 'node:crypto';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle/client';
import {
  biddingSystems,
  readOnlyPublishLinks,
  systemVersions,
  users,
} from '@/lib/db/drizzle/schema';
import { createEntityId } from '@/lib/server/utils/id';
import { InvalidStateError, NotFoundError } from '@/lib/server/domain-errors';
import { assertSystemCapability } from '@/lib/server/systems-service';
import { recordAuditEvent } from '@/lib/server/audit-service';

function createToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

function buildReadOnlyUrl(token: string): string {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  return `${baseUrl}/api/publish-links/${token}`;
}

export async function listReadOnlyLinks(systemId: string, userId: string) {
  await assertSystemCapability(systemId, userId, 'links.manage');

  const links = await db
    .select({
      id: readOnlyPublishLinks.id,
      systemId: readOnlyPublishLinks.systemId,
      versionId: readOnlyPublishLinks.versionId,
      token: readOnlyPublishLinks.token,
      label: readOnlyPublishLinks.label,
      status: readOnlyPublishLinks.status,
      createdAt: readOnlyPublishLinks.createdAt,
      expiresAt: readOnlyPublishLinks.expiresAt,
      revokedAt: readOnlyPublishLinks.revokedAt,
      lastAccessAt: readOnlyPublishLinks.lastAccessAt,
      versionNumber: systemVersions.versionNumber,
      createdById: users.id,
      createdByEmail: users.email,
      createdByDisplayName: users.displayName,
    })
    .from(readOnlyPublishLinks)
    .innerJoin(systemVersions, eq(readOnlyPublishLinks.versionId, systemVersions.id))
    .innerJoin(users, eq(readOnlyPublishLinks.createdById, users.id))
    .where(eq(readOnlyPublishLinks.systemId, systemId))
    .orderBy(desc(readOnlyPublishLinks.createdAt));

  return links.map((link) => ({
    id: link.id,
    systemId: link.systemId,
    versionId: link.versionId,
    versionNumber: link.versionNumber,
    label: link.label,
    status: link.status,
    createdAt: link.createdAt.toISOString(),
    expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
    revokedAt: link.revokedAt ? link.revokedAt.toISOString() : null,
    lastAccessAt: link.lastAccessAt ? link.lastAccessAt.toISOString() : null,
    url: buildReadOnlyUrl(link.token),
    createdBy: {
      id: link.createdById,
      email: link.createdByEmail,
      displayName: link.createdByDisplayName,
    },
  }));
}

export async function createReadOnlyLink(
  systemId: string,
  userId: string,
  input: { versionId?: string; label?: string | null; expiresInHours?: number | null },
) {
  await assertSystemCapability(systemId, userId, 'links.manage');

  const [system] = await db
    .select({
      id: biddingSystems.id,
    })
    .from(biddingSystems)
    .where(eq(biddingSystems.id, systemId))
    .limit(1);
  if (!system) throw new NotFoundError('System not found');

  let versionId = input.versionId;
  if (!versionId) {
    const [latest] = await db
      .select({
        id: systemVersions.id,
      })
      .from(systemVersions)
      .where(eq(systemVersions.systemId, systemId))
      .orderBy(desc(systemVersions.versionNumber))
      .limit(1);
    if (!latest) throw new InvalidStateError('No published version found');
    versionId = latest.id;
  }

  const [version] = await db
    .select({
      id: systemVersions.id,
      versionNumber: systemVersions.versionNumber,
    })
    .from(systemVersions)
    .where(and(eq(systemVersions.id, versionId), eq(systemVersions.systemId, systemId)))
    .limit(1);
  if (!version) throw new NotFoundError('Published version not found');

  const now = new Date();
  const expiresAt =
    typeof input.expiresInHours === 'number' && input.expiresInHours > 0
      ? new Date(now.getTime() + input.expiresInHours * 60 * 60 * 1000)
      : null;
  const id = createEntityId('plink');
  const token = createToken();
  await db.insert(readOnlyPublishLinks).values({
    id,
    systemId,
    versionId: version.id,
    token,
    label: input.label?.trim() || null,
    status: 'active',
    createdById: userId,
    createdAt: now,
    expiresAt,
    revokedAt: null,
    lastAccessAt: null,
  });

  await recordAuditEvent({
    systemId,
    actorUserId: userId,
    action: 'read_only_link.create',
    targetType: 'read_only_link',
    targetId: id,
    payload: {
      versionId: version.id,
      versionNumber: version.versionNumber,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
    },
  });

  return {
    id,
    systemId,
    versionId: version.id,
    versionNumber: version.versionNumber,
    label: input.label?.trim() || null,
    status: 'active' as const,
    createdAt: now.toISOString(),
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    revokedAt: null,
    lastAccessAt: null,
    url: buildReadOnlyUrl(token),
  };
}

export async function revokeReadOnlyLink(systemId: string, userId: string, linkId: string) {
  await assertSystemCapability(systemId, userId, 'links.manage');

  const [link] = await db
    .select({
      id: readOnlyPublishLinks.id,
      status: readOnlyPublishLinks.status,
    })
    .from(readOnlyPublishLinks)
    .where(and(eq(readOnlyPublishLinks.id, linkId), eq(readOnlyPublishLinks.systemId, systemId)))
    .limit(1);
  if (!link) throw new NotFoundError('Read-only link not found');
  if (link.status !== 'active') {
    throw new InvalidStateError('Read-only link is already revoked');
  }

  const now = new Date();
  await db
    .update(readOnlyPublishLinks)
    .set({
      status: 'revoked',
      revokedAt: now,
    })
    .where(eq(readOnlyPublishLinks.id, link.id));

  await recordAuditEvent({
    systemId,
    actorUserId: userId,
    action: 'read_only_link.revoke',
    targetType: 'read_only_link',
    targetId: link.id,
  });

  return {
    id: link.id,
    status: 'revoked' as const,
    revokedAt: now.toISOString(),
  };
}

export async function rotateReadOnlyLink(systemId: string, userId: string, linkId: string) {
  await assertSystemCapability(systemId, userId, 'links.manage');

  const [link] = await db
    .select({
      id: readOnlyPublishLinks.id,
      status: readOnlyPublishLinks.status,
    })
    .from(readOnlyPublishLinks)
    .where(and(eq(readOnlyPublishLinks.id, linkId), eq(readOnlyPublishLinks.systemId, systemId)))
    .limit(1);
  if (!link) throw new NotFoundError('Read-only link not found');
  if (link.status !== 'active') {
    throw new InvalidStateError('Only active link can be rotated');
  }

  const token = createToken();
  await db
    .update(readOnlyPublishLinks)
    .set({
      token,
    })
    .where(eq(readOnlyPublishLinks.id, link.id));

  await recordAuditEvent({
    systemId,
    actorUserId: userId,
    action: 'read_only_link.rotate',
    targetType: 'read_only_link',
    targetId: link.id,
  });

  return {
    id: link.id,
    status: 'active' as const,
    url: buildReadOnlyUrl(token),
  };
}

export async function getReadOnlyPublishedSnapshot(token: string) {
  const [link] = await db
    .select({
      id: readOnlyPublishLinks.id,
      systemId: readOnlyPublishLinks.systemId,
      versionId: readOnlyPublishLinks.versionId,
      status: readOnlyPublishLinks.status,
      expiresAt: readOnlyPublishLinks.expiresAt,
      label: readOnlyPublishLinks.label,
    })
    .from(readOnlyPublishLinks)
    .where(eq(readOnlyPublishLinks.token, token))
    .limit(1);
  if (!link) throw new NotFoundError('Read-only link not found');
  if (link.status !== 'active') throw new InvalidStateError('Read-only link is revoked');
  if (link.expiresAt && link.expiresAt.getTime() < Date.now()) {
    throw new InvalidStateError('Read-only link is expired');
  }

  const [version] = await db
    .select({
      id: systemVersions.id,
      versionNumber: systemVersions.versionNumber,
      label: systemVersions.label,
      notes: systemVersions.notes,
      sourceRevision: systemVersions.sourceRevision,
      publishedAt: systemVersions.publishedAt,
      snapshot: systemVersions.snapshot,
    })
    .from(systemVersions)
    .where(and(eq(systemVersions.id, link.versionId), eq(systemVersions.systemId, link.systemId)))
    .limit(1);
  if (!version) throw new NotFoundError('Published version not found');

  const now = new Date();
  await db
    .update(readOnlyPublishLinks)
    .set({
      lastAccessAt: now,
    })
    .where(eq(readOnlyPublishLinks.id, link.id));

  await recordAuditEvent({
    systemId: link.systemId,
    actorUserId: null,
    action: 'read_only_link.access',
    targetType: 'read_only_link',
    targetId: link.id,
    payload: {
      versionId: link.versionId,
    },
  });

  return {
    link: {
      id: link.id,
      systemId: link.systemId,
      versionId: link.versionId,
      label: link.label,
      accessedAt: now.toISOString(),
    },
    version: {
      id: version.id,
      versionNumber: version.versionNumber,
      label: version.label,
      notes: version.notes,
      sourceRevision: version.sourceRevision,
      publishedAt: version.publishedAt.toISOString(),
      snapshot: version.snapshot,
    },
  };
}

export async function findActiveLinkBySystemAndVersion(systemId: string, versionId: string) {
  const [link] = await db
    .select({
      id: readOnlyPublishLinks.id,
      status: readOnlyPublishLinks.status,
    })
    .from(readOnlyPublishLinks)
    .where(
      and(
        eq(readOnlyPublishLinks.systemId, systemId),
        eq(readOnlyPublishLinks.versionId, versionId),
        eq(readOnlyPublishLinks.status, 'active'),
        isNull(readOnlyPublishLinks.revokedAt),
      ),
    )
    .limit(1);
  return link ?? null;
}
