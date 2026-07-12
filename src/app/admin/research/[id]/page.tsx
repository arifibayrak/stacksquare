import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import {
  db,
  segments,
  segmentMembers,
  discoveryRuns,
  prospects,
  PROSPECT_ROLES,
  PROSPECT_ROLE_LABELS,
} from "@/db";
import {
  SeedForm,
  DiscoverForm,
  ProspectRow,
  SearchesPanel,
  type Row,
  type RunCard,
} from "./client";

export const dynamic = "force-dynamic";

const selectCls =
  "rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-900";

function Tab({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={
        "border-b-2 px-3 py-2 text-sm " +
        (active
          ? "border-[var(--color-ink)] font-medium text-[var(--color-ink)]"
          : "border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]")
      }
    >
      {label}
    </Link>
  );
}

export default async function SegmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    q?: string;
    role?: string;
    run?: string;
    view?: string;
  }>;
}) {
  const { id } = await params;
  const { q = "", role = "", run = "", view = "" } = await searchParams;

  const [seg] = await db.select().from(segments).where(eq(segments.id, id));
  if (!seg) notFound();

  const runs = await db
    .select()
    .from(discoveryRuns)
    .where(eq(discoveryRuns.segmentId, id))
    .orderBy(desc(discoveryRuns.seq));
  const runSeqById = new Map(runs.map((r) => [r.id, r.seq]));

  const members = await db
    .select({
      memberId: segmentMembers.id,
      tier: segmentMembers.tier,
      status: segmentMembers.status,
      runId: segmentMembers.discoveryRunId,
      p: prospects,
    })
    .from(segmentMembers)
    .innerJoin(prospects, eq(segmentMembers.prospectId, prospects.id))
    .where(eq(segmentMembers.segmentId, id))
    .orderBy(asc(prospects.name))
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
    originSignal: m.p.originSignal,
    locationSignal: m.p.locationSignal,
    email: m.p.email,
    enriched: m.p.enrichedAt != null,
    contactId: m.p.contactId,
    promoted: m.p.promotedAt != null,
    runId: m.runId,
    runSeq: m.runId ? (runSeqById.get(m.runId) ?? null) : null,
  }));

  // Dismissed people are hidden from the working views.
  const activeRows = rows.filter((r) => r.status !== "dismissed");
  const verifiedCount = rows.filter((r) => r.status === "qualified").length;
  const inContactsCount = rows.filter((r) => r.promoted).length;
  const toReviewCount = rows.filter(
    (r) => r.status === "discovered" || r.status === "enriched",
  ).length;

  // Per-run live counts + ungrouped, for the (collapsed) Searches panel.
  const liveByRun = new Map<string, number>();
  let ungroupedCount = 0;
  for (const r of rows) {
    if (r.runId) liveByRun.set(r.runId, (liveByRun.get(r.runId) ?? 0) + 1);
    else ungroupedCount++;
  }
  const runCards: RunCard[] = runs.map((r) => ({
    id: r.id,
    seq: r.seq,
    label: r.label,
    status: r.status,
    errorMessage: r.errorMessage,
    createdAt: r.createdAt.toISOString(),
    params: (r.params ?? null) as RunCard["params"],
    summary: (r.summary ?? null) as RunCard["summary"],
    notes: r.notes,
    liveCount: liveByRun.get(r.id) ?? 0,
  }));

  const checkedView = view === "checked";
  const filtered = activeRows.filter((r) => {
    if (checkedView && r.status !== "qualified") return false;
    if (run === "none" && r.runId) return false;
    if (run && run !== "none" && r.runId !== run) return false;
    if (role && !r.roles.includes(role)) return false;
    if (q) {
      const hay = `${r.name} ${r.company ?? ""} ${r.title ?? ""}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  const isFiltered = Boolean(q || role || run);
  const activeRunLabel =
    run === "none"
      ? "Ungrouped"
      : run
        ? `Search #${runSeqById.get(run) ?? "?"}`
        : "";

  const tabHref = (v: string) => {
    const sp = new URLSearchParams();
    if (v) sp.set("view", v);
    if (q) sp.set("q", q);
    if (role) sp.set("role", role);
    const qs = sp.toString();
    return `/admin/research/${seg.id}${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="px-8 py-10">
      <Link
        href="/admin/research"
        className="text-sm text-[var(--color-ink-muted)] hover:text-brand-600"
      >
        ← Discover
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
        {seg.name}
      </h1>
      {seg.description && (
        <p className="mt-1 max-w-2xl text-sm text-[var(--color-ink-soft)]">
          {seg.description}
        </p>
      )}

      {/* One-line picture */}
      <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-[var(--color-ink-soft)]">
        <span>
          <span className="font-semibold text-[var(--color-ink)]">
            {activeRows.length}
          </span>{" "}
          people
        </span>
        <span>
          <span className="font-semibold text-[var(--color-ink)]">
            {verifiedCount}
          </span>{" "}
          verified
        </span>
        <span>
          <span className="font-semibold text-[var(--color-ink)]">
            {inContactsCount}
          </span>{" "}
          in contacts
        </span>
        <span>
          <span className="font-semibold text-[var(--color-ink)]">
            {toReviewCount}
          </span>{" "}
          to review
        </span>
      </p>

      {/* Search machinery, collapsed by default */}
      <details className="mt-6 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-soft)] px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/50">
        <summary className="cursor-pointer select-none text-sm font-medium text-[var(--color-ink)]">
          Find more people (web search or paste)
        </summary>
        <div className="mt-4">
          <DiscoverForm segmentId={seg.id} />
          <div className="mt-5 border-t border-[var(--color-rule)] pt-4 dark:border-zinc-800">
            <p className="text-xs uppercase tracking-wide text-[var(--color-ink-muted)]">
              Or paste your own seeds
            </p>
            <div className="mt-2">
              <SeedForm segmentId={seg.id} />
            </div>
          </div>
          <SearchesPanel
            runs={runCards}
            segmentId={seg.id}
            ungroupedCount={ungroupedCount}
            activeRun={run}
          />
        </div>
      </details>

      {/* All / Checked */}
      <div className="mt-8 flex items-center gap-1 border-b border-[var(--color-rule)] dark:border-zinc-800">
        <Tab
          href={tabHref("")}
          active={!checkedView}
          label={`All (${activeRows.length})`}
        />
        <Tab
          href={tabHref("checked")}
          active={checkedView}
          label={`Checked (${verifiedCount})`}
        />
      </div>

      {activeRunLabel && (
        <p className="mt-4 flex items-center gap-2 text-sm text-[var(--color-ink-soft)]">
          Showing only{" "}
          <span className="font-medium text-[var(--color-ink)]">
            {activeRunLabel}
          </span>
          <Link
            href={tabHref(view)}
            className="text-brand-600 hover:underline"
          >
            (clear)
          </Link>
        </p>
      )}

      {/* Slim filter */}
      <form className="mt-4 flex flex-wrap gap-3" method="get">
        {view && <input type="hidden" name="view" value={view} />}
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
        <button className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800">
          Filter
        </button>
      </form>

      {filtered.length === 0 ? (
        <div className="mt-6 rounded-lg border border-[var(--color-rule)] bg-white px-4 py-16 text-center text-sm text-[var(--color-ink-muted)] dark:border-zinc-800 dark:bg-zinc-900">
          {checkedView ? (
            "No verified people yet. Verify people in the All tab to build this list."
          ) : isFiltered ? (
            <>
              No matches.{" "}
              <Link
                href={tabHref(view)}
                className="text-brand-600 hover:underline"
              >
                Clear filters
              </Link>
              .
            </>
          ) : (
            "No people yet. Use “Find more people” above."
          )}
        </div>
      ) : (
        <div className="mt-6 rounded-lg border border-[var(--color-rule)] bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--color-rule)] text-left text-xs uppercase tracking-wide text-[var(--color-ink-muted)] dark:border-zinc-800">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Role / Company</th>
                <th className="px-4 py-3">Signals</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-rule)] dark:divide-zinc-800">
              {filtered.map((r) => (
                <ProspectRow
                  key={r.memberId}
                  row={r}
                  segmentId={seg.id}
                  view={checkedView ? "checked" : "all"}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-8 text-xs text-[var(--color-ink-muted)]">
        Internal research only, never shown on the public site. Verify the real
        targets, then add them to Contacts from the Checked tab. Added contacts
        stay off the pipeline until you engage.
      </p>
    </div>
  );
}
