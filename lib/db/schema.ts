// ============================================================
// Data model. One database for the whole Tamarind Group:
//
//   property (Tamarind Village, Tamarind Mombasa, GKC, Dhow, Nairobi units)
//     ├─ amenities, info items (house info), rooms (per-room QR codes)
//     └─ outlet (restaurant, bar, terrace, casino, dhow, pool...)
//          ├─ opening hours
//          └─ menu (Breakfast, All Day, Specials, Wine List...), can be shared
//             with other outlets through menu_shares
//               └─ section (Starters, Salads...)
//                    └─ item (name, description, prices, tags, photo)
//
// Prices are optional: Tamarind Mombasa handwrites its prices, and the
// guest pages simply leave a blank price out.
// ============================================================
import {
  boolean,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const properties = pgTable(
  "properties",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    /** apartments, hotel, restaurant, casino, dhow */
    kind: text("kind").notNull().default("hotel"),
    city: text("city"),
    tagline: text("tagline"),
    welcome: text("welcome"),
    logoUrl: text("logo_url"),
    heroImageUrl: text("hero_image_url"),
    /** Extra photos (uploaded or pasted URLs) shown on the amenities page. */
    gallery: jsonb("gallery").$type<string[]>().notNull().default([]),
    phone: text("phone"),
    whatsapp: text("whatsapp"),
    email: text("email"),
    address: text("address"),
    /** Reception extension dialled from the room phone. */
    receptionExt: text("reception_ext"),
    /** Room service extension dialled from the room phone. */
    roomServiceExt: text("room_service_ext"),
    checkIn: text("check_in"),
    checkOut: text("check_out"),
    wifiName: text("wifi_name"),
    wifiPassword: text("wifi_password"),
    reviewUrl: text("review_url"),
    /** Guests can request services and report problems from the guide. Off until staff watch the Requests inbox. */
    requestsEnabled: boolean("requests_enabled").notNull().default(false),
    /** List this property's restaurants under "Also from Tamarind" in the other properties' guides (only while it's live). */
    showInOtherGuides: boolean("show_in_other_guides").notNull().default(true),
    /** Staff emails (comma-separated) alerted about guest requests, e.g. reception or the duty manager. */
    requestsEmail: text("requests_email"),
    /** Staff emails alerted about reported problems (Wi-Fi, AC...), e.g. maintenance. Falls back to requestsEmail. */
    issuesEmail: text("issues_email"),
    /** Longer "About" text for the home page. */
    about: text("about"),
    /** YouTube/Vimeo link or a direct .mp4 URL, shown on the home page. */
    videoUrl: text("video_url"),
    /** What to show on the map, e.g. "Tamarind Village, Mkomani Road, Mombasa". */
    mapQuery: text("map_query"),
    sortOrder: integer("sort_order").notNull().default(0),
    isPublished: boolean("is_published").notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex("properties_slug_idx").on(t.slug)],
);

export const amenities = pgTable(
  "amenities",
  {
    id: serial("id").primaryKey(),
    propertyId: integer("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    /** Icon name from components/Icon.tsx, e.g. wifi, snow, kitchen. */
    icon: text("icon").notNull().default("check"),
    title: text("title").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    isPublished: boolean("is_published").notNull().default(true),
    ...timestamps,
  },
  (t) => [index("amenities_property_idx").on(t.propertyId)],
);

/** Free-form house information: pools, laundry, house rules, transfers... */
export const infoItems = pgTable(
  "info_items",
  {
    id: serial("id").primaryKey(),
    propertyId: integer("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    icon: text("icon").notNull().default("info"),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    isPublished: boolean("is_published").notNull().default(true),
    ...timestamps,
  },
  (t) => [index("info_items_property_idx").on(t.propertyId)],
);

/** Each room gets its own QR code (/r/<code>). The code is random so room links can't be guessed. */
export const rooms = pgTable(
  "rooms",
  {
    id: serial("id").primaryKey(),
    propertyId: integer("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    code: text("code").notNull(),
    floor: text("floor"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("rooms_code_idx").on(t.code),
    uniqueIndex("rooms_property_label_idx").on(t.propertyId, t.label),
  ],
);

export const outlets = pgTable(
  "outlets",
  {
    id: serial("id").primaryKey(),
    propertyId: integer("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    /** restaurant, bar, terrace, casino, dhow, pool, spa */
    kind: text("kind").notNull().default("restaurant"),
    description: text("description"),
    imageUrl: text("image_url"),
    logoUrl: text("logo_url"),
    phone: text("phone"),
    extension: text("extension"),
    location: text("location"),
    sortOrder: integer("sort_order").notNull().default(0),
    isPublished: boolean("is_published").notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex("outlets_property_slug_idx").on(t.propertyId, t.slug)],
);

export const openingHours = pgTable(
  "opening_hours",
  {
    id: serial("id").primaryKey(),
    /** Hours belong to an outlet or to a facility (one of the two is set). */
    outletId: integer("outlet_id").references(() => outlets.id, { onDelete: "cascade" }),
    facilityId: integer("facility_id").references(() => facilities.id, { onDelete: "cascade" }),
    /** e.g. "Breakfast", "Lunch & dinner". */
    label: text("label").notNull(),
    /** Days it applies to, 0 = Sunday ... 6 = Saturday. Empty means every day. */
    days: jsonb("days").$type<number[]>().notNull().default([]),
    /** 24h "HH:MM" in Nairobi time. closes may be "24:00" for midnight. */
    opens: text("opens").notNull(),
    closes: text("closes").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("opening_hours_outlet_idx").on(t.outletId), index("opening_hours_facility_idx").on(t.facilityId)],
);

export const menus = pgTable(
  "menus",
  {
    id: serial("id").primaryKey(),
    outletId: integer("outlet_id")
      .notNull()
      .references(() => outlets.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    /** Shown under the menu name, e.g. "Served 5am to 11am". */
    servedNote: text("served_note"),
    /** Specials and seasonal menus. A menu outside its dates is hidden from guests. */
    isSpecial: boolean("is_special").notNull().default(false),
    startsOn: date("starts_on"),
    endsOn: date("ends_on"),
    /** Prices on this menu are in this currency. */
    currency: text("currency").notNull().default("KES"),
    footnote: text("footnote"),
    sortOrder: integer("sort_order").notNull().default(0),
    isPublished: boolean("is_published").notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex("menus_outlet_slug_idx").on(t.outletId, t.slug)],
);

export const menuSections = pgTable(
  "menu_sections",
  {
    id: serial("id").primaryKey(),
    menuId: integer("menu_id")
      .notNull()
      .references(() => menus.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    isPublished: boolean("is_published").notNull().default(true),
    ...timestamps,
  },
  (t) => [index("menu_sections_menu_idx").on(t.menuId)],
);

/** One price on an item. label is for variants ("Chicken", "Glass", "Platter"); amount null means not shown. */
export type ItemPrice = { label?: string; amount: number | null; /** Old price, shown struck through (sales). */ was?: number };

export const menuItems = pgTable(
  "menu_items",
  {
    id: serial("id").primaryKey(),
    sectionId: integer("section_id")
      .notNull()
      .references(() => menuSections.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    prices: jsonb("prices").$type<ItemPrice[]>().notNull().default([]),
    /** e.g. "Market price", "Ask your server". Shown when there's no amount. */
    priceNote: text("price_note"),
    /** vegetarian, vegan, spicy, seafood, gluten-free, new, signature */
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    imageUrl: text("image_url"),
    /** Sold out today: still listed, but greyed out. */
    isAvailable: boolean("is_available").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    isPublished: boolean("is_published").notNull().default(true),
    ...timestamps,
  },
  (t) => [index("menu_items_section_idx").on(t.sectionId)],
);

/**
 * A menu owned by one outlet can also be shown at others, e.g. the beverage menu
 * and wine list shared by Harbour and Tamarind Mombasa. Edit once, shows everywhere.
 */
export const menuShares = pgTable(
  "menu_shares",
  {
    id: serial("id").primaryKey(),
    menuId: integer("menu_id")
      .notNull()
      .references(() => menus.id, { onDelete: "cascade" }),
    outletId: integer("outlet_id")
      .notNull()
      .references(() => outlets.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [uniqueIndex("menu_shares_menu_outlet_idx").on(t.menuId, t.outletId)],
);

// ============================================================
// Staff, photos and the activity log (Phase 2: admin panel)
// ============================================================

/**
 * Staff accounts. role is super_admin, property_admin, requests_team or outlet_manager.
 * A property admin is tied to one property, an outlet manager to one outlet.
 */
export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull(),
    propertyId: integer("property_id").references(() => properties.id, { onDelete: "set null" }),
    outletId: integer("outlet_id").references(() => outlets.id, { onDelete: "set null" }),
    active: boolean("active").notNull().default(true),
    /** Set when an account is created or its password reset; cleared once they choose their own. */
    mustChangePassword: boolean("must_change_password").notNull().default(true),
    lastLogin: timestamp("last_login", { withTimezone: true }),
    /** Sessions started before this are signed out (set when the password changes). */
    passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    userId: text("user_id"),
    userEmail: text("user_email"),
    action: text("action").notNull(),
    details: text("details"),
  },
  (t) => [index("audit_logs_at_idx").on(t.at)],
);

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

/**
 * Uploaded photos, stored in Postgres so they work the same locally (Neon) and once
 * deployed (Railway) with no extra storage service. Resized to at most 2000px as WebP
 * on upload, so each is roughly 100 to 400 KB. Served at /media/<id>.
 */
export const media = pgTable(
  "media",
  {
    id: serial("id").primaryKey(),
    propertyId: integer("property_id").references(() => properties.id, { onDelete: "set null" }),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    width: integer("width"),
    height: integer("height"),
    size: integer("size").notNull(),
    data: bytea("data").notNull(),
    uploadedBy: text("uploaded_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("media_property_idx").on(t.propertyId)],
);

// ============================================================
// Facilities, services and guest requests (the start of the concierge)
//
//   property
//     └─ facility (Pools, Housekeeping, Gym, Spa, Laundry...)
//          └─ service (Towels, Cleaning, Dental kit, Sewing kit...) guests can request
//
//   guest_requests: a service request or a reported problem ("The Wi-Fi keeps
//   dropping"), from a room, handled by staff in the admin Requests inbox.
// ============================================================

export const facilities = pgTable(
  "facilities",
  {
    id: serial("id").primaryKey(),
    propertyId: integer("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    icon: text("icon").notNull().default("sparkle"),
    /** Short line on the facilities list. */
    summary: text("summary"),
    /** Full details on the facility page. Blank lines start new paragraphs. */
    details: text("details"),
    imageUrl: text("image_url"),
    location: text("location"),
    extension: text("extension"),
    /** Staff emails (comma-separated) alerted about this facility's requests, e.g. housekeeping@. Falls back to the property's. */
    notifyEmails: text("notify_emails"),
    sortOrder: integer("sort_order").notNull().default(0),
    isPublished: boolean("is_published").notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex("facilities_property_slug_idx").on(t.propertyId, t.slug)],
);

export const facilityServices = pgTable(
  "facility_services",
  {
    id: serial("id").primaryKey(),
    facilityId: integer("facility_id")
      .notNull()
      .references(() => facilities.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    /** Prices in KES, with options, e.g. 60 min = 5000, 90 min = 7000. Empty means no price shown. */
    prices: jsonb("prices").$type<ItemPrice[]>().notNull().default([]),
    /** e.g. "Free", "On request". Shown when there's no price, or under the prices. */
    priceNote: text("price_note"),
    imageUrl: text("image_url"),
    /** Guests can ask for it from the guide (when requests are switched on for the property). */
    isRequestable: boolean("is_requestable").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    isPublished: boolean("is_published").notNull().default(true),
    ...timestamps,
  },
  (t) => [index("facility_services_facility_idx").on(t.facilityId)],
);

/**
 * Places within a facility where staff can bring things, e.g. "Main pool" or "Rooftop pool".
 * Each has its own QR code (/s/<code>): scanning it fills in the spot on the guest's request.
 */
export const spots = pgTable(
  "spots",
  {
    id: serial("id").primaryKey(),
    facilityId: integer("facility_id")
      .notNull()
      .references(() => facilities.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    code: text("code").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [uniqueIndex("spots_code_idx").on(t.code), index("spots_facility_idx").on(t.facilityId)],
);

export const REQUEST_STATUSES = ["new", "in_progress", "done", "cancelled"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const guestRequests = pgTable(
  "guest_requests",
  {
    id: serial("id").primaryKey(),
    propertyId: integer("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    /** "service" (asked for something) or "issue" (reported a problem). */
    kind: text("kind").notNull(),
    facilityId: integer("facility_id").references(() => facilities.id, { onDelete: "set null" }),
    serviceId: integer("service_id").references(() => facilityServices.id, { onDelete: "set null" }),
    /** Copied at the time of the request so the inbox still reads well if the service is renamed or deleted. */
    title: text("title").notNull(),
    /** The option the guest picked and its price at the time, e.g. "90 min · KES 7,000". */
    option: text("option"),
    message: text("message"),
    roomId: integer("room_id").references(() => rooms.id, { onDelete: "set null" }),
    /** From the room's QR code, or typed by the guest. */
    roomLabel: text("room_label"),
    /** Where to bring it: "Room", a spot's name ("Main pool"), or what the guest typed. */
    deliverTo: text("deliver_to"),
    spotId: integer("spot_id").references(() => spots.id, { onDelete: "set null" }),
    guestName: text("guest_name"),
    /** Phone or WhatsApp, if the guest wants a call back. */
    contact: text("contact"),
    status: text("status").$type<RequestStatus>().notNull().default("new"),
    staffNote: text("staff_note"),
    /** The staff member looking after it, if someone has been assigned. */
    assignedTo: text("assigned_to").references(() => users.id, { onDelete: "set null" }),
    handledBy: text("handled_by"),
    /** Hash of the guest's IP, only to stop floods of requests. */
    sourceHash: text("source_hash"),
    ...timestamps,
  },
  (t) => [index("guest_requests_property_status_idx").on(t.propertyId, t.status), index("guest_requests_created_idx").on(t.createdAt)],
);

/** "Forgot password" links. Only a hash of the token is stored; each link works once, for an hour. */
export const passwordResets = pgTable(
  "password_resets",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("password_resets_token_idx").on(t.tokenHash), index("password_resets_user_idx").on(t.userId)],
);
