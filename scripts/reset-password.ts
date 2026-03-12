import { eq } from 'drizzle-orm';

import { hashPassword } from '../lib/auth/password';
import { closeDrizzleConnection, db } from '../lib/db/drizzle/client';
import { users } from '../lib/db/drizzle/schema';

async function main() {
  const emailInput = process.argv[2]?.trim().toLowerCase();
  const newPassword = process.argv[3] ?? '';

  if (!emailInput || !newPassword) {
    console.error('Usage: tsx scripts/reset-password.ts <email> <new-password>');
    process.exit(1);
  }

  if (newPassword.length < 8) {
    console.error('Password must be at least 8 characters long');
    process.exit(1);
  }

  try {
    const passwordHash = await hashPassword(newPassword);
    const now = new Date();

    const updated = await db
      .update(users)
      .set({
        passwordHash,
        updatedAt: now,
      })
      .where(eq(users.email, emailInput))
      .returning({
        id: users.id,
        email: users.email,
      });

    if (updated.length === 0) {
      console.error(`User not found for email: ${emailInput}`);
      process.exit(1);
    }

    console.log(`Password reset OK for user ${updated[0].id} (${updated[0].email})`);
  } finally {
    await closeDrizzleConnection();
  }
}

main().catch((error) => {
  console.error('Password reset failed:', error);
  process.exit(1);
});

