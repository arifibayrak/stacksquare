import { asc } from "drizzle-orm";
import { db, venues } from "@/db";
import { EventForm } from "@/components/admin/event-form";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  const venueList = await db
    .select({ id: venues.id, name: venues.name, capacity: venues.capacity })
    .from(venues)
    .orderBy(asc(venues.name));

  return (
    <div className="px-8 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">New event</h1>
      <div className="mt-8 max-w-3xl">
        <EventForm venues={venueList} />
      </div>
    </div>
  );
}
