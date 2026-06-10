import Link from "next/link";
import { asc, count, eq } from "drizzle-orm";
import { db, contacts, events, venues } from "@/db";

export const dynamic = "force-dynamic";

export default async function VenuesPage() {
  const venueRows = await db
    .select({
      id: venues.id,
      name: venues.name,
      area: venues.area,
      capacity: venues.capacity,
      typicalCost: venues.typicalCost,
      contactName: contacts.name,
    })
    .from(venues)
    .leftJoin(contacts, eq(venues.contactId, contacts.id))
    .orderBy(asc(venues.name));

  const eventCountsByVenue = await db
    .select({ venueId: events.venueId, n: count() })
    .from(events)
    .groupBy(events.venueId);
  const venueEventCount = new Map(
    eventCountsByVenue.map((r) => [r.venueId, r.n]),
  );

  return (
    <div className="px-8 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Venues</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Internal address book of places we can run events. Never shown
            publicly.
          </p>
        </div>
        <Link
          href="/admin/venues/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          + New venue
        </Link>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {venueRows.map((v) => (
          <Link
            key={v.id}
            href={`/admin/venues/${v.id}`}
            className="rounded-lg border border-[var(--color-rule)] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="truncate font-medium">{v.name}</p>
              <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] tabular-nums text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                {venueEventCount.get(v.id) ?? 0} events
              </span>
            </div>
            <p className="mt-1.5 truncate font-mono text-[10px] text-zinc-400">
              {v.area ?? "No area"}
              {v.capacity ? ` · cap ${v.capacity}` : ""}
            </p>
            <p className="mt-1 truncate text-xs text-zinc-500">
              {v.typicalCost ?? ""}
              {v.typicalCost && v.contactName ? " · " : ""}
              {v.contactName ?? ""}
            </p>
          </Link>
        ))}
        {venueRows.length === 0 && (
          <p className="text-sm text-zinc-400">
            No venues yet. Add the places you can book.
          </p>
        )}
      </div>
    </div>
  );
}
