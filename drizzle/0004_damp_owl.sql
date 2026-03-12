CREATE TYPE "public"."portal_global_role" AS ENUM('user', 'teacher', 'judge', 'organizer', 'admin');--> statement-breakpoint
CREATE TYPE "public"."portal_scope_type" AS ENUM('tournament', 'school');--> statement-breakpoint
CREATE TYPE "public"."portal_scoped_role" AS ENUM('teacher', 'judge', 'organizer', 'admin');--> statement-breakpoint
CREATE TABLE "user_global_roles" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"user_id" varchar(191) NOT NULL,
	"role" "portal_global_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_scoped_roles" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"user_id" varchar(191) NOT NULL,
	"scope_type" "portal_scope_type" NOT NULL,
	"scope_id" varchar(191) NOT NULL,
	"role" "portal_scoped_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_global_roles" ADD CONSTRAINT "user_global_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_scoped_roles" ADD CONSTRAINT "user_scoped_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_global_roles_user_role_unique" ON "user_global_roles" USING btree ("user_id","role");--> statement-breakpoint
CREATE INDEX "user_global_roles_user_id_idx" ON "user_global_roles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_scoped_roles_user_scope_role_unique" ON "user_scoped_roles" USING btree ("user_id","scope_type","scope_id","role");--> statement-breakpoint
CREATE INDEX "user_scoped_roles_user_scope_idx" ON "user_scoped_roles" USING btree ("user_id","scope_type","scope_id");--> statement-breakpoint
CREATE INDEX "user_scoped_roles_scope_role_idx" ON "user_scoped_roles" USING btree ("scope_type","scope_id","role");