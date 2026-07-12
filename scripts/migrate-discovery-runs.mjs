// Additive migration for discovery-run tracking (ADR: separable searches).
// Creates discovery_runs and adds segment_members.discovery_run_id. Idempotent;
// safe to run before the code that uses them deploys.
//   node scripts/migrate-discovery-runs.mjs
import fs from "node:fs";
import postgres from "postgres";

const env = fs.readFileSync("./.env.local", "utf8");
const line = env.split("\n").find((l) => l.startsWith("DATABASE_URL="));
const url = line.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "");
const sql = postgres(url, { ssl: "require", max: 1 });

await sql`
  create table if not exists discovery_runs (
    id uuid primary key default gen_random_uuid(),
    segment_id uuid not null references segments(id) on delete cascade,
    seq integer not null,
    label text not null,
    params jsonb not null,
    notes text,
    summary jsonb,
    model text,
    status text not null default 'ok',
    error_message text,
    created_at timestamptz not null default now()
  )`;
await sql`create index if not exists discovery_runs_segment_idx on discovery_runs (segment_id)`;

await sql`
  alter table segment_members
    add column if not exists discovery_run_id uuid
    references discovery_runs(id) on delete set null`;
await sql`create index if not exists segment_members_run_idx on segment_members (discovery_run_id)`;

const cols = await sql`
  select column_name from information_schema.columns
  where table_name in ('discovery_runs','segment_members')
    and column_name in ('id','discovery_run_id') order by table_name`;
const tbl = await sql`select to_regclass('public.discovery_runs') as t`;
console.log("discovery_runs table:", tbl[0].t);
console.log("segment_members.discovery_run_id present:",
  cols.some((c) => c.column_name === "discovery_run_id"));

await sql.end();
console.log("Migration complete.");
