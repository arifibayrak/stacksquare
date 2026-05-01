import Link from "next/link";
import {
  db,
  episodes,
  contacts,
  EPISODE_STATUSES,
  EPISODE_STATUS_LABELS,
} from "@/db";
import { desc, eq } from "drizzle-orm";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EpisodesAdminPage() {
  const list = await db
    .select({
      ep: episodes,
      guest: contacts,
    })
    .from(episodes)
    .leftJoin(contacts, eq(episodes.guestId, contacts.id))
    .orderBy(desc(episodes.updatedAt));

  const grouped = EPISODE_STATUSES.map((status) => ({
    status,
    items: list.filter((r) => r.ep.status === status),
  }));

  return (
    <div className="px-8 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Episodes</h1>
          <p className="mt-1 text-sm text-zinc-500">
            From idea to published.
          </p>
        </div>
        <Link
          href="/admin/episodes/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          + New episode
        </Link>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {grouped.map(({ status, items }) => (
          <div
            key={status}
            className="flex flex-col rounded-lg border border-[var(--color-rule)] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-rule)] px-3 py-2.5 dark:border-zinc-800">
              <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-ink)]">
                {EPISODE_STATUS_LABELS[status]}
              </h3>
              <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] tabular-nums text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                {items.length}
              </span>
            </div>
            <div className="flex flex-col gap-1.5 p-2">
              {items.map(({ ep, guest }) => (
                <Link
                  key={ep.id}
                  href={`/admin/episodes/${ep.id}`}
                  className="rounded-md border border-zinc-200 bg-white p-2.5 text-sm shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-brand-500 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <p className="truncate font-medium text-[var(--color-ink)]">
                    {ep.title}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-[var(--color-ink-muted)]">
                    {guest?.name ?? "No guest set"}
                  </p>
                  {ep.recordDate && (
                    <p className="mt-1.5 font-mono text-[10px] text-zinc-400">
                      Record {formatDate(ep.recordDate)}
                    </p>
                  )}
                </Link>
              ))}
              {items.length === 0 && (
                <p className="px-2 py-4 text-center text-[11px] text-zinc-400">
                  Empty
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
