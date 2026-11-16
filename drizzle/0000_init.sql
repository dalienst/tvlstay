CREATE TABLE "amenities" (
	"id" serial PRIMARY KEY NOT NULL,
	"property_id" integer NOT NULL,
	"icon" text DEFAULT 'check' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "info_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"property_id" integer NOT NULL,
	"icon" text DEFAULT 'info' NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"section_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"prices" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"price_note" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"image_url" text,
	"is_available" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"menu_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_shares" (
	"id" serial PRIMARY KEY NOT NULL,
	"menu_id" integer NOT NULL,
	"outlet_id" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menus" (
	"id" serial PRIMARY KEY NOT NULL,
	"outlet_id" integer NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"served_note" text,
	"is_special" boolean DEFAULT false NOT NULL,
	"starts_on" date,
	"ends_on" date,
	"currency" text DEFAULT 'KES' NOT NULL,
	"footnote" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opening_hours" (
	"id" serial PRIMARY KEY NOT NULL,
	"outlet_id" integer NOT NULL,
	"label" text NOT NULL,
	"days" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"opens" text NOT NULL,
	"closes" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outlets" (
	"id" serial PRIMARY KEY NOT NULL,
	"property_id" integer NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"kind" text DEFAULT 'restaurant' NOT NULL,
	"description" text,
	"image_url" text,
	"logo_url" text,
	"phone" text,
	"extension" text,
	"location" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"kind" text DEFAULT 'hotel' NOT NULL,
	"city" text,
	"tagline" text,
	"welcome" text,
	"logo_url" text,
	"hero_image_url" text,
	"gallery" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"phone" text,
	"whatsapp" text,
	"email" text,
	"address" text,
	"reception_ext" text,
	"room_service_ext" text,
	"check_in" text,
	"check_out" text,
	"wifi_name" text,
	"wifi_password" text,
	"review_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"property_id" integer NOT NULL,
	"label" text NOT NULL,
	"code" text NOT NULL,
	"floor" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "amenities" ADD CONSTRAINT "amenities_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "info_items" ADD CONSTRAINT "info_items_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_section_id_menu_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."menu_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_sections" ADD CONSTRAINT "menu_sections_menu_id_menus_id_fk" FOREIGN KEY ("menu_id") REFERENCES "public"."menus"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_shares" ADD CONSTRAINT "menu_shares_menu_id_menus_id_fk" FOREIGN KEY ("menu_id") REFERENCES "public"."menus"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_shares" ADD CONSTRAINT "menu_shares_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menus" ADD CONSTRAINT "menus_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opening_hours" ADD CONSTRAINT "opening_hours_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outlets" ADD CONSTRAINT "outlets_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "amenities_property_idx" ON "amenities" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "info_items_property_idx" ON "info_items" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "menu_items_section_idx" ON "menu_items" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX "menu_sections_menu_idx" ON "menu_sections" USING btree ("menu_id");--> statement-breakpoint
CREATE UNIQUE INDEX "menu_shares_menu_outlet_idx" ON "menu_shares" USING btree ("menu_id","outlet_id");--> statement-breakpoint
CREATE UNIQUE INDEX "menus_outlet_slug_idx" ON "menus" USING btree ("outlet_id","slug");--> statement-breakpoint
CREATE INDEX "opening_hours_outlet_idx" ON "opening_hours" USING btree ("outlet_id");--> statement-breakpoint
CREATE UNIQUE INDEX "outlets_property_slug_idx" ON "outlets" USING btree ("property_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "properties_slug_idx" ON "properties" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "rooms_code_idx" ON "rooms" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "rooms_property_label_idx" ON "rooms" USING btree ("property_id","label");