CREATE TYPE "public"."invite_channel" AS ENUM('email', 'internal', 'telegram');--> statement-breakpoint
CREATE TYPE "public"."invite_status" AS ENUM('pending', 'accepted', 'revoked', 'expired');--> statement-breakpoint
CREATE TYPE "public"."share_role" AS ENUM('viewer', 'editor');--> statement-breakpoint
CREATE TABLE "auth_accounts" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"user_id" varchar(191) NOT NULL,
	"provider" varchar(32) NOT NULL,
	"provider_account_id" varchar(191) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bidding_nodes" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"system_id" varchar(191) NOT NULL,
	"sequence_id" varchar(500) NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_id" varchar(191) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bidding_systems" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"owner_id" varchar(191) NOT NULL,
	"title" varchar(120) NOT NULL,
	"description" text,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_id" varchar(191) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "share_invites" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"system_id" varchar(191) NOT NULL,
	"created_by_id" varchar(191) NOT NULL,
	"role" "share_role" NOT NULL,
	"channel" "invite_channel" NOT NULL,
	"target_email" varchar(255),
	"target_user_id" varchar(191),
	"target_telegram_username" varchar(64),
	"token" varchar(191) NOT NULL,
	"status" "invite_status" DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"accepted_by_id" varchar(191),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_revisions" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"system_id" varchar(191) NOT NULL,
	"revision" integer NOT NULL,
	"diff" jsonb,
	"created_by_id" varchar(191) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_shares" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"system_id" varchar(191) NOT NULL,
	"user_id" varchar(191) NOT NULL,
	"role" "share_role" DEFAULT 'viewer' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"email" varchar(255),
	"password_hash" text,
	"display_name" varchar(120),
	"telegram_username" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bidding_nodes" ADD CONSTRAINT "bidding_nodes_system_id_bidding_systems_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."bidding_systems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bidding_nodes" ADD CONSTRAINT "bidding_nodes_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bidding_systems" ADD CONSTRAINT "bidding_systems_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bidding_systems" ADD CONSTRAINT "bidding_systems_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_invites" ADD CONSTRAINT "share_invites_system_id_bidding_systems_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."bidding_systems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_invites" ADD CONSTRAINT "share_invites_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_invites" ADD CONSTRAINT "share_invites_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_invites" ADD CONSTRAINT "share_invites_accepted_by_id_users_id_fk" FOREIGN KEY ("accepted_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_revisions" ADD CONSTRAINT "system_revisions_system_id_bidding_systems_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."bidding_systems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_revisions" ADD CONSTRAINT "system_revisions_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_shares" ADD CONSTRAINT "system_shares_system_id_bidding_systems_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."bidding_systems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_shares" ADD CONSTRAINT "system_shares_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "auth_accounts_provider_account_unique" ON "auth_accounts" USING btree ("provider","provider_account_id");--> statement-breakpoint
CREATE INDEX "auth_accounts_user_id_idx" ON "auth_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bidding_nodes_system_sequence_unique" ON "bidding_nodes" USING btree ("system_id","sequence_id");--> statement-breakpoint
CREATE INDEX "bidding_nodes_system_id_idx" ON "bidding_nodes" USING btree ("system_id");--> statement-breakpoint
CREATE INDEX "bidding_nodes_updated_by_id_idx" ON "bidding_nodes" USING btree ("updated_by_id");--> statement-breakpoint
CREATE INDEX "bidding_systems_owner_id_idx" ON "bidding_systems" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "bidding_systems_updated_by_id_idx" ON "bidding_systems" USING btree ("updated_by_id");--> statement-breakpoint
CREATE UNIQUE INDEX "share_invites_token_unique" ON "share_invites" USING btree ("token");--> statement-breakpoint
CREATE INDEX "share_invites_system_status_idx" ON "share_invites" USING btree ("system_id","status");--> statement-breakpoint
CREATE INDEX "share_invites_target_user_id_idx" ON "share_invites" USING btree ("target_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "system_revisions_system_revision_unique" ON "system_revisions" USING btree ("system_id","revision");--> statement-breakpoint
CREATE INDEX "system_revisions_system_id_idx" ON "system_revisions" USING btree ("system_id");--> statement-breakpoint
CREATE UNIQUE INDEX "system_shares_system_user_unique" ON "system_shares" USING btree ("system_id","user_id");--> statement-breakpoint
CREATE INDEX "system_shares_system_id_idx" ON "system_shares" USING btree ("system_id");--> statement-breakpoint
CREATE INDEX "system_shares_user_id_idx" ON "system_shares" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");