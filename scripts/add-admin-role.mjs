import postgres from "postgres";
const sql = postgres("postgresql://bridge:e9e60d55087a295c2f97fc44787df64a@185.196.41.85:5433/bridge_editor");

// Create enum if not exists
await sql.unsafe(`
  DO $$ BEGIN
    CREATE TYPE portal_global_role AS ENUM ('user', 'teacher', 'judge', 'organizer', 'admin');
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;
`);
console.log("Enum created/exists");

// Create table if not exists
await sql.unsafe(`
  CREATE TABLE IF NOT EXISTS user_global_roles (
    id varchar(191) PRIMARY KEY,
    user_id varchar(191) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role portal_global_role NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id, role)
  );
  CREATE INDEX IF NOT EXISTS user_global_roles_user_id_idx ON user_global_roles(user_id);
`);
console.log("Table created/exists");

// Add admin role
const userId = "usr_3e266db809ca4fc98818b4417708570c";
const id = "ugr_" + crypto.randomUUID().replace(/-/g, "").slice(0, 28);
await sql.unsafe(`
  INSERT INTO user_global_roles (id, user_id, role)
  VALUES ('${id}', '${userId}', 'admin')
  ON CONFLICT (user_id, role) DO NOTHING
`);
console.log("Admin role added for shramkov.alexey@gmail.com");

await sql.end();
