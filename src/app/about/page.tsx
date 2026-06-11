import { SiteNav, SiteFooter } from "@/components/site-nav";
import { InitialsAvatar } from "@/components/initials-avatar";
import { FadeIn, MaskedLine, Reveal } from "@/components/motion/reveal";

export const metadata = {
  title: "About · stacksquare",
};

function FounderLinks({
  email,
  linkedin,
}: {
  email: string;
  linkedin: string;
}) {
  return (
    <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-base">
      <a href={`mailto:${email}`} className="draw-link text-[var(--color-ink)]">
        {email}
      </a>
      <a
        href={linkedin}
        target="_blank"
        rel="noreferrer"
        className="draw-link text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
      >
        LinkedIn ↗
      </a>
    </div>
  );
}

/** Circular headshot sitting on a rotated square frame. In the square. */
function FounderAvatar(props: {
  initials: string;
  src: string;
  alt: string;
}) {
  return (
    <div className="relative shrink-0">
      <div
        aria-hidden
        className="absolute -inset-2 rotate-[-4deg] rounded-[28px] border border-dashed border-[var(--color-brand-500)] opacity-50"
      />
      <InitialsAvatar size={144} {...props} />
    </div>
  );
}

export default function AboutPage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-3xl px-6 py-24 sm:py-32">
        <FadeIn delay={0.05}>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
            About
          </p>
        </FadeIn>
        <h1 className="mt-6 font-display text-5xl font-medium leading-[1.06] text-[var(--color-ink)] sm:text-6xl">
          <MaskedLine delay={0.12}>Built between</MaskedLine>
          <MaskedLine delay={0.24}>
            <span className="italic">strategy</span> and{" "}
            <span className="italic">capital</span>.
          </MaskedLine>
        </h1>
        <FadeIn delay={0.45}>
          <p className="mt-8 max-w-2xl text-xl leading-relaxed text-[var(--color-ink-soft)] sm:text-2xl">
            stacksquare is an events organization built by two MSc Economics
            &amp; Strategy students at Imperial Business School. We convene
            founders, investors, and operators, and map every session to the
            four lenses: technology stack, capital, strategy, psychology.
          </p>
        </FadeIn>

        <div className="mt-20 space-y-16">
          <Reveal>
            <section className="flex flex-col items-start gap-7 sm:flex-row sm:gap-10">
              <FounderAvatar
                initials="AB"
                src="/founders/arif.png"
                alt="Arif İsmail Bayrak"
              />
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
                  Co-founder
                </p>
                <h2 className="mt-2 font-display text-2xl font-medium text-[var(--color-ink)] sm:text-3xl">
                  Arif İsmail Bayrak
                </h2>
                <p className="mt-4 text-lg leading-relaxed text-[var(--color-ink-soft)]">
                  Background in venture capital, M&amp;A, and AI. Internships at
                  Roche, UptoRaise Venture Studio, and Basehub Consultancy.
                  VC&amp;PE Society at Imperial. Builds AI tools for VC
                  workflows. Boğaziçi MIS alumnus.
                </p>
                <p className="mt-3 text-lg leading-relaxed text-[var(--color-ink-soft)]">
                  At our events, Arif leads the capital lens: the numbers,
                  deals, financing, and growth mechanics.
                </p>
                <FounderLinks
                  email="arif@stacksquare.ai"
                  linkedin="https://www.linkedin.com/in/arifismailbayrak"
                />
              </div>
            </section>
          </Reveal>

          <Reveal>
            <section className="flex flex-col items-start gap-7 sm:flex-row sm:gap-10">
              <FounderAvatar
                initials="KO"
                src="/founders/kerem.jpeg"
                alt="Kerem Ozkefeli"
              />
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
                  Co-founder
                </p>
                <h2 className="mt-2 font-display text-2xl font-medium text-[var(--color-ink)] sm:text-3xl">
                  Kerem Ozkefeli
                </h2>
                <p className="mt-4 text-lg leading-relaxed text-[var(--color-ink-soft)]">
                  Strategy consulting at Dialectica (Montreal). Facilitated
                  2,000+ C-suite expert calls. Project Lead at 180 Degrees
                  Consulting. PE analyst at Brickworks Capital. McGill BA in
                  Economics with a minor in Psychology. Koç School alumnus.
                </p>
                <p className="mt-3 text-lg leading-relaxed text-[var(--color-ink-soft)]">
                  At our events, Kerem leads the strategy and psychology lenses:
                  frameworks, decisions, tradeoffs, and how operators actually
                  think.
                </p>
                <FounderLinks
                  email="kerem@stacksquare.ai"
                  linkedin="https://www.linkedin.com/in/keremozkefeli"
                />
              </div>
            </section>
          </Reveal>

          <Reveal>
            <section className="border-t border-[var(--color-rule)] pt-12">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
                Why this exists
              </p>
              <p className="mt-4 max-w-2xl font-display text-2xl font-medium leading-snug text-[var(--color-ink)] sm:text-[1.7rem]">
                Most student events are pure finance or pure careers. We sit
                between strategy and capital, with a peer-and-pro hybrid
                format.{" "}
                <span className="italic text-[var(--color-ink-muted)]">
                  Small rooms force sharper conversations. Speakers don&rsquo;t
                  get to coast.
                </span>
              </p>
            </section>
          </Reveal>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
