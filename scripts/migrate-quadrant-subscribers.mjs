// One-off: create quadrant_subscribers (additive, idempotent) and copy
// subscriber rows from the old Quadrant v1 database.
// Run with: SOURCE_DATABASE_URL=<v1 url> DATABASE_URL=<stacksquare url> node scripts/migrate-quadrant-subscribers.mjs
import postgres from "postgres";

const dest = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
const src = postgres(process.env.SOURCE_DATABASE_URL, { prepare: false, max: 1 });

await dest`
  CREATE TABLE IF NOT EXISTS quadrant_subscribers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`;
await dest`
  CREATE UNIQUE INDEX IF NOT EXISTS quadrant_subscribers_email_idx
  ON quadrant_subscribers (email)`;

const rows = await src`SELECT email, created_at FROM subscribers`;
console.log("source rows:", rows.length);

let copied = 0;
for (const row of rows) {
  const result = await dest`
    INSERT INTO quadrant_subscribers (email, created_at)
    VALUES (${row.email}, ${row.created_at})
    ON CONFLICT (email) DO NOTHING`;
  copied += result.count;
}

const total = await dest`SELECT count(*)::int AS n FROM quadrant_subscribers`;
console.log("copied:", copied, "| total in destination:", total[0].n);

await src.end();
await dest.end();
