CREATE TYPE "public"."tournament_binding_scope" AS ENUM('global', 'pair', 'team');--> statement-breakpoint
CREATE TYPE "public"."tournament_binding_status" AS ENUM('active', 'frozen');--> statement-breakpoint
CREATE TABLE "system_drafts" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"system_id" varchar(191) NOT NULL,
	"base_version_id" varchar(191),
	"draft_revision" integer DEFAULT 1 NOT NULL,
	"updated_by_id" varchar(191) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_versions" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"system_id" varchar(191) NOT NULL,
	"version_number" integer NOT NULL,
	"label" varchar(120),
	"notes" text,
	"source_revision" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"published_by_id" varchar(191) NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_system_bindings" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"system_id" varchar(191) NOT NULL,
	"tournament_id" varchar(191) NOT NULL,
	"scope_type" "tournament_binding_scope" DEFAULT 'global' NOT NULL,
	"scope_id" varchar(191) DEFAULT '' NOT NULL,
	"version_id" varchar(191) NOT NULL,
	"status" "tournament_binding_status" DEFAULT 'active' NOT NULL,
	"bound_by_id" varchar(191) NOT NULL,
	"bound_at" timestamp with time zone DEFAULT now() NOT NULL,
	"frozen_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "system_drafts" ADD CONSTRAINT "system_drafts_system_id_bidding_systems_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."bidding_systems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_drafts" ADD CONSTRAINT "system_drafts_base_version_id_system_versions_id_fk" FOREIGN KEY ("base_version_id") REFERENCES "public"."system_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_drafts" ADD CONSTRAINT "system_drafts_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_versions" ADD CONSTRAINT "system_versions_system_id_bidding_systems_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."bidding_systems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_versions" ADD CONSTRAINT "system_versions_published_by_id_users_id_fk" FOREIGN KEY ("published_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_system_bindings" ADD CONSTRAINT "tournament_system_bindings_system_id_bidding_systems_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."bidding_systems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_system_bindings" ADD CONSTRAINT "tournament_system_bindings_version_id_system_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."system_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_system_bindings" ADD CONSTRAINT "tournament_system_bindings_bound_by_id_users_id_fk" FOREIGN KEY ("bound_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "system_drafts_system_unique" ON "system_drafts" USING btree ("system_id");--> statement-breakpoint
CREATE INDEX "system_drafts_base_version_id_idx" ON "system_drafts" USING btree ("base_version_id");--> statement-breakpoint
CREATE INDEX "system_drafts_updated_by_id_idx" ON "system_drafts" USING btree ("updated_by_id");--> statement-breakpoint
CREATE UNIQUE INDEX "system_versions_system_version_unique" ON "system_versions" USING btree ("system_id","version_number");--> statement-breakpoint
CREATE INDEX "system_versions_system_id_idx" ON "system_versions" USING btree ("system_id");--> statement-breakpoint
CREATE INDEX "system_versions_published_by_id_idx" ON "system_versions" USING btree ("published_by_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tournament_system_bindings_unique_scope" ON "tournament_system_bindings" USING btree ("system_id","tournament_id","scope_type","scope_id");--> statement-breakpoint
CREATE INDEX "tournament_system_bindings_system_tournament_idx" ON "tournament_system_bindings" USING btree ("system_id","tournament_id");--> statement-breakpoint
CREATE INDEX "tournament_system_bindings_version_id_idx" ON "tournament_system_bindings" USING btree ("version_id");--> statement-breakpoint
CREATE INDEX "tournament_system_bindings_bound_by_id_idx" ON "tournament_system_bindings" USING btree ("bound_by_id");