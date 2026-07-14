// Seed contact_identities from existing contacts (linkedin_url / email / phone)
// so cross-channel matching is complete before the first Gmail sync. Idempotent:
// on-conflict-do-nothing on (kind, value). Run AFTER apply-outreach-timeline-ddl.
//   node --env-file=.env.local scripts/backfill-contact-identities.mjs
// Prod:
//   vercel env pull .env.production.local --environment=production
//   node --env-file=.env.production.local scripts/backfill-contact-identities.mjs
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

// Mirror src/lib/contacts-dedup.ts + outreach-identity.ts canonicalisation.
function canonicalLinkedin(url) {
  if (!url) return null;
  let u = String(url).trim();
  if (!u) return null;
  u = u
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/^[a-z]{2}\.linkedin\.com/i, "linkedin.com")
    .split("?")[0]
    .split("#")[0]
    .replace(/\/+$/, "")
    .toLowerCase();
  return u ? `https://${u}` : null;
}
function normalizeEmail(email) {
  if (!email) return null;
  const e = String(email).trim().toLowerCase();
  return e || null;
}
function normalizePhone(phone) {
  if (!phone) return null;
  const raw = String(phone).trim();
  if (!raw) return null;
  const hasPlus = raw.startsWith("+");
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  return hasPlus ? `+${digits}` : digits;
}

const rows = await sql`
  SELECT id, linkedin_url, email, phone FROM contacts
`;

let inserted = 0;
for (const r of rows) {
  const pairs = [
    ["linkedin", canonicalLinkedin(r.linkedin_url)],
    ["email", normalizeEmail(r.email)],
    ["phone", normalizePhone(r.phone)],
  ];
  for (const [kind, value] of pairs) {
    if (!value) continue;
    const res = await sql`
      INSERT INTO contact_identities (contact_id, kind, value)
      VALUES (${r.id}, ${kind}, ${value})
      ON CONFLICT (kind, value) DO NOTHING
    `;
    inserted += res.count ?? 0;
  }
}

console.log(`contacts scanned: ${rows.length}, identities inserted: ${inserted}`);
await sql.end();
console.log("done");
