import { SiteNav, SiteFooter } from "@/components/site-nav";
import { EventCard } from "@/components/event-card";
import { getPublishedEvents } from "@/lib/events";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Grill Me · StackSquare",
  description:
    "Grill Me sessions from StackSquare. Founders, investors, and operators put to the four lenses. Upcoming dates and past sessions.",
};

export default async function GrillMePage() {
  const { upcoming, past } = await getPublishedEvents();
  const hasAny = upcoming.length > 0 || past.length > 0;

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-4xl px-6">
        <section className="py-24 sm:py-32">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
            Grill Me
          </p>
          <h1 className="mt-8 max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight text-[var(--color-ink)] text-balance sm:text-5xl lg:text-6xl">
            We put one operator to the four lenses.
          </h1>
          <p className="mt-10 max-w-2xl text-lg leading-relaxed text-[var(--color-ink-soft)] sm:text-xl">
            Every session, one founder, investor, or operator gets grilled
            across technology stack, capital, strategy, and psychology. Here is
            what is coming up and what already happened.
          </p>
        </section>

        {!hasAny && (
          <section className="pb-24">
            <div className="rounded-xl border border-dashed border-[var(--color-rule)] bg-[var(--color-paper-soft)] p-10 text-center">
              <p className="text-lg text-[var(--color-ink-soft)]">
                No sessions are published yet. The first ones land here soon.
              </p>
            </div>
          </section>
        )}

        {upcoming.length > 0 && (
          <section className="pb-20">
            <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
              Upcoming
            </h2>
            <div className="mt-10 space-y-12">
              {upcoming.map((e) => (
                <EventCard key={e.id} event={e} variant="upcoming" />
              ))}
            </div>
          </section>
        )}

        {past.length > 0 && (
          <section className="border-t border-[var(--color-rule)] py-20">
            <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
              Past sessions
            </h2>
            <div className="mt-10 space-y-12">
              {past.map((e) => (
                <EventCard key={e.id} event={e} variant="past" />
              ))}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
