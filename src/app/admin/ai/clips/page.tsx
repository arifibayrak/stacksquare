import { db, episodes, contacts } from "@/db";
import { desc, eq, isNotNull } from "drizzle-orm";
import { ClipsClient } from "./client";

export const dynamic = "force-dynamic";

export default async function ClipsPage() {
  const list = await db
    .select({
      id: episodes.id,
      title: episodes.title,
      guestName: contacts.name,
    })
    .from(episodes)
    .leftJoin(contacts, eq(episodes.guestId, contacts.id))
    .where(isNotNull(episodes.transcript))
    .orderBy(desc(episodes.recordDate));

  return (
    <div className="px-8 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">
        Clip suggestions
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Claude scans an episode transcript and pulls 4–6 punchy 45–90 second
        moments.
      </p>

      <div className="mt-8 max-w-4xl">
        <ClipsClient
          episodes={list.map((e) => ({
            id: e.id,
            label: `${e.title}${e.guestName ? " — " + e.guestName : ""}`,
          }))}
        />
      </div>
    </div>
  );
}
