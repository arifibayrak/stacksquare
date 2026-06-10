import { notFound } from "next/navigation";
import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { db, contacts, events, venues, EVENT_STATUS_LABELS } from "@/db";
import { formatDate } from "@/lib/utils";
import { VenueForm } from "@/components/admin/venue-form";
import { DeleteVenueButton } from "./client";

export const dynamic = "force-dynamic";

export default async function VenueDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [venue] = await db
    .select()
    .from(venues)
    .where(eq(venues.id, id))
    .limit(1);
  if (!venue) notFound();

  const [contactOptions, heldEvents] = await Promise.all([
    db
      .select({
        id: contacts.id,
        name: contacts.name,
        company: contacts.company,
      })
      .from(contacts)
      .orderBy(asc(contacts.name)),
    db
      .select({
        id: events.id,
        title: events.title,
        startAt: events.startAt,
        status: events.status,
      })
      .from(events)
      .where(eq(events.venueId, id))
      .orderBy(desc(events.startAt)),
  ]);

  const linkedContact = venue.contactId
    ? contactOptions.find((c) => c.id === venue.contactId)
    : undefined;

  return (
    <div className="px-8 py-10">
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/admin/events"
            className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            ← Events
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            {venue.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {venue.area ?? "No area set"}
            {venue.capacity ? ` · capacity ${venue.capacity}` : ""}
            {linkedContact ? (
              <>
                {" · "}
                <Link
                  href={`/admin/contacts/${linkedContact.id}`}
                  className="hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  {linkedContact.name}
                </Link>
              </>
            ) : null}
          </p>
        </div>
        <DeleteVenueButton id={venue.id} />
      </div>

      <div className="mt-10 max-w-3xl">
        <VenueForm venue={venue} contacts={contactOptions} />
      </div>

      <div className="mt-12 max-w-3xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-500">
          Events at this venue
        </p>
        <div className="mt-3 space-y-1.5">
          {heldEvents.map((e) => (
            <Link
              key={e.id}
              href={`/admin/events/${e.id}`}
              className="flex items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm hover:border-brand-500 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <span className="truncate font-medium">{e.title}</span>
              <span className="ml-3 shrink-0 font-mono text-[10px] text-zinc-400">
                {e.startAt ? formatDate(e.startAt) : "No date"} ·{" "}
                {EVENT_STATUS_LABELS[e.status]}
              </span>
            </Link>
          ))}
          {heldEvents.length === 0 && (
            <p className="text-sm text-zinc-400">No events linked yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
