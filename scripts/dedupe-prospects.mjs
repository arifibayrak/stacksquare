// One-time dedupe of existing prospects, in place (keeps the real people).
// Groups prospects that are the same person (canonical LinkedIn OR name+company),
// picks the richest row as primary, fills its blanks + unions array fields from
// the duplicates, re-points segment memberships, then deletes the duplicates
// (their leftover memberships cascade). Idempotent: re-running finds no groups.
//
//   node scripts/dedupe-prospects.mjs           # apply
//   node scripts/dedupe-prospects.mjs --dry     # report only
import fs from "node:fs";
import postgres from "postgres";

const DRY = process.argv.includes("--dry");
const env = fs.readFileSync("./.env.local", "utf8");
const line = env.split("\n").find((l) => l.startsWith("DATABASE_URL="));
const url = line.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "");
const sql = postgres(url, { ssl: "require", max: 1 });

const canon = (u) =>
  u == null ? null : (u.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/^[a-z]{2}\.linkedin\.com/i, "linkedin.com").split("?")[0].split("#")[0].replace(/\/+$/, "").toLowerCase() || null);
const nm = (t) => (t ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const firstNonNull = (vals) => { for (const v of vals) if (v != null && v !== "") return v; return null; };
const uniq = (a) => [...new Set(a)];

const rows = await sql`select * from prospects order by created_at`;
console.log(`${rows.length} prospects total.`);

// Union-find by canonical LinkedIn and by name+company.
const parent = new Map(rows.map((r) => [r.id, r.id]));
const find = (x) => { while (parent.get(x) !== x) x = parent.get(x); return x; };
const union = (a, b) => parent.set(find(a), find(b));
const linkBy = (keyOf) => {
  const m = new Map();
  for (const r of rows) { const k = keyOf(r); if (!k) continue; (m.get(k) ?? m.set(k, []).get(k)).push(r.id); }
  for (const g of m.values()) for (let i = 1; i < g.length; i++) union(g[0], g[i]);
};
linkBy((r) => canon(r.linkedin_url));
linkBy((r) => (r.company ? `${nm(r.name)}|${nm(r.company)}` : null));
// One-time cleanup only: also join on exact full name. Safe on this curated
// list (verified no two distinct people share a name) and catches same-person
// rows whose company string drifted, e.g. "Flowla" vs "Flowla / Forte Growth".
// NOT part of the app's dedup rule, which stays LinkedIn-or-name+company.
linkBy((r) => nm(r.name) || null);

const byRoot = new Map();
for (const r of rows) (byRoot.get(find(r.id)) ?? byRoot.set(find(r.id), []).get(find(r.id))).push(r);
const groups = [...byRoot.values()].filter((g) => g.length > 1);
console.log(`${groups.length} duplicate groups (${groups.reduce((n, g) => n + g.length - 1, 0)} rows to remove).`);

// Richness rank: contact-linked > enriched > has LinkedIn > most non-null fields > oldest.
const score = (r) => {
  const fields = ["title", "company", "city", "linkedin_url", "email", "bio", "source_url"];
  const filled = fields.filter((f) => r[f] != null && r[f] !== "").length;
  return (r.contact_id ? 1000 : 0) + (r.enriched_at ? 500 : 0) + (canon(r.linkedin_url) ? 100 : 0) + filled;
};

let merged = 0;
for (const g of groups) {
  const sorted = [...g].sort((a, b) => score(b) - score(a) || new Date(a.created_at) - new Date(b.created_at));
  const primary = sorted[0];
  const dups = sorted.slice(1);
  console.log(`\n• keep: ${primary.name} [${primary.company ?? "?"}] ${canon(primary.linkedin_url) ?? "no-li"}`);
  for (const d of dups) console.log(`  drop: ${d.name} [${d.company ?? "?"}] ${canon(d.linkedin_url) ?? "no-li"}`);
  if (DRY) { merged += dups.length; continue; }

  // Fill primary blanks + union arrays + append notes (idempotently) from the
  // duplicates. Notes dedupe by substring so re-running never double-appends.
  const all = [primary, ...dups];
  const noteParts = [];
  for (const r of all) {
    const t = (r.notes ?? "").trim();
    if (t && !noteParts.some((p) => p.includes(t))) noteParts.push(t);
  }
  const set = {
    title: primary.title ?? firstNonNull(dups.map((d) => d.title)),
    company: primary.company ?? firstNonNull(dups.map((d) => d.company)),
    city: primary.city ?? firstNonNull(dups.map((d) => d.city)),
    linkedin_url: canon(primary.linkedin_url) ?? firstNonNull(dups.map((d) => canon(d.linkedin_url))),
    email: primary.email ?? firstNonNull(dups.map((d) => d.email)),
    email_confidence: primary.email_confidence ?? firstNonNull(dups.map((d) => d.email_confidence)),
    bio: primary.bio ?? firstNonNull(dups.map((d) => d.bio)),
    source_url: primary.source_url ?? firstNonNull(dups.map((d) => d.source_url)),
    origin_signal: primary.origin_signal ?? firstNonNull(dups.map((d) => d.origin_signal)),
    location_signal: primary.location_signal ?? firstNonNull(dups.map((d) => d.location_signal)),
    discovered_via: primary.discovered_via ?? firstNonNull(dups.map((d) => d.discovered_via)),
    contact_id: primary.contact_id ?? firstNonNull(dups.map((d) => d.contact_id)),
    enriched_at: primary.enriched_at ?? firstNonNull(dups.map((d) => d.enriched_at)),
    promoted_at: primary.promoted_at ?? firstNonNull(dups.map((d) => d.promoted_at)),
    roles: uniq(all.flatMap((r) => r.roles ?? [])),
    links: uniq(all.flatMap((r) => r.links ?? [])),
    notes: noteParts.join("\n\n") || null,
  };

  // Each group is atomic: fill primary, re-point/absorb memberships, delete dups.
  await sql.begin(async (tx) => {
    await tx`update prospects set
      title=${set.title}, company=${set.company}, city=${set.city}, linkedin_url=${set.linkedin_url},
      email=${set.email}, email_confidence=${set.email_confidence}, bio=${set.bio}, source_url=${set.source_url},
      origin_signal=${set.origin_signal}, location_signal=${set.location_signal}, discovered_via=${set.discovered_via},
      contact_id=${set.contact_id}, enriched_at=${set.enriched_at}, promoted_at=${set.promoted_at},
      roles=${set.roles}, links=${set.links}, notes=${set.notes}, updated_at=now()
      where id=${primary.id}`;

    // Re-point each duplicate's memberships to the primary, unless the primary
    // is already a member of that segment (then keep the primary's, carrying a
    // blank tier over from the dup; the dup's row is dropped by cascade).
    for (const d of dups) {
      const dmems = await tx`select * from segment_members where prospect_id=${d.id}`;
      for (const m of dmems) {
        const [pm] = await tx`select * from segment_members where segment_id=${m.segment_id} and prospect_id=${primary.id}`;
        if (!pm) {
          await tx`update segment_members set prospect_id=${primary.id} where id=${m.id}`;
        } else if (!pm.tier && m.tier) {
          await tx`update segment_members set tier=${m.tier}::prospect_tier where id=${pm.id}`;
        }
      }
      await tx`delete from prospects where id=${d.id}`;
    }
  });
  merged += dups.length;
}

console.log(`\n${DRY ? "[dry-run] would merge" : "Merged"} ${merged} duplicate prospects.`);
const after = await sql`select count(*)::int c from prospects`;
console.log(`Prospects now: ${after[0].c}`);
await sql.end();
