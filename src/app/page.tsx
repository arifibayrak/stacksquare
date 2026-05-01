import { SiteNav, SiteFooter } from "@/components/site-nav";

const PILLARS = [
  {
    n: "01",
    title: "Technology Stack",
    summary:
      "The systems and tooling that run the business beneath the strategy.",
    extract:
      "Architecture choices, build versus buy decisions, and the tooling tradeoffs that shape how the work actually gets done.",
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

export default function HomePage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-6xl px-6">
        <section className="py-28 sm:py-40">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
            A 2-on-1 conversation series. Imperial Business School.
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
            Two MSc students. One professional per conversation. Each guest
            mapped to four lenses: technology stack, capital structure,
            strategic planning, and psychology.
          </p>
        </section>

        <section className="py-24 sm:py-32">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
            The four lenses
          </p>
          <h2 className="mt-6 max-w-3xl text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-5xl">
            Every conversation. Every guest.
          </h2>

          <div className="mt-16 grid gap-12 sm:grid-cols-2 sm:gap-x-16 sm:gap-y-14">
            {PILLARS.map((p) => (
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
            Each interview maps these four onto the guest&rsquo;s domain. The
            output is a clean, lean explanation of the terms, frameworks, and
            decisions that define their work.
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
                2-on-1 expert interviews
              </h3>
              <p className="mt-4 text-lg leading-relaxed text-[var(--color-ink-soft)]">
                45 to 60 minute recordings with founders, investors, and
                operators. Edited to long form, plus four to six sharp clips.
              </p>
            </article>
            <article>
              <p className="font-mono text-sm text-[var(--color-ink-muted)]">
                Format B
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-3xl">
                Fireside chat series
              </h3>
              <p className="mt-4 text-lg leading-relaxed text-[var(--color-ink-soft)]">
                Ten to fifteen ambitious peers, an optional senior guest, one
                theme per episode. The room you&rsquo;d want to be in.
              </p>
            </article>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
