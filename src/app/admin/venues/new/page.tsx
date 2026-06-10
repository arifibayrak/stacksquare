import { asc } from "drizzle-orm";
import { db, contacts } from "@/db";
import { VenueForm } from "@/components/admin/venue-form";

export const dynamic = "force-dynamic";

export default async function NewVenuePage() {
  const contactOptions = await db
    .select({ id: contacts.id, name: contacts.name, company: contacts.company })
    .from(contacts)
    .orderBy(asc(contacts.name));

  return (
    <div className="px-8 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">New venue</h1>
      <div className="mt-8 max-w-3xl">
        <VenueForm contacts={contactOptions} />
      </div>
    </div>
  );
}
