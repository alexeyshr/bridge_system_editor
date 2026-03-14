CREATE TYPE "public"."space_type" AS ENUM('personal', 'team');
--> statement-breakpoint
CREATE TYPE "public"."space_visibility" AS ENUM('public', 'hidden');
--> statement-breakpoint
CREATE TYPE "public"."space_join_policy" AS ENUM('request', 'invite_only');
--> statement-breakpoint
CREATE TYPE "public"."space_review_policy" AS ENUM('none', 'required');
--> statement-breakpoint
CREATE TYPE "public"."space_member_role" AS ENUM('owner', 'admin', 'editor', 'member');
--> statement-breakpoint
CREATE TYPE "public"."space_join_request_status" AS ENUM('pending', 'approved', 'rejected', 'cancelled');
--> statement-breakpoint
CREATE TYPE "public"."space_invite_status" AS ENUM('pending', 'accepted', 'revoked', 'expired');
--> statement-breakpoint
CREATE TABLE "spaces" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"slug" varchar(191),
	"name" varchar(120) NOT NULL,
	"description" text,
	"type" "space_type" DEFAULT 'personal' NOT NULL,
	"visibility" "space_visibility" DEFAULT 'hidden' NOT NULL,
	"join_policy" "space_join_policy" DEFAULT 'invite_only' NOT NULL,
	"review_policy" "space_review_policy" DEFAULT 'none' NOT NULL,
	"owner_user_id" varchar(191) NOT NULL,
	"created_by_id" varchar(191) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "space_members" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"space_id" varchar(191) NOT NULL,
	"user_id" varchar(191) NOT NULL,
	"role" "space_member_role" DEFAULT 'member' NOT NULL,
	"invited_by_id" varchar(191),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "space_join_requests" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"space_id" varchar(191) NOT NULL,
	"user_id" varchar(191) NOT NULL,
	"message" text,
	"status" "space_join_request_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by_id" varchar(191),
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "space_invites" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"space_id" varchar(191) NOT NULL,
	"created_by_id" varchar(191) NOT NULL,
	"role" "space_member_role" DEFAULT 'member' NOT NULL,
	"target_email" varchar(255),
	"target_user_id" varchar(191),
	"token" varchar(191) NOT NULL,
	"status" "space_invite_status" DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"accepted_by_id" varchar(191),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "space_members" ADD CONSTRAINT "space_members_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "space_members" ADD CONSTRAINT "space_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "space_members" ADD CONSTRAINT "space_members_invited_by_id_users_id_fk" FOREIGN KEY ("invited_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "space_join_requests" ADD CONSTRAINT "space_join_requests_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "space_join_requests" ADD CONSTRAINT "space_join_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "space_join_requests" ADD CONSTRAINT "space_join_requests_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "space_invites" ADD CONSTRAINT "space_invites_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "space_invites" ADD CONSTRAINT "space_invites_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "space_invites" ADD CONSTRAINT "space_invites_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "space_invites" ADD CONSTRAINT "space_invites_accepted_by_id_users_id_fk" FOREIGN KEY ("accepted_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "spaces_slug_unique" ON "spaces" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX "spaces_owner_type_idx" ON "spaces" USING btree ("owner_user_id","type");
--> statement-breakpoint
CREATE INDEX "spaces_visibility_join_idx" ON "spaces" USING btree ("visibility","join_policy");
--> statement-breakpoint
CREATE INDEX "spaces_created_by_idx" ON "spaces" USING btree ("created_by_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "space_members_space_user_unique" ON "space_members" USING btree ("space_id","user_id");
--> statement-breakpoint
CREATE INDEX "space_members_space_role_idx" ON "space_members" USING btree ("space_id","role");
--> statement-breakpoint
CREATE INDEX "space_members_user_id_idx" ON "space_members" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "space_members_invited_by_id_idx" ON "space_members" USING btree ("invited_by_id");
--> statement-breakpoint
CREATE INDEX "space_join_requests_space_status_idx" ON "space_join_requests" USING btree ("space_id","status");
--> statement-breakpoint
CREATE INDEX "space_join_requests_user_status_idx" ON "space_join_requests" USING btree ("user_id","status");
--> statement-breakpoint
CREATE INDEX "space_join_requests_space_user_idx" ON "space_join_requests" USING btree ("space_id","user_id");
--> statement-breakpoint
CREATE INDEX "space_join_requests_reviewed_by_id_idx" ON "space_join_requests" USING btree ("reviewed_by_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "space_invites_token_unique" ON "space_invites" USING btree ("token");
--> statement-breakpoint
CREATE INDEX "space_invites_space_status_idx" ON "space_invites" USING btree ("space_id","status");
--> statement-breakpoint
CREATE INDEX "space_invites_target_user_id_idx" ON "space_invites" USING btree ("target_user_id");
