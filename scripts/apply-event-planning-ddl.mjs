// One-off additive DDL for venues + event planning tables.
// Run: node --env-file=.env.local scripts/apply-event-planning-ddl.mjs
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

const statements = [
  `DO $$ BEGIN CREATE TYPE "event_target_status" AS ENUM('to_invite','invited','registered','attended','no_show'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `DO $$ BEGIN CREATE TYPE "speaker_status" AS ENUM('idea','invited','confirmed','declined'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `DO $$ BEGIN CREATE TYPE "event_task_section" AS ENUM('prep','logistics','followup'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `DO $$ BEGIN CREATE TYPE "cost_category" AS ENUM('venue','catering','speaker','marketing','other'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `CREATE TABLE IF NOT EXISTS "venues" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" text NOT NULL,
    "area" text,
    "capacity" integer,
    "typical_cost" text,
    "url" text,
    "contact_id" uuid REFERENCES "contacts"("id") ON DELETE SET NULL,
    "contact_fallback" text,
    "notes" text,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now()
  )`,
  `ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "venue_id" uuid REFERENCES "venues"("id") ON DELETE SET NULL`,
  `ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "target_headcount" integer`,
  `ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "catering" text`,
  `ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "av_setup" text`,
  `ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "run_of_show" text`,
  `CREATE TABLE IF NOT EXISTS "event_costs" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
    "label" text NOT NULL,
    "category" "cost_category" NOT NULL DEFAULT 'other',
    "estimated_pence" integer,
    "actual_pence" integer,
    "paid_by" "owner",
    "note" text,
    "created_at" timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS "event_costs_event_idx" ON "event_costs"("event_id")`,
  `CREATE TABLE IF NOT EXISTS "event_speakers" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
    "contact_id" uuid NOT NULL REFERENCES "contacts"("id") ON DELETE CASCADE,
    "role" text,
    "status" "speaker_status" NOT NULL DEFAULT 'idea',
    "note" text,
    "created_at" timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS "event_speakers_event_idx" ON "event_speakers"("event_id")`,
  `CREATE TABLE IF NOT EXISTS "event_targets" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
    "contact_id" uuid NOT NULL REFERENCES "contacts"("id") ON DELETE CASCADE,
    "status" "event_target_status" NOT NULL DEFAULT 'to_invite',
    "note" text,
    "followed_up_at" timestamptz,
    "created_at" timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "event_targets_event_contact_idx" ON "event_targets"("event_id","contact_id")`,
  `CREATE INDEX IF NOT EXISTS "event_targets_event_idx" ON "event_targets"("event_id")`,
  `CREATE TABLE IF NOT EXISTS "event_tasks" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
    "section" "event_task_section" NOT NULL,
    "title" text NOT NULL,
    "owner" "owner",
    "due_date" date,
    "done" boolean NOT NULL DEFAULT false,
    "note" text,
    "sort_order" integer NOT NULL DEFAULT 0,
    "created_at" timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS "event_tasks_event_idx" ON "event_tasks"("event_id")`,
];

for (const s of statements) {
  await sql.unsafe(s);
  console.log("ok:", s.slice(0, 72).replace(/\s+/g, " "));
}

await sql.end();
console.log("done");
