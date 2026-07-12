import Link from "next/link";
import { db, segments, segmentMembers } from "@/db";
import { desc, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function ResearchPage() {
  const [segs, counts] = await Promise.all([
    db.select().from(segments).orderBy(desc(segments.createdAt)).limit(200),
    db
      .select({
        segmentId: segmentMembers.segmentId,
        status: segmentMembers.status,
        n: sql<number>`count(*)::int`,
      })
      .from(segmentMembers)
      .groupBy(segmentMembers.segmentId, segmentMembers.status),
  ]);

  const total = (id: string) =>
    counts.filter((c) => c.segmentId === id).reduce((s, c) => s + c.n, 0);
  const checked = (id: string) =>
    counts.find((c) => c.segmentId === id && c.status === "qualified")?.n ?? 0;
  const promoted = (id: string) =>
    counts.find((c) => c.segmentId === id && c.status === "promoted")?.n ?? 0;

  return (
    <div className="px-8 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
            Discover
          </h1>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            Targeted people-lists. Search the web, check the good ones into your
            Database, then add them to Contacts.
          </p>
        </div>
        <Link
          href="/admin/research/new"
          className="rounded-md bg-[var(--color-ink)] px-4 py-2 text-sm font-medium text-[var(--color-paper)] hover:opacity-80"
        >
          + New list
        </Link>
      </div>

      {segs.length === 0 ? (
        <div className="mt-8 rounded-lg border border-[var(--color-rule)] bg-white px-4 py-16 text-center text-sm text-[var(--color-ink-muted)] dark:border-zinc-800 dark:bg-zinc-900">
          No lists yet.{" "}
          <Link
            href="/admin/research/new"
            className="text-brand-600 hover:underline"
          >
            Create the first one
          </Link>{" "}
          (e.g. &ldquo;Turkish founders in London&rdquo;).
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {segs.map((s) => (
            <li key={s.id}>
              <Link
                href={`/admin/research/${s.id}`}
                className="block rounded-lg border border-[var(--color-rule)] bg-white p-5 transition-colors hover:border-[var(--color-ink)] dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-medium text-[var(--color-ink)]">
                    {s.name}
                  </h2>
                  {s.archived && (
                    <span className="rounded bg-zinc-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-500 dark:bg-zinc-800">
                      Archived
                    </span>
                  )}
                </div>
                {s.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-[var(--color-ink-soft)]">
                    {s.description}
                  </p>
                )}
                <p className="mt-3 font-mono text-xs text-[var(--color-ink-muted)]">
                  {total(s.id)} people · {checked(s.id)} checked ·{" "}
                  {promoted(s.id)} in contacts
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
