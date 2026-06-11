import Script from "next/script";
import { PublicShell } from "@/components/public-shell";
import { EventCard } from "@/components/event-card";
import { FadeIn, MaskedLine, Reveal } from "@/components/motion/reveal";
import { getPublishedEvents } from "@/lib/events";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Events · stacksquare",
  description:
    "Upcoming and past stacksquare events. Founders, investors, and operators across the four lenses: technology stack, capital, strategy, and psychology.",
};

export default async function EventsPage() {
  const { upcoming, past } = await getPublishedEvents();
  const hasAny = upcoming.length > 0 || past.length > 0;

  return (
    <PublicShell>
      <main className="mx-auto max-w-4xl px-6">
        <section className="py-24 sm:py-32">
          <FadeIn delay={0.05}>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
              Events
            </p>
          </FadeIn>
          <h1 className="mt-8 max-w-3xl font-display text-5xl font-medium leading-[1.06] text-[var(--color-ink)] sm:text-6xl">
            <MaskedLine delay={0.12}>The room you want</MaskedLine>
            <MaskedLine delay={0.24}>
              to <span className="italic">be in</span>.
            </MaskedLine>
          </h1>
          <FadeIn delay={0.45}>
            <p className="mt-10 max-w-2xl text-lg leading-relaxed text-[var(--color-ink-soft)] sm:text-xl">
              Each session puts one founder, investor, or operator to the four
              lenses: technology stack, capital, strategy, and psychology. Here
              is what is coming up and what already happened.
            </p>
          </FadeIn>
        </section>

        {!hasAny && (
          <section className="pb-24">
            <Reveal>
              <div className="rounded-xl border border-dashed border-[var(--color-rule)] bg-[var(--color-paper-soft)] p-10 text-center">
                <p className="text-lg text-[var(--color-ink-soft)]">
                  No sessions are published yet. The first ones land here soon.
                </p>
              </div>
            </Reveal>
          </section>
        )}

        {upcoming.length > 0 && (
          <section className="pb-20">
            <Reveal>
              <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
                Upcoming
              </h2>
            </Reveal>
            <div className="mt-10 space-y-12">
              {upcoming.map((e, i) => (
                <Reveal key={e.id} delay={i * 0.06}>
                  <EventCard event={e} variant="upcoming" index={i} />
                </Reveal>
              ))}
            </div>
          </section>
        )}

        {past.length > 0 && (
          <section className="border-t border-[var(--color-rule)] py-20">
            <Reveal>
              <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
                Past sessions
              </h2>
            </Reveal>
            <div className="mt-10 space-y-12">
              {past.map((e, i) => (
                <Reveal key={e.id} delay={i * 0.06}>
                  <EventCard event={e} variant="past" index={i} />
                </Reveal>
              ))}
            </div>
          </section>
        )}
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
