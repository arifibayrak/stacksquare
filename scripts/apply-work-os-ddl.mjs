// One-off additive DDL for the central tasks work queue (Work OS, pass A).
// Run: pnpm dlx dotenv-cli -e .env.local -- node scripts/apply-work-os-ddl.mjs
// (also works: node --env-file=.env.local scripts/apply-work-os-ddl.mjs)
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

const statements = [
  `DO $$ BEGIN CREATE TYPE "task_status" AS ENUM('open','done'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `CREATE TABLE IF NOT EXISTS "tasks" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "title" text NOT NULL,
    "notes" text,
    "owner" "owner" NOT NULL,
    "created_by" "owner" NOT NULL,
    "status" "task_status" NOT NULL DEFAULT 'open',
    "priority" "priority" DEFAULT 'p2',
    "due_date" date,
    "contact_id" uuid REFERENCES "contacts"("id") ON DELETE SET NULL,
    "event_id" uuid REFERENCES "events"("id") ON DELETE SET NULL,
    "completed_at" timestamptz,
    "sort_order" integer NOT NULL DEFAULT 0,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS "tasks_owner_idx" ON "tasks"("owner")`,
  `CREATE INDEX IF NOT EXISTS "tasks_status_idx" ON "tasks"("status")`,
  `CREATE INDEX IF NOT EXISTS "tasks_due_idx" ON "tasks"("due_date")`,
  `CREATE INDEX IF NOT EXISTS "tasks_contact_idx" ON "tasks"("contact_id")`,
  `CREATE INDEX IF NOT EXISTS "tasks_event_idx" ON "tasks"("event_id")`,
];

for (const s of statements) {
  await sql.unsafe(s);
  console.log("ok:", s.slice(0, 72).replace(/\s+/g, " "));
}

await sql.end();
console.log("done");
