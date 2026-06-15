import Link from "next/link";
import type { ReactNode } from "react";
import { PublicShell } from "@/components/public-shell";
import { FadeIn, MaskedLine, Reveal } from "@/components/motion/reveal";

export const metadata = {
  title: "Manifesto · Stacksquare",
  description:
    "Why Stacksquare exists. The conversation that only happens in person, and the room we built to make it happen.",
};

/** Big serif statement line, the punch of each section. */
const STATEMENT =
  "font-display font-medium leading-[1.18] text-[var(--color-ink)] [font-size:clamp(1.5rem,2.8vw,2.1rem)]";
/** Reading prose. */
const PROSE =
  "text-lg leading-relaxed text-[var(--color-ink-soft)] sm:text-xl";

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Reveal>
      <section className="grid gap-5 border-t border-[var(--color-rule)] py-12 sm:grid-cols-[160px_1fr] sm:gap-10 sm:py-14">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
          {label}
        </p>
        <div className="max-w-2xl">{children}</div>
      </section>
    </Reveal>
  );
}

export default function ManifestoPage() {
  return (
    <PublicShell>
      <main className="mx-auto max-w-4xl px-6 py-20 sm:py-24">
        <FadeIn delay={0.05}>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
            The manifesto
          </p>
        </FadeIn>
        <h1 className="mt-6 font-display text-5xl font-medium leading-[1.04] text-[var(--color-ink)] sm:text-6xl">
          <MaskedLine delay={0.12}>Why Stacksquare</MaskedLine>
          <MaskedLine delay={0.24}>
            <span className="italic">exists</span>.
          </MaskedLine>
        </h1>
        <FadeIn delay={0.45}>
          <p className={`mt-10 ${STATEMENT}`}>
            There&rsquo;s a specific kind of conversation that only happens in
            person.
          </p>
        </FadeIn>

        <div className="mt-12 sm:mt-16">
          <Section label="The conversation">
            <p className={PROSE}>
              Not the LinkedIn message. Not the cold email. The one that starts
              at the edge of a room, runs over schedule, and ends with someone
              saying{" "}
              <span className="italic text-[var(--color-ink)]">
                we should continue this
              </span>
              .
            </p>
            <p className={`mt-6 ${STATEMENT}`}>
              That conversation. The one that actually changes something.
            </p>
          </Section>

          <Section label="What we noticed">
            <p className={PROSE}>
              We kept noticing it wasn&rsquo;t happening enough. Not because the
              people weren&rsquo;t there. Founders, operators, investors,
              builders. Professionals who&rsquo;d landed in a new city and
              quietly become part of one of the world&rsquo;s most important
              tech ecosystems, without ever quite finding each other.
            </p>
            <p className={`mt-6 italic ${STATEMENT}`}>
              A community existed. It just hadn&rsquo;t been given a room.
            </p>
          </Section>

          <Section label="Not a network">
            <p className={PROSE}>
              We&rsquo;re not a network. Networks are transactional by design:
              you join to extract, you leave when you&rsquo;ve extracted enough.
            </p>
            <p className={`mt-6 ${PROSE}`}>
              What we&rsquo;re building is closer to a standing invitation. To
              the people who are building something, funding something, or
              figuring out what comes next. Who carry two cities in their head
              and move fluidly between them. Who are ambitious without needing
              to perform it.
            </p>
            <p className={`mt-6 ${STATEMENT}`}>
              Stacksquare is for that person.
            </p>
          </Section>

          <Section label="The format">
            <p className={PROSE}>
              The format is simple: we bring together a room of people who
              should know each other and get out of the way.
            </p>
            <p className={`mt-6 font-display font-medium leading-[1.18] text-[var(--color-ink)] [font-size:clamp(1.3rem,2.4vw,1.8rem)]`}>
              No panels. No pitches dressed up as talks.
            </p>
            <p className={`mt-6 ${PROSE}`}>
              Just the right people, the right context, and enough time for the
              conversation to go somewhere real.
            </p>
          </Section>

          <Section label="Where we are">
            <p className={`italic ${STATEMENT}`}>
              We started in London. We&rsquo;re thinking further.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
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
          </Section>
        </div>
      </main>
    </PublicShell>
  );
}
