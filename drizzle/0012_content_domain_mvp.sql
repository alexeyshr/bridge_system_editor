CREATE TYPE "public"."content_format" AS ENUM('article', 'deal_analysis', 'auction_lesson', 'tournament_recap', 'quiz');
--> statement-breakpoint
CREATE TYPE "public"."content_visibility" AS ENUM('public', 'members_only');
--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('draft', 'published', 'archived');
--> statement-breakpoint
CREATE TYPE "public"."content_link_target" AS ENUM('system', 'tournament', 'content', 'external');
--> statement-breakpoint
CREATE TABLE "content_items" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"space_id" varchar(191) NOT NULL,
	"author_user_id" varchar(191) NOT NULL,
	"title" varchar(160) NOT NULL,
	"summary" text,
	"format" "content_format" DEFAULT 'article' NOT NULL,
	"visibility" "content_visibility" DEFAULT 'members_only' NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"blocks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"published_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"last_version_number" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_id" varchar(191) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_versions" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"content_item_id" varchar(191) NOT NULL,
	"version_number" integer NOT NULL,
	"title" varchar(160) NOT NULL,
	"summary" text,
	"format" "content_format" NOT NULL,
	"visibility" "content_visibility" NOT NULL,
	"status" "content_status" NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_by_id" varchar(191) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_tags" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"content_item_id" varchar(191) NOT NULL,
	"tag" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_links" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"content_item_id" varchar(191) NOT NULL,
	"target_type" "content_link_target" NOT NULL,
	"target_id" varchar(191),
	"url" text,
	"label" varchar(120),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content_versions" ADD CONSTRAINT "content_versions_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content_versions" ADD CONSTRAINT "content_versions_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content_tags" ADD CONSTRAINT "content_tags_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content_links" ADD CONSTRAINT "content_links_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "content_items_space_status_updated_idx" ON "content_items" USING btree ("space_id","status","updated_at");
--> statement-breakpoint
CREATE INDEX "content_items_space_visibility_status_idx" ON "content_items" USING btree ("space_id","visibility","status");
--> statement-breakpoint
CREATE INDEX "content_items_author_id_idx" ON "content_items" USING btree ("author_user_id");
--> statement-breakpoint
CREATE INDEX "content_items_updated_by_id_idx" ON "content_items" USING btree ("updated_by_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "content_versions_item_version_unique" ON "content_versions" USING btree ("content_item_id","version_number");
--> statement-breakpoint
CREATE INDEX "content_versions_item_created_idx" ON "content_versions" USING btree ("content_item_id","created_at");
--> statement-breakpoint
CREATE INDEX "content_versions_created_by_id_idx" ON "content_versions" USING btree ("created_by_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "content_tags_item_tag_unique" ON "content_tags" USING btree ("content_item_id","tag");
--> statement-breakpoint
CREATE INDEX "content_tags_tag_idx" ON "content_tags" USING btree ("tag");
--> statement-breakpoint
CREATE INDEX "content_links_item_target_idx" ON "content_links" USING btree ("content_item_id","target_type","target_id");
