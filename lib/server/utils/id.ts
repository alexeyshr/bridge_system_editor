import crypto from 'node:crypto';

export function createEntityId(prefix = 'id'): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`;
}
