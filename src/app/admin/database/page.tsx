import { and, asc, eq, isNull } from "drizzle-orm";
import { db, segments, segmentMembers, prospects } from "@/db";
import { DatabaseRow, type DbRow } from "./client";

export const dynamic = "force-dynamic";

export default async function DatabasePage() {
  // The cross-list curated pool: everyone "Checked" (status qualified) in any
  // Discover list who is not yet in Contacts. Deduped to one row per person.
  const members = await db
    .select({
      memberId: segmentMembers.id,
      segmentId: segments.id,
      segmentName: segments.name,
      p: prospects,
    })
    .from(segmentMembers)
    .innerJoin(prospects, eq(segmentMembers.prospectId, prospects.id))
    .innerJoin(segments, eq(segmentMembers.segmentId, segments.id))
    .where(
      and(
        eq(segmentMembers.status, "qualified"),
        isNull(prospects.promotedAt),
      ),
    )
    .orderBy(asc(prospects.name))
    .limit(1000);

  const byProspect = new Map<string, DbRow>();
  for (const m of members) {
    const existing = byProspect.get(m.p.id);
    if (existing) {
      if (!existing.lists.some((l) => l.id === m.segmentId)) {
        existing.lists.push({ id: m.segmentId, name: m.segmentName });
      }
      continue;
    }
    byProspect.set(m.p.id, {
      prospectId: m.p.id,
      memberId: m.memberId,
      name: m.p.name,
      title: m.p.title,
      company: m.p.company,
      city: m.p.city,
      linkedinUrl: m.p.linkedinUrl,
      roles: m.p.roles,
      originSignal: m.p.originSignal,
      locationSignal: m.p.locationSignal,
      lists: [{ id: m.segmentId, name: m.segmentName }],
    });
  }
  const rows = [...byProspect.values()];

  return (
    <div className="px-8 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
        Database
      </h1>
      <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
        The people you checked across every Discover list, pooled in one place.
        Add the ones worth engaging to Contacts, or remove them. {rows.length}{" "}
        {rows.length === 1 ? "person" : "people"}.
      </p>

      {rows.length === 0 ? (
        <div className="mt-8 rounded-lg border border-[var(--color-rule)] bg-white px-4 py-16 text-center text-sm text-[var(--color-ink-muted)] dark:border-zinc-800 dark:bg-zinc-900">
          Nothing checked yet. Open a{" "}
          <a href="/admin/research" className="text-brand-600 hover:underline">
            Discover
          </a>{" "}
          list and click <span className="font-medium">Check</span> on the people
          worth keeping.
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-lg border border-[var(--color-rule)] bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--color-rule)] text-left text-xs uppercase tracking-wide text-[var(--color-ink-muted)] dark:border-zinc-800">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Role / Company</th>
                <th className="px-4 py-3">Lists</th>
                <th className="px-4 py-3">Signals</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-rule)] dark:divide-zinc-800">
              {rows.map((r) => (
                <DatabaseRow key={r.prospectId} row={r} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
