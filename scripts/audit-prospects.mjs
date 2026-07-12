// Read-only audit of prospect duplicates in research segments.
import fs from "node:fs";
import postgres from "postgres";

const env = fs.readFileSync("./.env.local", "utf8");
const line = env.split("\n").find((l) => l.startsWith("DATABASE_URL="));
const url = line.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "");
const sql = postgres(url, { ssl: "require", max: 1 });

const canon = (u) =>
  u == null ? null : (u.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("?")[0].split("#")[0].replace(/\/+$/, "").toLowerCase() || null);
const nm = (t) => (t ?? "").trim().toLowerCase().replace(/\s+/g, " ");

const segs = await sql`select id, name, slug from segments order by created_at`;
console.log("Segments:");
for (const s of segs) console.log(`  ${s.name}  [${s.slug}]  ${s.id}`);

for (const s of segs) {
  const rows = await sql`
    select p.id, p.name, p.company, p.linkedin_url, p.city, p.email,
           p.discovered_via, p.contact_id, sm.status, sm.tier
    from segment_members sm join prospects p on p.id = sm.prospect_id
    where sm.segment_id = ${s.id}
    order by p.name`;
  console.log(`\n=== ${s.name} — ${rows.length} members ===`);

  const groups = (keyOf) => {
    const m = new Map();
    for (const r of rows) {
      const k = keyOf(r);
      if (!k) continue;
      (m.get(k) ?? m.set(k, []).get(k)).push(r);
    }
    return [...m.values()].filter((g) => g.length > 1);
  };
  const byLi = groups((r) => canon(r.linkedin_url));
  const byNameCo = groups((r) => (r.company ? `${nm(r.name)}|${nm(r.company)}` : null));
  const byName = groups((r) => nm(r.name));

  const show = (label, gs) => {
    console.log(`  ${label}: ${gs.length} dup groups (${gs.reduce((n, g) => n + g.length - 1, 0)} extra rows)`);
    for (const g of gs)
      console.log("    - " + g.map((r) => `${r.name} [${r.company ?? "?"}] ${canon(r.linkedin_url) ?? "no-li"}`).join("  ||  "));
  };
  show("by canonical LinkedIn", byLi);
  show("by name+company", byNameCo);
  show("by name only", byName);

  const noLi = rows.filter((r) => !canon(r.linkedin_url)).length;
  const linkedToContact = rows.filter((r) => r.contact_id).length;
  console.log(`  no-LinkedIn prospects: ${noLi} | already linked to a contact: ${linkedToContact}`);
}

await sql.end();
