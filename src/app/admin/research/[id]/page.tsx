import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import {
  db,
  segments,
  segmentMembers,
  prospects,
  PROSPECT_ROLES,
  PROSPECT_ROLE_LABELS,
  PROSPECT_TIERS,
  PROSPECT_TIER_LABELS,
  PROSPECT_STATUSES,
  PROSPECT_STATUS_LABELS,
} from "@/db";
import { SeedForm, DiscoverButton, ProspectRow, type Row } from "./client";

export const dynamic = "force-dynamic";

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-[var(--color-rule)] bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-lg font-semibold text-[var(--color-ink)]">
        {value}
      </div>
      <div className="font-mono text-[10px] uppercase tracking-wide text-[var(--color-ink-muted)]">
        {label}
      </div>
    </div>
  );
}

const selectCls =
  "rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-900";

export default async function SegmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    q?: string;
    tier?: string;
    status?: string;
    role?: string;
  }>;
}) {
  const { id } = await params;
  const { q = "", tier = "", status = "", role = "" } = await searchParams;

  const [seg] = await db.select().from(segments).where(eq(segments.id, id));
  if (!seg) notFound();

  const members = await db
    .select({
      memberId: segmentMembers.id,
      tier: segmentMembers.tier,
      status: segmentMembers.status,
      p: prospects,
    })
    .from(segmentMembers)
    .innerJoin(prospects, eq(segmentMembers.prospectId, prospects.id))
    .where(eq(segmentMembers.segmentId, id))
    .orderBy(asc(segmentMembers.tier), asc(prospects.name))
    .limit(500);

  const rows: Row[] = members.map((m) => ({
    memberId: m.memberId,
    prospectId: m.p.id,
    tier: m.tier,
    status: m.status,
    name: m.p.name,
    title: m.p.title,
    company: m.p.company,
    city: m.p.city,
    linkedinUrl: m.p.linkedinUrl,
    roles: m.p.roles,
    turkishSignal: m.p.turkishSignal,
    londonSignal: m.p.londonSignal,
    email: m.p.email,
    enriched: m.p.enrichedAt != null,
    contactId: m.p.contactId,
  }));

  const byTier: Record<string, number> = { a: 0, b: 0, c: 0, untiered: 0 };
  const byStatus: Record<string, number> = {};
  const byRole: Record<string, number> = {};
  for (const r of rows) {
    if (r.tier) byTier[r.tier] = (byTier[r.tier] ?? 0) + 1;
    else byTier.untiered++;
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    for (const role of r.roles) byRole[role] = (byRole[role] ?? 0) + 1;
  }

  const filtered = rows.filter((r) => {
    if (tier && r.tier !== tier) return false;
    if (status && r.status !== status) return false;
    if (role && !r.roles.includes(role)) return false;
    if (q) {
      const hay = `${r.name} ${r.company ?? ""} ${r.title ?? ""}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  const isFiltered = Boolean(q || tier || status || role);

  return (
    <div className="px-8 py-10">
      <Link
        href="/admin/research"
        className="text-sm text-[var(--color-ink-muted)] hover:text-brand-600"
      >
        ← Research
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
        {seg.name}
      </h1>
      {seg.description && (
        <p className="mt-1 max-w-2xl text-sm text-[var(--color-ink-soft)]">
          {seg.description}
        </p>
      )}

      {/* The picture: counts by tier / role / status */}
      <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-6">
        <Stat label="Prospects" value={rows.length} />
        <Stat label="Tier A" value={byTier.a} />
        <Stat label="Tier B" value={byTier.b} />
        <Stat label="Tier C" value={byTier.c} />
        <Stat label="Untiered" value={byTier.untiered} />
        <Stat label="Promoted" value={byStatus.promoted ?? 0} />
      </div>
      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-ink-muted)]">
        {PROSPECT_ROLES.filter((r) => byRole[r]).map((r) => (
          <span key={r}>
            {PROSPECT_ROLE_LABELS[r]}: {byRole[r]}
          </span>
        ))}
        <span>
          {PROSPECT_STATUS_LABELS.discovered}: {byStatus.discovered ?? 0} ·{" "}
          {PROSPECT_STATUS_LABELS.qualified}: {byStatus.qualified ?? 0}
        </span>
      </p>

      {/* Discovery panel */}
      <div className="mt-8 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-soft)] p-5 dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-ink)]">
            Discover
          </h2>
          <DiscoverButton segmentId={seg.id} />
        </div>
        <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
          Web search finds people from public sources and lands them as
          &ldquo;unverified&rdquo; for you to review, enrich, then promote. Or
          paste your own seeds below.
        </p>
        <div className="mt-4">
          <SeedForm segmentId={seg.id} />
        </div>
      </div>

      {/* Filters */}
      <form className="mt-8 flex flex-wrap gap-3" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name, company, title…"
          className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <select name="role" defaultValue={role} className={selectCls}>
          <option value="">All roles</option>
          {PROSPECT_ROLES.map((r) => (
            <option key={r} value={r}>
              {PROSPECT_ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        <select name="tier" defaultValue={tier} className={selectCls}>
          <option value="">All tiers</option>
          {PROSPECT_TIERS.map((t) => (
            <option key={t} value={t}>
              {PROSPECT_TIER_LABELS[t]}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={status} className={selectCls}>
          <option value="">All statuses</option>
          {PROSPECT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {PROSPECT_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <button className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800">
          Filter
        </button>
      </form>

      {filtered.length === 0 ? (
        <div className="mt-8 rounded-lg border border-[var(--color-rule)] bg-white px-4 py-16 text-center text-sm text-[var(--color-ink-muted)] dark:border-zinc-800 dark:bg-zinc-900">
          {isFiltered ? (
            <>
              No matches.{" "}
              <Link
                href={`/admin/research/${seg.id}`}
                className="text-brand-600 hover:underline"
              >
                Clear filters
              </Link>
              .
            </>
          ) : (
            "No prospects yet. Run discovery or add seeds above."
          )}
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-[var(--color-rule)] bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--color-rule)] text-left text-xs uppercase tracking-wide text-[var(--color-ink-muted)] dark:border-zinc-800">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Role / Company</th>
                <th className="px-4 py-3">Tags</th>
                <th className="px-4 py-3">Signals</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-rule)] dark:divide-zinc-800">
              {filtered.map((r) => (
                <ProspectRow key={r.memberId} row={r} segmentId={seg.id} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-8 text-xs text-[var(--color-ink-muted)]">
        Prospects are internal research only and never appear on the public
        site. Promoting a prospect creates a contact tagged{" "}
        <span className="font-mono">research:{seg.slug}</span>; reach out 1:1
        from there.
      </p>
    </div>
  );
}
