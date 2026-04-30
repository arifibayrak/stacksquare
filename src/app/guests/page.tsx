import { db, contacts, episodes } from "@/db";
import { eq, inArray } from "drizzle-orm";
import { SiteNav, SiteFooter } from "@/components/site-nav";

export const metadata = { title: "Guests — StackSquare" };
export const dynamic = "force-dynamic";

export default async function GuestsPage() {
  const published = await db
    .select({ guestId: episodes.guestId })
    .from(episodes)
    .where(eq(episodes.status, "published"));
  const ids = published.map((p) => p.guestId).filter((v): v is string => !!v);

  const guests =
    ids.length === 0
      ? []
      : await db.select().from(contacts).where(inArray(contacts.id, ids));

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="text-4xl font-semibold tracking-tight">Guests</h1>
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">
          The people who&rsquo;ve sat down with us.
        </p>

        {guests.length === 0 ? (
          <p className="mt-12 text-zinc-500">No guests yet — soon.</p>
        ) : (
          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {guests.map((g) => (
              <li
                key={g.id}
                className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800"
              >
                <h3 className="font-medium">{g.name}</h3>
                <p className="mt-1 text-sm text-zinc-500">
                  {g.role}
                  {g.company ? ` · ${g.company}` : ""}
                </p>
                {g.linkedinUrl && (
                  <a
                    href={g.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-block text-xs text-brand-600 hover:underline"
                  >
                    LinkedIn →
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
