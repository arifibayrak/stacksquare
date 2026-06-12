import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  timestamp,
  date,
  jsonb,
  boolean,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const seniorityEnum = pgEnum("seniority", [
  "peer",
  "mid",
  "senior",
  "c_suite",
]);

export const relationshipEnum = pgEnum("relationship", [
  "warm_1st",
  "warm_2nd",
  "cold",
]);

// Which ring of the network a contact sits in: people we already know,
// realistic targets, and aspirational world-class names.
export const circleEnum = pgEnum("contact_circle", [
  "inner",
  "reach",
  "moonshot",
]);

export const stageEnum = pgEnum("stage", [
  "identified",
  "researched",
  "reached_out",
  "replying",
  "booked",
  "recorded",
  "published",
  "long_term",
  "dormant",
]);

export const priorityEnum = pgEnum("priority", ["p1", "p2", "p3"]);

export const ownerEnum = pgEnum("owner", ["arif", "kerem", "both"]);

export const channelEnum = pgEnum("channel", [
  "linkedin_dm",
  "email",
  "whatsapp",
  "intro_ask",
  "in_person",
  "call",
  "other",
]);

export const submissionKindEnum = pgEnum("submission_kind", [
  "apply",
  "guest",
  "contact",
  "speaker",
  "partner",
]);

export const aiRunKindEnum = pgEnum("ai_run_kind", [
  "enrich_contact",
  "draft_outreach",
  "summarize_transcript",
  "clip_suggestions",
]);

export const eventStatusEnum = pgEnum("event_status", [
  "draft",
  "published",
  "archived",
]);

export const eventTargetStatusEnum = pgEnum("event_target_status", [
  "to_invite",
  "invited",
  "registered",
  "attended",
  "no_show",
]);

export const speakerStatusEnum = pgEnum("speaker_status", [
  "idea",
  "invited",
  "confirmed",
  "declined",
]);

export const eventTaskSectionEnum = pgEnum("event_task_section", [
  "prep",
  "logistics",
  "followup",
]);

export const costCategoryEnum = pgEnum("cost_category", [
  "venue",
  "catering",
  "speaker",
  "marketing",
  "other",
]);

export const captureStatusEnum = pgEnum("capture_status", [
  "pending",
  "promoted",
  "dismissed",
]);

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    role: text("role"),
    company: text("company"),
    city: text("city"),
    linkedinUrl: text("linkedin_url"),
    email: text("email"),
    phone: text("phone"),
    seniority: seniorityEnum("seniority"),
    expertise: text("expertise").array().default([]).notNull(),
    relationship: relationshipEnum("relationship"),
    circle: circleEnum("circle").default("reach").notNull(),
    source: text("source"),
    introducedById: uuid("introduced_by_id"),
    stage: stageEnum("stage").default("identified").notNull(),
    fitScore: integer("fit_score"),
    priority: priorityEnum("priority").default("p2"),
    owner: ownerEnum("owner"),
    nextAction: text("next_action"),
    nextActionDue: date("next_action_due"),
    lastTouchAt: timestamp("last_touch_at", { withTimezone: true }),
    notes: text("notes"),
    tags: text("tags").array().default([]).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("contacts_stage_idx").on(t.stage),
    index("contacts_owner_idx").on(t.owner),
    index("contacts_priority_idx").on(t.priority),
  ],
);

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  introducedBy: one(contacts, {
    fields: [contacts.introducedById],
    references: [contacts.id],
    relationName: "introductions",
  }),
  introductions: many(contacts, { relationName: "introductions" }),
  touchLog: many(touchLog),
  outreachLog: many(outreachLog),
}));

export const touchLog = pgTable("touch_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  contactId: uuid("contact_id")
    .notNull()
    .references(() => contacts.id, { onDelete: "cascade" }),
  channel: channelEnum("channel").notNull(),
  summary: text("summary").notNull(),
  owner: ownerEnum("owner"),
  happenedAt: timestamp("happened_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const touchLogRelations = relations(touchLog, ({ one }) => ({
  contact: one(contacts, {
    fields: [touchLog.contactId],
    references: [contacts.id],
  }),
}));

export const outreachTemplates = pgTable("outreach_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  channel: channelEnum("channel").notNull(),
  subject: text("subject"),
  body: text("body").notNull(),
  variables: text("variables").array().default([]).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const outreachLog = pgTable("outreach_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  contactId: uuid("contact_id")
    .notNull()
    .references(() => contacts.id, { onDelete: "cascade" }),
  templateId: uuid("template_id").references(() => outreachTemplates.id),
  channel: channelEnum("channel").notNull(),
  subject: text("subject"),
  body: text("body").notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
  repliedAt: timestamp("replied_at", { withTimezone: true }),
  owner: ownerEnum("owner"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const outreachLogRelations = relations(outreachLog, ({ one }) => ({
  contact: one(contacts, {
    fields: [outreachLog.contactId],
    references: [contacts.id],
  }),
  template: one(outreachTemplates, {
    fields: [outreachLog.templateId],
    references: [outreachTemplates.id],
  }),
}));

export const submissions = pgTable("submissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  kind: submissionKindEnum("kind").notNull(),
  payload: jsonb("payload").notNull(),
  triagedAt: timestamp("triaged_at", { withTimezone: true }),
  contactId: uuid("contact_id").references(() => contacts.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const subscribers = pgTable(
  "subscribers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [uniqueIndex("subscribers_email_idx").on(t.email)],
);

// Subscribers of The Quadrant (thequadrant.fm). The Quadrant public site
// writes here directly; kept separate from StackSquare's own list so the
// two audiences never mix.
export const quadrantSubscribers = pgTable(
  "quadrant_subscribers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [uniqueIndex("quadrant_subscribers_email_idx").on(t.email)],
);

// LinkedIn profiles captured by the Stacksquare Scout extension while a
// founder browses with the capture switch on. One row per profile URL;
// re-capturing the same profile refreshes the snapshot. Rows enter the
// contacts table only when promoted from the admin Scout queue.
export const captures = pgTable(
  "captures",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    linkedinUrl: text("linkedin_url").notNull(),
    name: text("name").notNull(),
    role: text("role"),
    company: text("company"),
    city: text("city"),
    headline: text("headline"),
    relationship: relationshipEnum("relationship"),
    // Raw parsed snapshot from the extension (positions, education, links).
    payload: jsonb("payload").notNull(),
    capturedBy: ownerEnum("captured_by").notNull(),
    status: captureStatusEnum("status").default("pending").notNull(),
    contactId: uuid("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    capturedAt: timestamp("captured_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("captures_linkedin_url_idx").on(t.linkedinUrl),
    index("captures_status_idx").on(t.status),
  ],
);

// Internal venue address book. Never rendered on the public site; the
// public-facing place string stays in events.location.
export const venues = pgTable("venues", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  // Neighborhood or street address, e.g. "South Kensington, London".
  area: text("area"),
  capacity: integer("capacity"),
  // Free text, e.g. "Free for students" or "GBP 200 per evening".
  typicalCost: text("typical_cost"),
  url: text("url"),
  // Venue relationship lives in the CRM when possible...
  contactId: uuid("contact_id").references(() => contacts.id, {
    onDelete: "set null",
  }),
  // ...with a free-text fallback for one-off venue managers.
  contactFallback: text("contact_fallback"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    summary: text("summary"),
    // Public lu.ma event page used for the register / deep link.
    lumaUrl: text("luma_url"),
    // Optional Luma event id, used for the checkout-button embed widget.
    lumaEventId: text("luma_event_id"),
    startAt: timestamp("start_at", { withTimezone: true }),
    location: text("location"),
    coverImage: text("cover_image"),
    // Additional public photos (recap shots etc.), rendered as a strip.
    gallery: text("gallery").array(),
    status: eventStatusEnum("status").default("draft").notNull(),
    featured: boolean("featured").default(false).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    // Internal-only planning notes, never shown on the public site.
    notes: text("notes"),
    // Internal planning: linked venue plus the fixed logistics core.
    // None of these render publicly.
    venueId: uuid("venue_id").references(() => venues.id, {
      onDelete: "set null",
    }),
    targetHeadcount: integer("target_headcount"),
    catering: text("catering"),
    avSetup: text("av_setup"),
    runOfShow: text("run_of_show"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("events_status_idx").on(t.status),
    index("events_start_idx").on(t.startAt),
  ],
);

// Budget line items per event, amounts in GBP pence.
export const eventCosts = pgTable(
  "event_costs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    category: costCategoryEnum("category").default("other").notNull(),
    estimatedPence: integer("estimated_pence"),
    // Null until the money is actually spent.
    actualPence: integer("actual_pence"),
    paidBy: ownerEnum("paid_by"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("event_costs_event_idx").on(t.eventId)],
);

export const eventSpeakers = pgTable(
  "event_speakers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    // Free text: "speaker", "moderator", "panelist".
    role: text("role"),
    status: speakerStatusEnum("status").default("idea").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("event_speakers_event_idx").on(t.eventId)],
);

// Targeted network per event: who we want in the room and where they
// stand in the invite lifecycle.
export const eventTargets = pgTable(
  "event_targets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    status: eventTargetStatusEnum("status").default("to_invite").notNull(),
    note: text("note"),
    // Stamped by the batch follow-up flow on the event page.
    followedUpAt: timestamp("followed_up_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("event_targets_event_contact_idx").on(t.eventId, t.contactId),
    index("event_targets_event_idx").on(t.eventId),
  ],
);

// Process checklist rows; prep / logistics / followup are filtered views
// of this one table. New events are seeded with a default checklist.
export const eventTasks = pgTable(
  "event_tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    section: eventTaskSectionEnum("section").notNull(),
    title: text("title").notNull(),
    owner: ownerEnum("owner"),
    dueDate: date("due_date"),
    done: boolean("done").default(false).notNull(),
    note: text("note"),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("event_tasks_event_idx").on(t.eventId)],
);

// Simple key/value store for editable site settings (e.g. the Luma calendar id)
// so operators can change them from /admin without a redeploy.
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const aiRuns = pgTable("ai_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  kind: aiRunKindEnum("kind").notNull(),
  contactId: uuid("contact_id").references(() => contacts.id),
  input: jsonb("input").notNull(),
  output: jsonb("output"),
  model: text("model").notNull(),
  tokensIn: integer("tokens_in"),
  tokensOut: integer("tokens_out"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Contact = typeof contacts.$inferSelect;
export type Capture = typeof captures.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
export type TouchLog = typeof touchLog.$inferSelect;
export type OutreachTemplate = typeof outreachTemplates.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
// Named EventItem (not Event) to avoid shadowing the DOM `Event` global.
export type EventItem = typeof events.$inferSelect;
export type NewEventItem = typeof events.$inferInsert;
export type AppSetting = typeof appSettings.$inferSelect;
export type Venue = typeof venues.$inferSelect;
export type NewVenue = typeof venues.$inferInsert;
export type EventCost = typeof eventCosts.$inferSelect;
export type EventSpeaker = typeof eventSpeakers.$inferSelect;
export type EventTarget = typeof eventTargets.$inferSelect;
export type EventTask = typeof eventTasks.$inferSelect;

export const STAGES = [
  "identified",
  "researched",
  "reached_out",
  "replying",
  "booked",
  "recorded",
  "published",
  "long_term",
  "dormant",
] as const;

export const STAGE_LABELS: Record<(typeof STAGES)[number], string> = {
  identified: "Identified",
  researched: "Researched",
  reached_out: "Reached out",
  replying: "Replying",
  booked: "Booked",
  recorded: "Recorded",
  published: "Published",
  long_term: "Long-term",
  dormant: "Dormant",
};

export const CIRCLES = ["inner", "reach", "moonshot"] as const;

export const CIRCLE_LABELS: Record<(typeof CIRCLES)[number], string> = {
  inner: "Inner circle",
  reach: "Within reach",
  moonshot: "Moonshots",
};

export const CIRCLE_DESCRIPTIONS: Record<(typeof CIRCLES)[number], string> = {
  inner: "People we know",
  reach: "People we want to meet, targeted",
  moonshot: "People we want to meet, globally amazing",
};

export const EVENT_STATUSES = ["draft", "published", "archived"] as const;

export const EVENT_STATUS_LABELS: Record<
  (typeof EVENT_STATUSES)[number],
  string
> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

export const EVENT_TARGET_STATUSES = [
  "to_invite",
  "invited",
  "registered",
  "attended",
  "no_show",
] as const;

export const EVENT_TARGET_STATUS_LABELS: Record<
  (typeof EVENT_TARGET_STATUSES)[number],
  string
> = {
  to_invite: "To invite",
  invited: "Invited",
  registered: "Registered",
  attended: "Attended",
  no_show: "No-show",
};

export const SPEAKER_STATUSES = [
  "idea",
  "invited",
  "confirmed",
  "declined",
] as const;

export const SPEAKER_STATUS_LABELS: Record<
  (typeof SPEAKER_STATUSES)[number],
  string
> = {
  idea: "Idea",
  invited: "Invited",
  confirmed: "Confirmed",
  declined: "Declined",
};

export const EVENT_TASK_SECTIONS = ["prep", "logistics", "followup"] as const;

export const EVENT_TASK_SECTION_LABELS: Record<
  (typeof EVENT_TASK_SECTIONS)[number],
  string
> = {
  prep: "Prep",
  logistics: "Logistics",
  followup: "Follow-up",
};

export const COST_CATEGORIES = [
  "venue",
  "catering",
  "speaker",
  "marketing",
  "other",
] as const;

export const COST_CATEGORY_LABELS: Record<
  (typeof COST_CATEGORIES)[number],
  string
> = {
  venue: "Venue",
  catering: "Catering",
  speaker: "Speaker",
  marketing: "Marketing",
  other: "Other",
};

export const OWNERS = ["arif", "kerem", "both"] as const;

export const OWNER_LABELS: Record<(typeof OWNERS)[number], string> = {
  arif: "Arif",
  kerem: "Kerem",
  both: "Both",
};

// app_settings key for the public Luma calendar source.
export const SETTING_LUMA_CALENDAR = "luma_calendar";
