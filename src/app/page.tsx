import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import { PublicShell } from "@/components/public-shell";
import { EventCard } from "@/components/event-card";
import { HeroCollage } from "@/components/motion/hero-collage";
import { LensChapter } from "@/components/motion/lens-chapter";
import { FadeIn, MaskedLine, Reveal } from "@/components/motion/reveal";
import { getPublishedEvents } from "@/lib/events";

export const dynamic = "force-dynamic";

const chapters = [
  {
    index: "01",
    title: "Technology stack",
    kicker: "What is it built on?",
    body: "Architecture, tooling, and the build-or-buy calls. Why the stack choice compounds over time, and where it breaks.",
    src: "/lenses/tech.webp",
    alt: "Closeup of a blue circuit board",
  },
  {
    index: "02",
    title: "Capital structure",
    kicker: "Who pays for it?",
    body: "Funding, terms, and what the money expects back. The numbers behind the story, read out loud.",
    src: "/lenses/capital.jpg",
    alt: "Investing newspaper page with a twenty dollar bill",
  },
  {
    index: "03",
    title: "Strategic planning",
    kicker: "What is the next move?",
    body: "Position, sequencing, and the bets behind both. The frameworks operators actually reach for under pressure.",
    src: "/lenses/strategy.jpg",
    alt: "Dictionary entry for strategy",
  },
  {
    index: "04",
    title: "Psychology",
    kicker: "How do they decide?",
    body: "Judgment, bias, and conviction when the stakes are real. The part of the operating manual nobody writes down.",
    src: "/lenses/psychology.webp",
    alt: "Vintage anatomical brain engraving over dictionary print",
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
    <PublicShell>
      <main>
        <section className="mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-14 py-20 sm:py-24 lg:min-h-[82svh] lg:grid-cols-[1.05fr_auto] lg:gap-16 lg:py-16">
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
              <h1 className="mt-8 font-display text-[clamp(2.9rem,7.2vw,5.6rem)] font-medium leading-[1.02] text-[var(--color-ink)]">
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
                <p className="mt-9 max-w-xl text-lg leading-relaxed text-[var(--color-ink-soft)] sm:text-xl">
                  stacksquare convenes the people who build, fund, and advise
                  serious businesses. Small rooms, one expert in the middle,
                  every session read through four lenses.
                </p>
              </FadeIn>
              <FadeIn delay={0.68}>
                <div className="mt-10 flex flex-wrap items-center gap-4">
                  <Link
                    href="/events"
                    className="group inline-flex items-center gap-2 rounded-md bg-[var(--color-ink)] px-6 py-3 text-base font-medium text-[var(--color-paper)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-12px_rgba(0,0,0,0.7)]"
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
                    href="/contact"
                    className="draw-link text-base text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
                  >
                    Get in the square
                  </Link>
                </div>
              </FadeIn>

              {/* Compact artifact strip on small screens; the collage takes over on lg. */}
              <FadeIn delay={0.8} className="mt-14 lg:hidden">
                <div className="grid grid-cols-4 gap-3">
                  {chapters.map((c) => (
                    <div
                      key={c.src}
                      className="relative aspect-[3/4] overflow-hidden rounded-lg border border-[var(--color-rule)]"
                    >
                      <Image
                        src={c.src}
                        alt={c.alt}
                        fill
                        sizes="25vw"
                        className="object-cover [filter:saturate(0.8)_contrast(1.05)]"
                      />
                    </div>
                  ))}
                </div>
              </FadeIn>
            </div>
            <HeroCollage className="hidden lg:block" />
          </div>
        </section>

        <div className="marquee border-y border-[var(--color-rule)] py-4">
          <div className="marquee-track">
            <TickerRow />
            <TickerRow />
          </div>
        </div>

        <section className="mx-auto max-w-6xl px-6 pt-24 sm:pt-28">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
              The four lenses
            </p>
            <h2 className="mt-6 max-w-3xl font-display text-4xl font-medium leading-[1.08] text-[var(--color-ink)] sm:text-5xl">
              One guest. One room.{" "}
              <span className="italic text-[var(--color-ink-muted)]">
                Four ways to read them.
              </span>
            </h2>
          </Reveal>
          <div className="h-20" />
        </section>

        {chapters.map((c, i) => (
          <LensChapter key={c.index} {...c} flip={i % 2 === 1} />
        ))}

        {highlights.length > 0 && (
          <section className="border-t border-[var(--color-rule)]">
            <div className="mx-auto max-w-6xl px-6 py-24 sm:py-28">
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

        <section className="mx-auto max-w-6xl px-6 py-24 sm:py-28">
          <Reveal>
            <div className="relative overflow-hidden rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-soft)] px-8 py-16 text-center sm:px-16 sm:py-20">
              <div
                aria-hidden
                className="absolute -right-10 -top-10 grid rotate-12 grid-cols-2 gap-3 opacity-[0.08]"
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
                  className="rounded-md bg-[var(--color-ink)] px-6 py-3 text-base font-medium text-[var(--color-paper)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-12px_rgba(0,0,0,0.7)]"
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
      {/* Powers the Luma "Register for Event" checkout buttons on event cards. */}
      <Script
        id="luma-checkout"
        src="https://embed.lu.ma/checkout-button.js"
        strategy="afterInteractive"
      />
    </PublicShell>
  );
}
