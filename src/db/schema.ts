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

export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    // Short teaser shown as the card lead.
    summary: text("summary"),
    // Full event details (speakers, agenda, etc.), shown below the summary.
    description: text("description"),
    // Public lu.ma event page used for the register / deep link.
    lumaUrl: text("luma_url"),
    // Optional Luma event id, used for the checkout-button embed widget.
    lumaEventId: text("luma_event_id"),
    startAt: timestamp("start_at", { withTimezone: true }),
    location: text("location"),
    coverImage: text("cover_image"),
    status: eventStatusEnum("status").default("draft").notNull(),
    featured: boolean("featured").default(false).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    // Internal-only planning notes, never shown on the public site.
    notes: text("notes"),
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
export type NewContact = typeof contacts.$inferInsert;
export type TouchLog = typeof touchLog.$inferSelect;
export type OutreachTemplate = typeof outreachTemplates.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
// Named EventItem (not Event) to avoid shadowing the DOM `Event` global.
export type EventItem = typeof events.$inferSelect;
export type NewEventItem = typeof events.$inferInsert;
export type AppSetting = typeof appSettings.$inferSelect;

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

export const EVENT_STATUSES = ["draft", "published", "archived"] as const;

export const EVENT_STATUS_LABELS: Record<
  (typeof EVENT_STATUSES)[number],
  string
> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

// app_settings key for the public Luma calendar source.
export const SETTING_LUMA_CALENDAR = "luma_calendar";
