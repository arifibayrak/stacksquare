import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, asc } from "drizzle-orm";
import { db, episodes, contacts, EPISODE_STATUS_LABELS } from "@/db";
import { EpisodeForm } from "@/components/admin/episode-form";
import { DeleteEpisodeButton } from "./client";

export const dynamic = "force-dynamic";

export default async function EpisodeDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [ep] = await db.select().from(episodes).where(eq(episodes.id, id)).limit(1);
  if (!ep) notFound();

  const guests = await db
    .select({ id: contacts.id, name: contacts.name })
    .from(contacts)
    .orderBy(asc(contacts.name));

  return (
    <div className="px-8 py-10">
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/admin/episodes"
            className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            ← Episodes
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            {ep.title}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">
              {EPISODE_STATUS_LABELS[ep.status]}
            </span>{" "}
            · /episodes/{ep.slug}
          </p>
        </div>
        <DeleteEpisodeButton id={ep.id} />
      </div>

      <div className="mt-10 max-w-4xl">
        <EpisodeForm episode={ep} guests={guests} />
      </div>
    </div>
  );
}
