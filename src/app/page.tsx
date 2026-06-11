import Link from "next/link";
import Script from "next/script";
import { SiteNav, SiteFooter } from "@/components/site-nav";
import { EventCard } from "@/components/event-card";
import { HeroMark } from "@/components/motion/hero-mark";
import {
  FadeIn,
  MaskedLine,
  Reveal,
  Stagger,
  StaggerItem,
} from "@/components/motion/reveal";
import { getPublishedEvents } from "@/lib/events";

export const dynamic = "force-dynamic";

const lenses = [
  {
    name: "Technology stack",
    blurb: "What the business is built on, and why that choice compounds.",
  },
  {
    name: "Capital structure",
    blurb: "Who funds it, on what terms, and what the money expects back.",
  },
  {
    name: "Strategic planning",
    blurb: "The moves, the sequencing, and the bets behind both.",
  },
  {
    name: "Psychology",
    blurb: "How operators actually decide when the stakes are real.",
  },
];

const tickerItems = [
  "Fireside rooms",
  "Expert sessions",
  "Peer gatherings",
  "Technology stack",
  "Capital structure",
  "Strategic planning",
  "Psychology",
];

function TickerRow() {
  return (
    <div className="flex shrink-0 items-center">
      {tickerItems.map((item) => (
        <span key={item} className="flex items-center">
          <span className="px-6 font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
            {item}
          </span>
          <span
            aria-hidden
            className="size-1.5 rounded-[2px] bg-[var(--color-rule)]"
          />
        </span>
      ))}
    </div>
  );
}

export default async function HomePage() {
  const { upcoming } = await getPublishedEvents();
  const highlights = upcoming.slice(0, 3);

  return (
    <>
      <SiteNav />
      <main>
        <section className="mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-16 py-24 sm:py-32 lg:grid-cols-[1fr_auto] lg:gap-24 lg:py-36">
            <div>
              <FadeIn delay={0.05}>
                <p className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
                  <span
                    aria-hidden
                    className="inline-block size-2 rounded-[2px] bg-[var(--color-brand-500)] animate-[pulse-soft_4s_ease-in-out_infinite]"
                  />
                  Events for founders, investors, and operators · Imperial
                  Business School
                </p>
              </FadeIn>
              <h1 className="mt-8 max-w-4xl font-display text-5xl font-medium leading-[1.06] text-[var(--color-ink)] sm:text-6xl lg:text-7xl">
                <MaskedLine delay={0.12}>Strategy meets capital.</MaskedLine>
                <MaskedLine delay={0.24}>Stack meets psychology.</MaskedLine>
                <MaskedLine delay={0.36}>
                  <span className="italic text-[var(--color-ink-muted)]">
                    We meet in the{" "}
                    <span className="text-[var(--color-brand-600)]">
                      square
                    </span>
                    .
                  </span>
                </MaskedLine>
              </h1>
              <FadeIn delay={0.55}>
                <p className="mt-10 max-w-2xl text-lg leading-relaxed text-[var(--color-ink-soft)] sm:text-xl">
                  StackSquare convenes the people who build, fund, and advise
                  serious businesses. Fireside rooms, expert sessions, and peer
                  gatherings, each mapped to four lenses: technology stack,
                  capital structure, strategic planning, and psychology.
                </p>
              </FadeIn>
              <FadeIn delay={0.68}>
                <div className="mt-10 flex flex-wrap items-center gap-4">
                  <Link
                    href="/events"
                    className="group inline-flex items-center gap-2 rounded-md bg-[var(--color-ink)] px-6 py-3 text-base font-medium text-[var(--color-paper)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-12px_rgba(26,26,26,0.5)]"
                  >
                    See the sessions
                    <span
                      aria-hidden
                      className="transition-transform duration-300 group-hover:translate-x-1"
                    >
                      →
                    </span>
                  </Link>
                  <Link
                    href="/about"
                    className="draw-link text-base text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
                  >
                    About StackSquare
                  </Link>
                </div>
              </FadeIn>
            </div>
            <HeroMark className="hidden lg:block" />
          </div>
        </section>

        <div className="marquee border-y border-[var(--color-rule)] py-4">
          <div className="marquee-track">
            <TickerRow />
            <TickerRow />
          </div>
        </div>

        <section className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
              The four lenses
            </p>
            <h2 className="mt-6 max-w-2xl font-display text-3xl font-medium leading-tight text-[var(--color-ink)] sm:text-4xl">
              Every session, <span className="italic">four ways in</span>.
            </h2>
          </Reveal>
          <Stagger className="mt-14 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {lenses.map((lens, i) => (
              <StaggerItem key={lens.name} className="group">
                <div className="border-t border-[var(--color-rule)] pt-6 transition-colors duration-300 group-hover:border-[var(--color-ink)]">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs tabular-nums text-[var(--color-ink-muted)]">
                      0{i + 1}
                    </span>
                    <span
                      aria-hidden
                      className="size-2.5 rounded-[3px] bg-[var(--color-rule)] transition-all duration-300 group-hover:rotate-45 group-hover:bg-[var(--color-brand-500)]"
                    />
                  </div>
                  <h3 className="mt-5 font-display text-2xl font-medium text-[var(--color-ink)]">
                    {lens.name}
                  </h3>
                  <p className="mt-3 text-base leading-relaxed text-[var(--color-ink-soft)]">
                    {lens.blurb}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        {highlights.length > 0 && (
          <section className="border-t border-[var(--color-rule)]">
            <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
              <Reveal>
                <div className="flex flex-wrap items-end justify-between gap-6">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
                      Next in the square
                    </p>
                    <h2 className="mt-6 font-display text-3xl font-medium leading-tight text-[var(--color-ink)] sm:text-4xl">
                      Upcoming sessions
                    </h2>
                  </div>
                  <Link
                    href="/events"
                    className="draw-link text-base text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
                  >
                    All sessions →
                  </Link>
                </div>
              </Reveal>
              <div className="mt-12 space-y-12">
                {highlights.map((e, i) => (
                  <Reveal key={e.id} delay={i * 0.08}>
                    <EventCard event={e} variant="upcoming" index={i} />
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="mx-auto max-w-6xl px-6 pb-8">
          <Reveal>
            <div className="relative overflow-hidden rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-soft)] px-8 py-16 text-center sm:px-16 sm:py-20">
              <div
                aria-hidden
                className="absolute -right-10 -top-10 grid rotate-12 grid-cols-2 gap-3 opacity-[0.06]"
              >
                <div className="size-24 rounded-xl bg-[var(--color-ink)]" />
                <div className="size-24 rounded-xl bg-[var(--color-ink)]" />
                <div className="size-24 rounded-xl bg-[var(--color-ink)]" />
                <div className="size-24 rounded-xl bg-[var(--color-brand-500)]" />
              </div>
              <h2 className="relative font-display text-3xl font-medium leading-tight text-[var(--color-ink)] sm:text-5xl">
                The next room is <span className="italic">forming</span>.
              </h2>
              <p className="relative mx-auto mt-6 max-w-xl text-lg leading-relaxed text-[var(--color-ink-soft)]">
                Rooms stay small by design. One expert in the middle, four
                lenses on the table, and seats that go fast.
              </p>
              <div className="relative mt-10 flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/events"
                  className="rounded-md bg-[var(--color-ink)] px-6 py-3 text-base font-medium text-[var(--color-paper)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-12px_rgba(26,26,26,0.5)]"
                >
                  See the sessions
                </Link>
                <Link
                  href="/contact"
                  className="draw-link text-base text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
                >
                  Get in touch
                </Link>
              </div>
            </div>
          </Reveal>
        </section>
      </main>
      <SiteFooter />
      {/* Powers the Luma "Register for Event" checkout buttons on event cards. */}
      <Script
        id="luma-checkout"
        src="https://embed.lu.ma/checkout-button.js"
        strategy="afterInteractive"
      />
    </>
  );
}
