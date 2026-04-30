import { db, episodes } from "@/db";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { SiteNav, SiteFooter } from "@/components/site-nav";
import { formatDate } from "@/lib/utils";

export const metadata = {
  title: "Episodes — StackSquare",
};

export const dynamic = "force-dynamic";

export default async function EpisodesPage() {
  const list = await db
    .select()
    .from(episodes)
    .where(eq(episodes.status, "published"))
    .orderBy(desc(episodes.publishDate));

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-4xl font-semibold tracking-tight">Episodes</h1>

        {list.length === 0 ? (
          <p className="mt-8 text-zinc-500">
            First episodes are recording soon. Subscribe via the apply form to
            get notified.
          </p>
        ) : (
          <ul className="mt-12 divide-y divide-zinc-200 dark:divide-zinc-800">
            {list.map((ep) => (
              <li key={ep.id} className="py-6">
                <Link href={`/episodes/${ep.slug}`} className="group block">
                  <p className="font-mono text-xs text-zinc-500">
                    {formatDate(ep.publishDate)}
                  </p>
                  <h2 className="mt-1 text-xl font-medium group-hover:text-brand-600">
                    {ep.title}
                  </h2>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
