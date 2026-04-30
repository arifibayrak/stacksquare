import Link from "next/link";
import { SiteNav, SiteFooter } from "@/components/site-nav";

export default function HomePage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-6xl px-6">
        <section className="py-24 sm:py-32">
          <p className="font-mono text-xs uppercase tracking-widest text-brand-600">
            A 2-on-1 podcast · Imperial Business School
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Strategy meets capital.
            <br />
            <span className="text-zinc-500">Unfiltered conversations.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
            Two MSc students &mdash; one from strategy, consulting and PE, one
            from VC, startups and fintech &mdash; sit down with the operators,
            investors and advisors who actually build, fund and shape modern
            businesses.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/episodes"
              className="rounded-md bg-zinc-900 px-5 py-3 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Listen to episodes
            </Link>
            <Link
              href="/about"
              className="rounded-md border border-zinc-300 px-5 py-3 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              About the show
            </Link>
          </div>
        </section>

        <section className="border-t border-zinc-200 py-16 dark:border-zinc-800">
          <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-500">
            What we cover
          </h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-3">
            <div>
              <h3 className="text-lg font-medium">Strategy block</h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Frameworks, decisions, tradeoffs. How operators and consultants
                actually think.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium">Capital block</h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Numbers, deals, financing, growth mechanics. From DCF to deal
                structure.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium">The wildcard</h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Psychology, mistakes, what they&rsquo;d tell their 25-year-old
                self.
              </p>
            </div>
          </div>
        </section>

        <section className="border-t border-zinc-200 py-16 dark:border-zinc-800">
          <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-500">
            Two formats
          </h2>
          <div className="mt-8 grid gap-12 sm:grid-cols-2">
            <article>
              <p className="font-mono text-xs text-brand-600">FORMAT A</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight">
                2-on-1 expert interviews
              </h3>
              <p className="mt-3 text-zinc-600 dark:text-zinc-400">
                45&ndash;60 minute recordings with founders, investors and
                operators. Edited to long-form plus 4&ndash;6 sharp clips.
              </p>
            </article>
            <article>
              <p className="font-mono text-xs text-brand-600">FORMAT B</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight">
                Fireside chat series
              </h3>
              <p className="mt-3 text-zinc-600 dark:text-zinc-400">
                10&ndash;15 ambitious peers, optional senior guest, one theme
                per episode. The room you&rsquo;d want to be in.
              </p>
            </article>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
