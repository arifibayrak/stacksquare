import { db, episodes, contacts } from "@/db";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { SiteNav, SiteFooter } from "@/components/site-nav";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EpisodePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [ep] = await db
    .select({
      episode: episodes,
      guest: contacts,
    })
    .from(episodes)
    .leftJoin(contacts, eq(episodes.guestId, contacts.id))
    .where(eq(episodes.slug, slug))
    .limit(1);

  if (!ep) notFound();

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p className="font-mono text-xs text-zinc-500">
          {formatDate(ep.episode.publishDate)} · {ep.guest?.name}
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          {ep.episode.title}
        </h1>

        {ep.episode.youtubeId && (
          <div className="mt-8 aspect-video overflow-hidden rounded-lg">
            <iframe
              src={`https://www.youtube.com/embed/${ep.episode.youtubeId}`}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        )}

        {ep.episode.spotifyUrl && (
          <div className="mt-4">
            <a
              href={ep.episode.spotifyUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm text-brand-600 hover:underline"
            >
              Listen on Spotify →
            </a>
          </div>
        )}

        {ep.episode.showNotes && (
          <div className="prose prose-zinc dark:prose-invert mt-12 max-w-none">
            <h2>Show notes</h2>
            <p className="whitespace-pre-line">{ep.episode.showNotes}</p>
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
