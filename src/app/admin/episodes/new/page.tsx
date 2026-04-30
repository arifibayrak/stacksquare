import { db, contacts } from "@/db";
import { asc } from "drizzle-orm";
import { EpisodeForm } from "@/components/admin/episode-form";

export const dynamic = "force-dynamic";

export default async function NewEpisodePage() {
  const guests = await db
    .select({ id: contacts.id, name: contacts.name })
    .from(contacts)
    .orderBy(asc(contacts.name));

  return (
    <div className="px-8 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">New episode</h1>
      <div className="mt-8 max-w-3xl">
        <EpisodeForm guests={guests} />
      </div>
    </div>
  );
}
