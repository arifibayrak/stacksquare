import Link from "next/link";
import Script from "next/script";
import { PublicShell } from "@/components/public-shell";
import { EventCard } from "@/components/event-card";
import {
  FadeIn,
  MaskedLine,
  Reveal,
  Stagger,
  StaggerItem,
} from "@/components/motion/reveal";
import { getPublishedEvents } from "@/lib/events";

export const dynamic = "force-dynamic";

const formats = [
  {
    name: "Fireside chats",
    blurb: "One guest, live questions, no podium. The conversation you wish the panel had been.",
  },
  {
    name: "Expert sessions",
    blurb: "A practitioner walks through what they actually do, and takes it apart with the room.",
  },
  {
    name: "Peer gatherings",
    blurb: "Founders, investors, and operators around one table. Small enough that everyone talks.",
  },
];

const tickerItems = [
  "Fireside chats",
  "Expert sessions",
  "Peer gatherings",
  "Technology stack",
  "Capital structure",
  "Strategic planning",
  "Psychology",
  "Founders",
  "Investors",
  "Operators",
  "Venture capital",
  "Term sheets",
  "Unit economics",
  "Go-to-market",
  "Product-market fit",
  "Due diligence",
  "Competitive moats",
  "Decision making",
  "Fundraising",
  "Market entry",
  "Pricing power",
  "Small rooms",
  "AI agents",
  "Foundation models",
  "Applied AI",
  "Machine learning",
  "Developer tools",
  "Open source",
  "Cloud infrastructure",
  "Cybersecurity",
  "Fintech",
  "Healthtech",
  "Climate tech",
  "Deeptech",
  "SaaS",
  "Marketplaces",
  "Network effects",
  "Behavioral economics",
  "Cap tables",
  "Board dynamics",
  "M&A",
  "Hiring the first ten",
  "Burn rate",
  "Founder psychology",
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
  const { upcoming, past } = await getPublishedEvents();
  const recentPast = past.slice(0, 3);

  return (
    <PublicShell>
      <main>
        <section>
          <div className="mx-auto max-w-4xl px-6 py-16 text-center sm:py-24">
            <h1 className="font-display text-[clamp(2.3rem,5vw,4rem)] font-medium leading-[1.06] text-[var(--color-ink)]">
              <MaskedLine delay={0.12}>Strategy meets capital.</MaskedLine>
              <MaskedLine delay={0.24}>Stack meets psychology.</MaskedLine>
              <MaskedLine delay={0.36}>
                <span className="italic text-[var(--color-ink-muted)]">
                  We meet in the{" "}
                  <span className="text-[var(--color-brand-600)]">square</span>
                  .
                </span>
              </MaskedLine>
            </h1>
            <FadeIn delay={0.55}>
              <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-[var(--color-ink-soft)] sm:text-xl">
                stacksquare is an events organization for founders, investors,
                and operators. We host fireside chats, expert sessions, and
                peer gatherings in small rooms, and read every conversation
                through four lenses: stack, capital, strategy, and psychology.
              </p>
            </FadeIn>
            <FadeIn delay={0.68}>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/events"
                  className="group inline-flex items-center gap-2 rounded-md bg-[var(--color-ink)] px-6 py-3 text-base font-medium text-[var(--color-paper)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-12px_rgba(0,0,0,0.7)]"
                >
                  See the events
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
          </div>
        </section>

        <div className="marquee border-y border-[var(--color-rule)] py-4">
          <div className="marquee-track" style={{ animationDuration: "75s" }}>
            <TickerRow />
            <TickerRow />
          </div>
        </div>

        <section>
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <Reveal>
              <div className="flex flex-wrap items-end justify-between gap-6">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
                    The events
                  </p>
                  <h2 className="mt-6 font-display text-3xl font-medium leading-tight text-[var(--color-ink)] sm:text-4xl">
                    What&rsquo;s on in the square
                  </h2>
                </div>
                <Link
                  href="/events"
                  className="draw-link text-base text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
                >
                  All events →
                </Link>
              </div>
            </Reveal>

            {upcoming.length > 0 ? (
              <div className="mt-12 space-y-12">
                {upcoming.slice(0, 3).map((e, i) => (
                  <Reveal key={e.id} delay={i * 0.08}>
                    <EventCard event={e} variant="upcoming" index={i} />
                  </Reveal>
                ))}
              </div>
            ) : (
              <Reveal className="mt-12">
                <div className="rounded-xl border border-dashed border-[var(--color-rule)] bg-[var(--color-paper-soft)] p-8">
                  <p className="text-lg text-[var(--color-ink-soft)]">
                    The next session is being planned.{" "}
                    <Link
                      href="/contact#attend"
                      className="draw-link text-[var(--color-ink)]"
                    >
                      Follow the calendar
                    </Link>{" "}
                    and you&rsquo;ll be the first to know.
                  </p>
                </div>
              </Reveal>
            )}

            {recentPast.length > 0 && (
              <div className="mt-16">
                <Reveal>
                  <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
                    Past events
                  </h3>
                </Reveal>
                <div className="mt-8 space-y-12">
                  {recentPast.map((e, i) => (
                    <Reveal key={e.id} delay={i * 0.08}>
                      <EventCard event={e} variant="past" index={i} />
                    </Reveal>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="border-t border-[var(--color-rule)]">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <Reveal>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
                What we host
              </p>
            </Reveal>
            <Stagger className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-3">
              {formats.map((f, i) => (
                <StaggerItem key={f.name} className="group">
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
                      {f.name}
                    </h3>
                    <p className="mt-3 text-base leading-relaxed text-[var(--color-ink-soft)]">
                      {f.blurb}
                    </p>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
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
                  See the events
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
