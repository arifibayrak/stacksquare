import Link from "next/link";
import { SiteNav, SiteFooter } from "@/components/site-nav";
import { EventCard } from "@/components/event-card";
import { getPublishedEvents } from "@/lib/events";

export const dynamic = "force-dynamic";

const LENSES = [
  {
    n: "01",
    title: "Technology Stack",
    summary:
      "The systems and tooling that run a business beneath the strategy.",
    extract:
      "Architecture choices, build versus buy, and the tooling tradeoffs that shape how the work actually gets done.",
  },
  {
    n: "02",
    title: "Capital Structure & Investment Thesis",
    summary:
      "The financing mechanics and the conviction behind every deployed dollar.",
    extract:
      "Cap-table design, deal terms, thesis development, and the reasoning that separates a passed deal from a closed one.",
  },
  {
    n: "03",
    title: "Strategic Planning & Management",
    summary:
      "The operating system behind decisions, execution, and team performance.",
    extract:
      "Frameworks, prioritization heuristics, organizational design, and the mechanics that turn a plan into a shipped result.",
  },
  {
    n: "04",
    title: "Psychology & Decision Making",
    summary:
      "The human layer beneath every framework, model, and number.",
    extract:
      "Instincts, risk posture, behavioral patterns, and the off-script moments that explain why operators choose one path over another.",
  },
];

export default async function HomePage() {
  const { upcoming, past } = await getPublishedEvents();
  const showingUpcoming = upcoming.length > 0;
  const highlights = (showingUpcoming ? upcoming : past).slice(0, 3);

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

        {highlights.length > 0 && (
          <section
            id="sessions"
            className="border-t border-[var(--color-rule)] py-24 sm:py-32"
          >
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
                  {showingUpcoming ? "Upcoming" : "Recent sessions"}
                </p>
                <h2 className="mt-6 max-w-3xl text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-5xl">
                  {showingUpcoming
                    ? "What is coming up next."
                    : "What we covered lately."}
                </h2>
              </div>
              <Link
                href="/events"
                className="text-base text-[var(--color-brand-600)] underline decoration-[var(--color-rule)] underline-offset-4 transition-colors hover:decoration-[var(--color-brand-600)]"
              >
                All sessions ↗
              </Link>
            </div>
            <div className="mt-12 space-y-12">
              {highlights.map((e) => (
                <EventCard
                  key={e.id}
                  event={e}
                  variant={showingUpcoming ? "upcoming" : "past"}
                />
              ))}
            </div>
          </section>
        )}

        <section className="border-t border-[var(--color-rule)] py-24 sm:py-32">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
            The four lenses
          </p>
          <h2 className="mt-6 max-w-3xl text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-5xl">
            Every event. Every speaker.
          </h2>

          <div className="mt-16 grid gap-12 sm:grid-cols-2 sm:gap-x-16 sm:gap-y-14">
            {LENSES.map((p) => (
              <article key={p.n} className="border-t border-[var(--color-rule)] pt-6">
                <p className="font-mono text-sm tabular-nums text-[var(--color-ink-muted)]">
                  {p.n}
                </p>
                <h3 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-3xl">
                  {p.title}
                </h3>
                <p className="mt-5 max-w-xl text-lg font-medium leading-relaxed text-[var(--color-ink)]">
                  {p.summary}
                </p>
                <p className="mt-3 max-w-xl text-base leading-relaxed text-[var(--color-ink-soft)]">
                  {p.extract}
                </p>
              </article>
            ))}
          </div>

          <p className="mt-20 max-w-3xl text-lg leading-relaxed text-[var(--color-ink-soft)]">
            Every session maps these four onto a real operator&rsquo;s domain.
            The result is a clean, lean read on the terms, frameworks, and
            decisions that define their work, in a room small enough to ask the
            real questions.
          </p>
        </section>

        <section className="border-t border-[var(--color-rule)] py-24 sm:py-32">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
            Two formats
          </p>
          <div className="mt-12 grid gap-16 sm:grid-cols-2">
            <article>
              <p className="font-mono text-sm text-[var(--color-ink-muted)]">
                Format A
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-3xl">
                Expert sessions
              </h3>
              <p className="mt-4 text-lg leading-relaxed text-[var(--color-ink-soft)]">
                One founder, investor, or operator in conversation with the
                room. 45 to 60 minutes on how they actually build, fund, and
                decide, with time for the questions that matter.
              </p>
            </article>
            <article>
              <p className="font-mono text-sm text-[var(--color-ink-muted)]">
                Format B
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-3xl">
                Fireside rooms
              </h3>
              <p className="mt-4 text-lg leading-relaxed text-[var(--color-ink-soft)]">
                Ten to fifteen ambitious peers, an optional senior guest, one
                theme per evening. Small, sharp, and built for the conversations
                you cannot have on a stage.
              </p>
            </article>
          </div>
          <div className="mt-16">
            <Link
              href="/events"
              className="rounded-md bg-[var(--color-ink)] px-6 py-3 text-base font-medium text-[var(--color-paper)] transition-opacity hover:opacity-85"
            >
              See the sessions
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
