import Link from "next/link";
import { SiteNav, SiteFooter } from "@/components/site-nav";

export default function HomePage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-6xl px-6">
        <section className="py-28 sm:py-40">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
            Events for founders, investors, and operators. Imperial Business
            School.
          </p>
          <h1 className="mt-8 max-w-4xl text-4xl font-semibold leading-[1.1] tracking-tight text-[var(--color-ink)] text-balance sm:text-5xl lg:text-6xl">
            Strategy meets capital.
            <br />
            Stack meets psychology.
            <br />
            <span className="text-[var(--color-ink-muted)]">
              We meet in the square.
            </span>
          </h1>
          <p className="mt-10 max-w-2xl text-lg leading-relaxed text-[var(--color-ink-soft)] sm:text-xl">
            StackSquare convenes the people who build, fund, and advise serious
            businesses. Fireside rooms, expert sessions, and peer gatherings,
            each mapped to four lenses: technology stack, capital structure,
            strategic planning, and psychology.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/events"
              className="rounded-md bg-[var(--color-ink)] px-6 py-3 text-base font-medium text-[var(--color-paper)] transition-opacity hover:opacity-85"
            >
              See the sessions
            </Link>
            <Link
              href="/about"
              className="text-base text-[var(--color-ink-soft)] underline decoration-[var(--color-rule)] underline-offset-4 transition-colors hover:text-[var(--color-ink)]"
            >
              About StackSquare
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
