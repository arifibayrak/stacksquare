import Link from "next/link";
import { SiteNav, SiteFooter } from "@/components/site-nav";

export const metadata = { title: "Fireside · StackSquare" };

export default function FiresidePage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p className="font-mono text-xs uppercase tracking-widest text-brand-600">
          Format B
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          The Fireside Series
        </h1>
        <p className="mt-6 text-lg text-zinc-600 dark:text-zinc-400">
          A curated room of 10 to 15 ambitious peers (students, junior
          bankers, consultants, founders), joined occasionally by a senior
          guest. One
          theme per episode, one pre-read, no script.
        </p>
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">
          Themes we want to cover: <em>Is the consulting era over?</em> ·{" "}
          <em>What an LP actually cares about</em> ·{" "}
          <em>Will agentic AI replace the junior banker?</em>
        </p>

        <div className="mt-10">
          <Link
            href="/apply"
            className="rounded-md bg-zinc-900 px-5 py-3 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Apply for the founding circle
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
