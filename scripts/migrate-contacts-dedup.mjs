// One-time migration for the structural contact dedupe (ADR 0003).
// 1. Canonicalise existing contacts.linkedin_url + email in place.
// 2. Abort if that would create any duplicate key (it will not: the table had
//    zero duplicate groups when this was written).
// 3. Create the unique indexes contacts_email_idx + contacts_linkedin_url_idx.
//
// Run against the DB in .env.local (which is also production; see CLAUDE.md):
//   node scripts/migrate-contacts-dedup.mjs
import fs from "node:fs";
import postgres from "postgres";

const env = fs.readFileSync("./.env.local", "utf8");
const line = env.split("\n").find((l) => l.startsWith("DATABASE_URL="));
const url = line.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "");
const sql = postgres(url, { ssl: "require", max: 1 });

const canonicalLinkedin = (raw) => {
  if (!raw) return null;
  let u = raw.trim();
  if (!u) return null;
  u = u
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("?")[0]
    .split("#")[0]
    .replace(/\/+$/, "")
    .toLowerCase();
  return u ? `https://${u}` : null;
};
const normalizeEmail = (e) => (e ? e.trim().toLowerCase() || null : null);

const rows = await sql`select id, email, linkedin_url from contacts`;
console.log(`Scanning ${rows.length} contacts...`);

let liChanged = 0;
let emChanged = 0;
for (const r of rows) {
  const li = canonicalLinkedin(r.linkedin_url);
  const em = normalizeEmail(r.email);
  if (li !== r.linkedin_url) {
    await sql`update contacts set linkedin_url = ${li} where id = ${r.id}`;
    liChanged++;
  }
  if (em !== r.email) {
    await sql`update contacts set email = ${em} where id = ${r.id}`;
    emChanged++;
  }
}
console.log(`Canonicalised linkedin_url on ${liChanged} rows, email on ${emChanged} rows.`);

const liDup = await sql`
  select linkedin_url, count(*) c from contacts
  where linkedin_url is not null group by linkedin_url having count(*) > 1`;
const emDup = await sql`
  select email, count(*) c from contacts
  where email is not null group by email having count(*) > 1`;
if (liDup.length || emDup.length) {
  console.error("ABORT: duplicate keys present, not creating unique indexes.");
  console.error("linkedin collisions:", liDup);
  console.error("email collisions:", emDup);
  await sql.end();
  process.exit(1);
}

await sql`create unique index if not exists contacts_email_idx on contacts (email)`;
await sql`create unique index if not exists contacts_linkedin_url_idx on contacts (linkedin_url)`;

const idx = await sql`
  select indexname from pg_indexes
  where tablename = 'contacts'
    and indexname in ('contacts_email_idx', 'contacts_linkedin_url_idx')
  order by indexname`;
console.log("Indexes present:", idx.map((i) => i.indexname).join(", "));

await sql.end();
console.log("Migration complete.");
