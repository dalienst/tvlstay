CREATE TABLE "password_resets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "facilities" ADD COLUMN "notify_emails" text;--> statement-breakpoint
ALTER TABLE "guest_requests" ADD COLUMN "assigned_to" text;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "requests_email" text;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "issues_email" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_changed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "password_resets_token_idx" ON "password_resets" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "password_resets_user_idx" ON "password_resets" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "guest_requests" ADD CONSTRAINT "guest_requests_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;