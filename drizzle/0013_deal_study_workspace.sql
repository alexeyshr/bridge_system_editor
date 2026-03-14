CREATE TYPE "public"."deal_study_dd_source" AS ENUM('solver', 'import');
--> statement-breakpoint
CREATE TYPE "public"."deal_study_poll_scope" AS ENUM('auction', 'lead', 'play', 'general');
--> statement-breakpoint
CREATE TABLE "content_deal_studies" (
	"content_item_id" varchar(191) PRIMARY KEY NOT NULL,
	"board" varchar(64),
	"dealer" varchar(1) DEFAULT 'N' NOT NULL,
	"vulnerability" varchar(8) DEFAULT 'none' NOT NULL,
	"contract_level" integer,
	"contract_denom" varchar(4),
	"declarer" varchar(1),
	"doubled_state" varchar(2) DEFAULT 'none' NOT NULL,
	"result_delta" integer,
	"lead_suit" varchar(1),
	"lead_rank" varchar(2),
	"hands" jsonb DEFAULT '{"W":{"S":"","H":"","D":"","C":""},"N":{"S":"","H":"","D":"","C":""},"E":{"S":"","H":"","D":"","C":""},"S":{"S":"","H":"","D":"","C":""}}'::jsonb NOT NULL,
	"visibility_mask" jsonb DEFAULT '{"hiddenSeats":[],"hiddenCards":[]}'::jsonb NOT NULL,
	"auction_starting_seat" varchar(1) DEFAULT 'W' NOT NULL,
	"auction_sequence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"auction_notes" text,
	"narrative_markdown" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_id" varchar(191) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_deal_study_play_steps" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"content_item_id" varchar(191) NOT NULL,
	"trick_no" integer NOT NULL,
	"leader" varchar(1) NOT NULL,
	"cards" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"winner" varchar(1),
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_deal_study_dd_snapshots" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"content_item_id" varchar(191) NOT NULL,
	"source" "deal_study_dd_source" DEFAULT 'import' NOT NULL,
	"matrix" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"par" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by_id" varchar(191) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_deal_study_comments" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"content_item_id" varchar(191) NOT NULL,
	"parent_comment_id" varchar(191),
	"author_id" varchar(191) NOT NULL,
	"body" text NOT NULL,
	"anchor" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_deal_study_polls" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"content_item_id" varchar(191) NOT NULL,
	"scope" "deal_study_poll_scope" DEFAULT 'general' NOT NULL,
	"question" varchar(500) NOT NULL,
	"is_closed" boolean DEFAULT false NOT NULL,
	"created_by_id" varchar(191) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_deal_study_poll_options" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"poll_id" varchar(191) NOT NULL,
	"option_order" integer NOT NULL,
	"label" varchar(300) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_deal_study_poll_votes" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"poll_id" varchar(191) NOT NULL,
	"option_id" varchar(191) NOT NULL,
	"user_id" varchar(191) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "content_deal_studies" ADD CONSTRAINT "content_deal_studies_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content_deal_studies" ADD CONSTRAINT "content_deal_studies_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content_deal_study_play_steps" ADD CONSTRAINT "content_deal_study_play_steps_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content_deal_study_dd_snapshots" ADD CONSTRAINT "content_deal_study_dd_snapshots_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content_deal_study_dd_snapshots" ADD CONSTRAINT "content_deal_study_dd_snapshots_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content_deal_study_comments" ADD CONSTRAINT "content_deal_study_comments_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content_deal_study_comments" ADD CONSTRAINT "content_deal_study_comments_parent_comment_id_content_deal_study_comments_id_fk" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."content_deal_study_comments"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content_deal_study_comments" ADD CONSTRAINT "content_deal_study_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content_deal_study_polls" ADD CONSTRAINT "content_deal_study_polls_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content_deal_study_polls" ADD CONSTRAINT "content_deal_study_polls_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content_deal_study_poll_options" ADD CONSTRAINT "content_deal_study_poll_options_poll_id_content_deal_study_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."content_deal_study_polls"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content_deal_study_poll_votes" ADD CONSTRAINT "content_deal_study_poll_votes_poll_id_content_deal_study_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."content_deal_study_polls"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content_deal_study_poll_votes" ADD CONSTRAINT "content_deal_study_poll_votes_option_id_content_deal_study_poll_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."content_deal_study_poll_options"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content_deal_study_poll_votes" ADD CONSTRAINT "content_deal_study_poll_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "content_deal_studies_updated_by_id_idx" ON "content_deal_studies" USING btree ("updated_by_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "content_deal_study_play_steps_item_trick_unique" ON "content_deal_study_play_steps" USING btree ("content_item_id","trick_no");
--> statement-breakpoint
CREATE INDEX "content_deal_study_play_steps_item_trick_idx" ON "content_deal_study_play_steps" USING btree ("content_item_id","trick_no");
--> statement-breakpoint
CREATE INDEX "content_deal_study_dd_snapshots_item_created_idx" ON "content_deal_study_dd_snapshots" USING btree ("content_item_id","created_at");
--> statement-breakpoint
CREATE INDEX "content_deal_study_dd_snapshots_created_by_idx" ON "content_deal_study_dd_snapshots" USING btree ("created_by_id");
--> statement-breakpoint
CREATE INDEX "content_deal_study_comments_item_created_idx" ON "content_deal_study_comments" USING btree ("content_item_id","created_at");
--> statement-breakpoint
CREATE INDEX "content_deal_study_comments_parent_idx" ON "content_deal_study_comments" USING btree ("parent_comment_id");
--> statement-breakpoint
CREATE INDEX "content_deal_study_comments_author_idx" ON "content_deal_study_comments" USING btree ("author_id");
--> statement-breakpoint
CREATE INDEX "content_deal_study_polls_item_created_idx" ON "content_deal_study_polls" USING btree ("content_item_id","created_at");
--> statement-breakpoint
CREATE INDEX "content_deal_study_polls_created_by_idx" ON "content_deal_study_polls" USING btree ("created_by_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "content_deal_study_poll_options_poll_order_unique" ON "content_deal_study_poll_options" USING btree ("poll_id","option_order");
--> statement-breakpoint
CREATE INDEX "content_deal_study_poll_options_poll_idx" ON "content_deal_study_poll_options" USING btree ("poll_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "content_deal_study_poll_votes_poll_user_unique" ON "content_deal_study_poll_votes" USING btree ("poll_id","user_id");
--> statement-breakpoint
CREATE INDEX "content_deal_study_poll_votes_poll_idx" ON "content_deal_study_poll_votes" USING btree ("poll_id");
--> statement-breakpoint
CREATE INDEX "content_deal_study_poll_votes_option_idx" ON "content_deal_study_poll_votes" USING btree ("option_id");
--> statement-breakpoint
CREATE INDEX "content_deal_study_poll_votes_user_idx" ON "content_deal_study_poll_votes" USING btree ("user_id");
