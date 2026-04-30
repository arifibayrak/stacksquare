import { SiteNav, SiteFooter } from "@/components/site-nav";

export const metadata = {
  title: "About — StackSquare",
};

export default function AboutPage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-4xl font-semibold tracking-tight">About</h1>
        <p className="mt-6 text-lg text-zinc-600 dark:text-zinc-400">
          StackSquare is a 2-on-1 podcast and fireside series built by two MSc
          Economics &amp; Strategy students at Imperial Business School.
        </p>

        <div className="mt-16 space-y-12">
          <section>
            <p className="font-mono text-xs uppercase tracking-widest text-brand-600">
              Co-founder
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Arif İsmail Bayrak</h2>
            <p className="mt-3 text-zinc-600 dark:text-zinc-400">
              Background in venture capital, M&amp;A and AI. Internships at
              Roche, UptoRaise Venture Studio and Basehub Consultancy.
              VC&amp;PE Society at Imperial. Builds AI tools for VC workflows.
              Boğaziçi MIS alumnus.
            </p>
            <p className="mt-3 text-zinc-600 dark:text-zinc-400">
              On the show, Arif leads <em>the Capital block</em> &mdash; the
              numbers, deals, financing and growth mechanics.
            </p>
          </section>

          <section>
            <p className="font-mono text-xs uppercase tracking-widest text-brand-600">
              Co-founder
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Kerem Ozkefeli</h2>
            <p className="mt-3 text-zinc-600 dark:text-zinc-400">
              Strategy consulting at Dialectica (Montreal); facilitated 2,000+
              C-suite expert calls. Project Lead at 180 Degrees Consulting. PE
              analyst at Brickworks Capital. McGill BA in Economics with a
              minor in Psychology. Koç School alumnus.
            </p>
            <p className="mt-3 text-zinc-600 dark:text-zinc-400">
              On the show, Kerem leads <em>the Strategy block</em> &mdash;
              frameworks, decisions, tradeoffs, and how operators actually
              think.
            </p>
          </section>

          <section>
            <p className="font-mono text-xs uppercase tracking-widest text-brand-600">
              Why this exists
            </p>
            <p className="mt-3 text-zinc-600 dark:text-zinc-400">
              Most student podcasts are pure-finance or pure-careers. We sit
              between strategy and capital, with a peer-and-pro hybrid format.
              The 2-on-1 dynamic forces sharper conversations &mdash; guests
              don&rsquo;t get to coast.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
