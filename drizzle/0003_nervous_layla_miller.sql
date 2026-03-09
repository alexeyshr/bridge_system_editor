CREATE TYPE "public"."discussion_scope" AS ENUM('system', 'node');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('mention');--> statement-breakpoint
CREATE TYPE "public"."read_only_link_status" AS ENUM('active', 'revoked');--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"system_id" varchar(191),
	"actor_user_id" varchar(191),
	"action" varchar(120) NOT NULL,
	"target_type" varchar(80) NOT NULL,
	"target_id" varchar(191),
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discussion_mentions" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"system_id" varchar(191) NOT NULL,
	"thread_id" varchar(191) NOT NULL,
	"message_id" varchar(191) NOT NULL,
	"mentioned_user_id" varchar(191) NOT NULL,
	"mention_token" varchar(120) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discussion_messages" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"thread_id" varchar(191) NOT NULL,
	"system_id" varchar(191) NOT NULL,
	"body" text NOT NULL,
	"author_id" varchar(191) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"edited_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "discussion_threads" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"system_id" varchar(191) NOT NULL,
	"scope" "discussion_scope" DEFAULT 'system' NOT NULL,
	"scope_node_id" varchar(500),
	"title" varchar(240),
	"is_resolved" boolean DEFAULT false NOT NULL,
	"created_by_id" varchar(191) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_events" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"user_id" varchar(191) NOT NULL,
	"system_id" varchar(191),
	"type" "notification_type" DEFAULT 'mention' NOT NULL,
	"payload" jsonb NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "read_only_publish_links" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"system_id" varchar(191) NOT NULL,
	"version_id" varchar(191) NOT NULL,
	"token" varchar(191) NOT NULL,
	"label" varchar(120),
	"status" "read_only_link_status" DEFAULT 'active' NOT NULL,
	"created_by_id" varchar(191) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"last_access_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "share_invites" ADD COLUMN "revoked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_system_id_bidding_systems_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."bidding_systems"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_mentions" ADD CONSTRAINT "discussion_mentions_system_id_bidding_systems_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."bidding_systems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_mentions" ADD CONSTRAINT "discussion_mentions_thread_id_discussion_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."discussion_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_mentions" ADD CONSTRAINT "discussion_mentions_message_id_discussion_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."discussion_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_mentions" ADD CONSTRAINT "discussion_mentions_mentioned_user_id_users_id_fk" FOREIGN KEY ("mentioned_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_messages" ADD CONSTRAINT "discussion_messages_thread_id_discussion_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."discussion_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_messages" ADD CONSTRAINT "discussion_messages_system_id_bidding_systems_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."bidding_systems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_messages" ADD CONSTRAINT "discussion_messages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_system_id_bidding_systems_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."bidding_systems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_events" ADD CONSTRAINT "notification_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_events" ADD CONSTRAINT "notification_events_system_id_bidding_systems_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."bidding_systems"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "read_only_publish_links" ADD CONSTRAINT "read_only_publish_links_system_id_bidding_systems_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."bidding_systems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "read_only_publish_links" ADD CONSTRAINT "read_only_publish_links_version_id_system_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."system_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "read_only_publish_links" ADD CONSTRAINT "read_only_publish_links_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_system_action_idx" ON "audit_events" USING btree ("system_id","action");--> statement-breakpoint
CREATE INDEX "audit_events_actor_idx" ON "audit_events" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "audit_events_created_at_idx" ON "audit_events" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "discussion_mentions_message_user_unique" ON "discussion_mentions" USING btree ("message_id","mentioned_user_id");--> statement-breakpoint
CREATE INDEX "discussion_mentions_mentioned_user_idx" ON "discussion_mentions" USING btree ("mentioned_user_id");--> statement-breakpoint
CREATE INDEX "discussion_messages_thread_created_idx" ON "discussion_messages" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE INDEX "discussion_messages_system_created_idx" ON "discussion_messages" USING btree ("system_id","created_at");--> statement-breakpoint
CREATE INDEX "discussion_messages_author_idx" ON "discussion_messages" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "discussion_threads_system_scope_idx" ON "discussion_threads" USING btree ("system_id","scope");--> statement-breakpoint
CREATE INDEX "discussion_threads_system_node_idx" ON "discussion_threads" USING btree ("system_id","scope_node_id");--> statement-breakpoint
CREATE INDEX "discussion_threads_created_by_idx" ON "discussion_threads" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX "notification_events_user_read_idx" ON "notification_events" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE INDEX "notification_events_system_idx" ON "notification_events" USING btree ("system_id");--> statement-breakpoint
CREATE UNIQUE INDEX "read_only_publish_links_token_unique" ON "read_only_publish_links" USING btree ("token");--> statement-breakpoint
CREATE INDEX "read_only_publish_links_system_status_idx" ON "read_only_publish_links" USING btree ("system_id","status");--> statement-breakpoint
CREATE INDEX "read_only_publish_links_created_by_idx" ON "read_only_publish_links" USING btree ("created_by_id");