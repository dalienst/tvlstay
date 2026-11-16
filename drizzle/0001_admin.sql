CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" text,
	"user_email" text,
	"action" text NOT NULL,
	"details" text
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" serial PRIMARY KEY NOT NULL,
	"property_id" integer,
	"filename" text NOT NULL,
	"content_type" text NOT NULL,
	"width" integer,
	"height" integer,
	"size" integer NOT NULL,
	"data" "bytea" NOT NULL,
	"uploaded_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text NOT NULL,
	"property_id" integer,
	"outlet_id" integer,
	"active" boolean DEFAULT true NOT NULL,
	"must_change_password" boolean DEFAULT true NOT NULL,
	"last_login" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "about" text;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "video_url" text;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "map_query" text;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_at_idx" ON "audit_logs" USING btree ("at");--> statement-breakpoint
CREATE INDEX "media_property_idx" ON "media" USING btree ("property_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");