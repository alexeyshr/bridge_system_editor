ALTER TABLE "bidding_systems" ADD COLUMN "creator_user_id" varchar(191);
--> statement-breakpoint
ALTER TABLE "bidding_systems" ADD COLUMN "space_id" varchar(191);
--> statement-breakpoint
INSERT INTO "spaces" (
  "id",
  "slug",
  "name",
  "description",
  "type",
  "visibility",
  "join_policy",
  "review_policy",
  "owner_user_id",
  "created_by_id",
  "created_at",
  "updated_at"
)
SELECT
  'space_personal_' || md5(bs."owner_id"),
  NULL,
  'Personal space',
  'Auto-created during system space migration',
  'personal'::"space_type",
  'hidden'::"space_visibility",
  'invite_only'::"space_join_policy",
  'none'::"space_review_policy",
  bs."owner_id",
  bs."owner_id",
  now(),
  now()
FROM (
  SELECT DISTINCT "owner_id"
  FROM "bidding_systems"
) bs
WHERE NOT EXISTS (
  SELECT 1
  FROM "spaces" s
  WHERE s."owner_user_id" = bs."owner_id"
    AND s."type" = 'personal'
);
--> statement-breakpoint
INSERT INTO "space_members" (
  "id",
  "space_id",
  "user_id",
  "role",
  "invited_by_id",
  "created_at",
  "updated_at"
)
SELECT
  'space_member_owner_' || md5(s."id" || s."owner_user_id"),
  s."id",
  s."owner_user_id",
  'owner'::"space_member_role",
  NULL,
  now(),
  now()
FROM "spaces" s
WHERE s."type" = 'personal'
  AND NOT EXISTS (
    SELECT 1
    FROM "space_members" sm
    WHERE sm."space_id" = s."id"
      AND sm."user_id" = s."owner_user_id"
  );
--> statement-breakpoint
UPDATE "bidding_systems" bs
SET
  "creator_user_id" = bs."owner_id",
  "space_id" = s."id"
FROM "spaces" s
WHERE s."owner_user_id" = bs."owner_id"
  AND s."type" = 'personal';
--> statement-breakpoint
ALTER TABLE "bidding_systems" ALTER COLUMN "creator_user_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "bidding_systems" ALTER COLUMN "space_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "bidding_systems" ADD CONSTRAINT "bidding_systems_creator_user_id_users_id_fk" FOREIGN KEY ("creator_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "bidding_systems" ADD CONSTRAINT "bidding_systems_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "bidding_systems_creator_id_idx" ON "bidding_systems" USING btree ("creator_user_id");
--> statement-breakpoint
CREATE INDEX "bidding_systems_space_id_idx" ON "bidding_systems" USING btree ("space_id");
