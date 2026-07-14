// One-off additive DDL for the Luma attendee inbox (Work OS, phase 2).
// Run: pnpm dlx dotenv-cli -e .env.local -- node scripts/apply-attendees-ddl.mjs
// (also works: node --env-file=.env.local scripts/apply-attendees-ddl.mjs)
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

const statements = [
  `DO $$ BEGIN CREATE TYPE "attendee_status" AS ENUM('registered','attended','no_show'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `DO $$ BEGIN CREATE TYPE "attendee_follow_up" AS ENUM('to_contact','contacted','promoted','skip'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `ALTER TYPE "ai_run_kind" ADD VALUE IF NOT EXISTS 'parse_attendees'`,
  `CREATE TABLE IF NOT EXISTS "event_attendees" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
    "name" text NOT NULL,
    "email" text,
    "phone" text,
    "status" "attendee_status" NOT NULL DEFAULT 'registered',
    "answers" jsonb,
    "follow_up" "attendee_follow_up" NOT NULL DEFAULT 'to_contact',
    "contact_id" uuid REFERENCES "contacts"("id") ON DELETE SET NULL,
    "note" text,
    "source" text NOT NULL DEFAULT 'csv',
    "imported_at" timestamptz NOT NULL DEFAULT now(),
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "event_attendees_event_email_idx" ON "event_attendees"("event_id","email")`,
  `CREATE INDEX IF NOT EXISTS "event_attendees_event_idx" ON "event_attendees"("event_id")`,
  `CREATE INDEX IF NOT EXISTS "event_attendees_follow_idx" ON "event_attendees"("follow_up")`,
  `CREATE INDEX IF NOT EXISTS "event_attendees_contact_idx" ON "event_attendees"("contact_id")`,
];

for (const s of statements) {
  await sql.unsafe(s);
  console.log("ok:", s.slice(0, 72).replace(/\s+/g, " "));
}

await sql.end();
console.log("done");
