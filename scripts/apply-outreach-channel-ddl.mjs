// Additive DDL: record which platform (WhatsApp, email, ...) a logged
// conversation happened on. The `channel` enum already exists (used by
// outreach_log / outreach_templates), so this only adds the columns.
// Idempotent: safe to re-run. Run in a real terminal (needs DATABASE_URL):
//   node --env-file=.env.local scripts/apply-outreach-channel-ddl.mjs
// For prod, pull the prod env first:
//   vercel env pull .env.production.local --environment=production
//   node --env-file=.env.production.local scripts/apply-outreach-channel-ddl.mjs
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

const statements = [
  `ALTER TABLE "outreach_threads" ADD COLUMN IF NOT EXISTS "channel" "channel"`,
  `ALTER TABLE "outreach_timeline" ADD COLUMN IF NOT EXISTS "channel" "channel"`,
];

try {
  for (const stmt of statements) {
    await sql.unsafe(stmt);
    console.log("ok:", stmt.slice(0, 72));
  }
  console.log("Done. outreach channel columns applied.");
} catch (err) {
  console.error("Failed:", err);
  process.exitCode = 1;
} finally {
  await sql.end();
}
