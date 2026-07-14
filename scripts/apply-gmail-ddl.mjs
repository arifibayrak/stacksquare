// One-off additive DDL for Phase 2 (Gmail sync): the connected-mailbox table.
// Idempotent: safe to re-run. Run in a real terminal:
//   node --env-file=.env.local scripts/apply-gmail-ddl.mjs
// Prod:
//   vercel env pull .env.production.local --environment=production
//   node --env-file=.env.production.local scripts/apply-gmail-ddl.mjs
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

const statements = [
  `CREATE TABLE IF NOT EXISTS "gmail_accounts" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "owner" "owner" NOT NULL,
    "email" text NOT NULL,
    "refresh_token_enc" text NOT NULL,
    "history_id" text,
    "last_sync_at" timestamptz,
    "status" text NOT NULL DEFAULT 'connected',
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "gmail_accounts_owner_idx" ON "gmail_accounts"("owner")`,
];

for (const s of statements) {
  await sql.unsafe(s);
  console.log("ok:", s.slice(0, 72).replace(/\s+/g, " "));
}

await sql.end();
console.log("done");
