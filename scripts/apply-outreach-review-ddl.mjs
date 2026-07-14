// Additive DDL: review gate for logged conversations. Captured DM logs and
// pasted chats land `pending` and only reach a contact's timeline once accepted
// in the review queue. Existing rows default `accepted` so nothing already
// logged disappears.
// Idempotent: safe to re-run. Run in a real terminal (needs DATABASE_URL):
//   node --env-file=.env.local scripts/apply-outreach-review-ddl.mjs
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

const statements = [
  `DO $$ BEGIN
     CREATE TYPE "outreach_review_status" AS ENUM('pending','accepted','dismissed');
   EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `ALTER TABLE "outreach_threads"
     ADD COLUMN IF NOT EXISTS "review_status" "outreach_review_status" NOT NULL DEFAULT 'accepted'`,
  // Existing matched threads stay accepted (already on their contact timeline).
  // Existing UNMATCHED threads that carry a summary (today's "unmatched
  // conversations") move into the new review queue instead of vanishing.
  `UPDATE "outreach_threads"
     SET "review_status" = 'pending'
     WHERE "contact_id" IS NULL AND "summary" IS NOT NULL AND "review_status" = 'accepted'`,
];

try {
  for (const stmt of statements) {
    await sql.unsafe(stmt);
    console.log("ok:", stmt.replace(/\s+/g, " ").slice(0, 72));
  }
  console.log("Done. outreach review_status applied.");
} catch (err) {
  console.error("Failed:", err);
  process.exitCode = 1;
} finally {
  await sql.end();
}
