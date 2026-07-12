// One-off additive DDL: contacts.parked (research leads held off the pipeline).
// Run: node --env-file=.env.local scripts/apply-contacts-parked-ddl.mjs
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

const statements = [
  `ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "parked" boolean NOT NULL DEFAULT false`,
];

for (const s of statements) {
  await sql.unsafe(s);
  console.log("ok:", s.slice(0, 72).replace(/\s+/g, " "));
}

await sql.end();
console.log("done");
