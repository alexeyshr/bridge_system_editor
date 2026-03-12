import { eq } from 'drizzle-orm';

import { verifyPassword } from '../lib/auth/password';
import { closeDrizzleConnection, db } from '../lib/db/drizzle/client';
import { users } from '../lib/db/drizzle/schema';

async function main() {
  const emailInput = process.argv[2]?.trim().toLowerCase();
  const password = process.argv[3] ?? '';

  if (!emailInput || !password) {
    console.error('Usage: tsx scripts/check-credentials.ts <email> <password>');
    process.exit(1);
  }

  try {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(eq(users.email, emailInput))
      .limit(1);

    if (!user) {
      console.error(`User not found for email: ${emailInput}`);
      process.exit(1);
    }

    if (!user.passwordHash) {
      console.error(`User ${user.id} (${user.email}) has no password hash`);
      process.exit(1);
    }

    const matches = await verifyPassword(password, user.passwordHash);
    console.log(
      JSON.stringify(
        {
          userId: user.id,
          email: user.email,
          passwordMatches: matches,
        },
        null,
        2,
      ),
    );
  } finally {
    await closeDrizzleConnection();
  }
}

main().catch((error) => {
  console.error('Credential check failed:', error);
  process.exit(1);
});

