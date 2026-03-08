-- Rollback script for drizzle/0000_sleepy_odin.sql
-- Execute manually if initial migration must be reverted.

DROP TABLE IF EXISTS "system_revisions" CASCADE;
DROP TABLE IF EXISTS "share_invites" CASCADE;
DROP TABLE IF EXISTS "system_shares" CASCADE;
DROP TABLE IF EXISTS "bidding_nodes" CASCADE;
DROP TABLE IF EXISTS "bidding_systems" CASCADE;
DROP TABLE IF EXISTS "auth_accounts" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;

DROP TYPE IF EXISTS "public"."invite_channel";
DROP TYPE IF EXISTS "public"."invite_status";
DROP TYPE IF EXISTS "public"."share_role";
