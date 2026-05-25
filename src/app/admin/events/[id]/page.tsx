import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, events, EVENT_STATUS_LABELS } from "@/db";
import { EventForm } from "@/components/admin/event-form";
import { DeleteEventButton } from "./client";

export const dynamic = "force-dynamic";

export default async function EventDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, id))
    .limit(1);
  if (!event) notFound();

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
            {event.title}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">
              {EVENT_STATUS_LABELS[event.status]}
            </span>
            {event.lumaUrl ? (
              <>
                {" "}
                ·{" "}
                <a
                  href={event.lumaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  Luma page ↗
                </a>
              </>
            ) : null}
          </p>
        </div>
        <DeleteEventButton id={event.id} />
      </div>

      <div className="mt-10 max-w-4xl">
        <EventForm event={event} />
      </div>
    </div>
  );
}
