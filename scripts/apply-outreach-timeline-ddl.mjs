// One-off additive DDL for the multi-channel outreach timeline.
// Phase 1 (LinkedIn DMs + manual paste): identities map, threads, timeline.
// Idempotent: safe to re-run. Run in a real terminal (needs DATABASE_URL):
//   node --env-file=.env.local scripts/apply-outreach-timeline-ddl.mjs
// For prod, pull the prod env first:
//   vercel env pull .env.production.local --environment=production
//   node --env-file=.env.production.local scripts/apply-outreach-timeline-ddl.mjs
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

const statements = [
  // New AI-run kind for the summarizer. ADD VALUE IF NOT EXISTS is idempotent.
  `ALTER TYPE "ai_run_kind" ADD VALUE IF NOT EXISTS 'summarize_outreach'`,
  `DO $$ BEGIN CREATE TYPE "outreach_source" AS ENUM('linkedin','gmail','manual'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `DO $$ BEGIN CREATE TYPE "outreach_direction" AS ENUM('outbound','inbound','mixed'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `CREATE TABLE IF NOT EXISTS "contact_identities" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "contact_id" uuid NOT NULL REFERENCES "contacts"("id") ON DELETE CASCADE,
    "kind" text NOT NULL,
    "value" text NOT NULL,
    "created_at" timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "contact_identities_kind_value_idx" ON "contact_identities"("kind","value")`,
  `CREATE INDEX IF NOT EXISTS "contact_identities_contact_idx" ON "contact_identities"("contact_id")`,
  `CREATE TABLE IF NOT EXISTS "outreach_threads" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "source" "outreach_source" NOT NULL,
    "owner" "owner" NOT NULL,
    "external_thread_id" text NOT NULL,
    "contact_id" uuid REFERENCES "contacts"("id") ON DELETE SET NULL,
    "counterpart_name" text,
    "counterpart_linkedin" text,
    "counterpart_email" text,
    "subject" text,
    "summary" text,
    "commitments" jsonb DEFAULT '[]'::jsonb,
    "next_steps" text,
    "last_message_key" text,
    "last_message_at" timestamptz,
    "message_count" integer NOT NULL DEFAULT 0,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "outreach_threads_src_owner_ext_idx" ON "outreach_threads"("source","owner","external_thread_id")`,
  `CREATE INDEX IF NOT EXISTS "outreach_threads_contact_idx" ON "outreach_threads"("contact_id")`,
  `CREATE TABLE IF NOT EXISTS "outreach_timeline" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "thread_id" uuid NOT NULL REFERENCES "outreach_threads"("id") ON DELETE CASCADE,
    "contact_id" uuid REFERENCES "contacts"("id") ON DELETE CASCADE,
    "source" "outreach_source" NOT NULL,
    "owner" "owner" NOT NULL,
    "direction" "outreach_direction" NOT NULL,
    "summary" text NOT NULL,
    "commitments" jsonb DEFAULT '[]'::jsonb,
    "next_steps" text,
    "covers_from" timestamptz,
    "covers_to" timestamptz,
    "message_count" integer,
    "model" text,
    "created_at" timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS "outreach_timeline_contact_idx" ON "outreach_timeline"("contact_id")`,
  `CREATE INDEX IF NOT EXISTS "outreach_timeline_thread_idx" ON "outreach_timeline"("thread_id")`,
];

for (const s of statements) {
  await sql.unsafe(s);
  console.log("ok:", s.slice(0, 72).replace(/\s+/g, " "));
}

await sql.end();
console.log("done");
