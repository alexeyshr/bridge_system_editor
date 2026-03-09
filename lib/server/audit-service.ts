import { db } from '@/lib/db/drizzle/client';
import { auditEvents } from '@/lib/db/drizzle/schema';
import { createEntityId } from '@/lib/server/utils/id';
import { logError } from './logger';

type AuditInput = {
  systemId?: string | null;
  actorUserId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  payload?: unknown;
};

export async function recordAuditEvent(input: AuditInput): Promise<void> {
  try {
    await db.insert(auditEvents).values({
      id: createEntityId('audit'),
      systemId: input.systemId ?? null,
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      payload: input.payload ?? null,
      createdAt: new Date(),
    });
  } catch (error) {
    logError({
      event: 'audit.write_failed',
      message: 'Failed to persist audit event',
      action: input.action,
      targetType: input.targetType,
      systemId: input.systemId ?? null,
      actorUserId: input.actorUserId ?? null,
      error: error instanceof Error ? error.message : 'unknown_error',
    });
  }
}
