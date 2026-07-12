// Group the current ungrouped members of a segment under a "Search #0" run, so
// the pre-tracking founder set reads as a real search instead of "Ungrouped".
// Idempotent: if a seq-0 run already exists it is reused. Only tags members
// that currently have no run.
//   node scripts/backfill-search-zero.mjs
import fs from "node:fs";
import postgres from "postgres";

const SEGMENT_ID = "084746ff-c933-4783-ae85-9b1cd0a38e9d"; // Turkish Founders in London
const LABEL = "Founders";
const PARAMS = { location: "London", origin: "Turkish", roles: ["founder"], keywords: null, count: null };

const env = fs.readFileSync("./.env.local", "utf8");
const line = env.split("\n").find((l) => l.startsWith("DATABASE_URL="));
const url = line.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "");
const sql = postgres(url, { ssl: "require", max: 1 });

// The people currently in the segment with no run.
const ungrouped = await sql`
  select p.origin_signal, p.location_signal
  from segment_members sm join prospects p on p.id = sm.prospect_id
  where sm.segment_id = ${SEGMENT_ID} and sm.discovery_run_id is null`;
console.log(`Ungrouped members to backfill: ${ungrouped.length}`);
if (ungrouped.length === 0) { console.log("Nothing to do."); await sql.end(); process.exit(0); }

const tally = (key) => {
  const out = { high: 0, medium: 0, low: 0 };
  for (const r of ungrouped) { const v = r[key]; if (v === "high" || v === "medium" || v === "low") out[v]++; }
  return out;
};
const summary = {
  found: ungrouped.length,
  added: ungrouped.length,
  linked: ungrouped.length,
  dropped: 0,
  byOrigin: tally("origin_signal"),
  byLocation: tally("location_signal"),
};

// Reuse an existing seq-0 run if present, else create it.
let [run] = await sql`select id from discovery_runs where segment_id = ${SEGMENT_ID} and seq = 0`;
if (!run) {
  [run] = await sql`
    insert into discovery_runs (segment_id, seq, label, params, notes, summary, status)
    values (${SEGMENT_ID}, 0, ${LABEL}, ${sql.json(PARAMS)}, ${"Initial founder set, imported before per-search tracking."}, ${sql.json(summary)}, 'ok')
    returning id`;
  console.log(`Created Search #0 "${LABEL}" (${run.id}).`);
} else {
  await sql`update discovery_runs set label = ${LABEL}, params = ${sql.json(PARAMS)}, summary = ${sql.json(summary)} where id = ${run.id}`;
  console.log(`Reusing existing Search #0 (${run.id}).`);
}

const res = await sql`
  update segment_members set discovery_run_id = ${run.id}
  where segment_id = ${SEGMENT_ID} and discovery_run_id is null`;
console.log(`Tagged ${res.count} members into Search #0.`);

await sql.end();
console.log("Done.");
