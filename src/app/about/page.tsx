import { SiteNav, SiteFooter } from "@/components/site-nav";
import { InitialsAvatar } from "@/components/initials-avatar";

export const metadata = {
  title: "About · StackSquare",
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
      <a
        href={`mailto:${email}`}
        className="text-[var(--color-ink)] underline decoration-[var(--color-rule)] underline-offset-4 transition-colors hover:decoration-[var(--color-ink)]"
      >
        {email}
      </a>
      <a
        href={linkedin}
        target="_blank"
        rel="noreferrer"
        className="text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)]"
      >
        LinkedIn ↗
      </a>
    </div>
  );
}

export default function AboutPage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-3xl px-6 py-24 sm:py-32">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
          About
        </p>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-6xl">
          Built between strategy and capital.
        </h1>
        <p className="mt-8 max-w-2xl text-xl leading-relaxed text-[var(--color-ink-soft)] sm:text-2xl">
          StackSquare is a 2-on-1 conversation series built by two MSc
          Economics &amp; Strategy students at Imperial Business School. We
          map every guest to the four lenses: technology stack, capital,
          strategy, psychology.
        </p>

        <div className="mt-20 space-y-16">
          <section className="flex flex-col items-start gap-7 sm:flex-row sm:gap-10">
            <InitialsAvatar
              initials="AB"
              src="/founders/arif.png"
              size={144}
              alt="Arif İsmail Bayrak"
            />
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
                Co-founder
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-3xl">
                Arif İsmail Bayrak
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-[var(--color-ink-soft)]">
                Background in venture capital, M&amp;A, and AI. Internships at
                Roche, UptoRaise Venture Studio, and Basehub Consultancy.
                VC&amp;PE Society at Imperial. Builds AI tools for VC
                workflows. Boğaziçi MIS alumnus.
              </p>
              <p className="mt-3 text-lg leading-relaxed text-[var(--color-ink-soft)]">
                On the show, Arif leads the capital lens: the numbers, deals,
                financing, and growth mechanics.
              </p>
              <FounderLinks
                email="arif@stacksquare.ai"
                linkedin="https://www.linkedin.com/in/arifismailbayrak"
              />
            </div>
          </section>

          <section className="flex flex-col items-start gap-7 sm:flex-row sm:gap-10">
            <InitialsAvatar
              initials="KO"
              src="/founders/kerem.jpeg"
              size={144}
              alt="Kerem Ozkefeli"
            />
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
                Co-founder
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-3xl">
                Kerem Ozkefeli
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-[var(--color-ink-soft)]">
                Strategy consulting at Dialectica (Montreal). Facilitated 2,000+
                C-suite expert calls. Project Lead at 180 Degrees Consulting.
                PE analyst at Brickworks Capital. McGill BA in Economics with
                a minor in Psychology. Koç School alumnus.
              </p>
              <p className="mt-3 text-lg leading-relaxed text-[var(--color-ink-soft)]">
                On the show, Kerem leads the strategy and psychology lenses:
                frameworks, decisions, tradeoffs, and how operators actually
                think.
              </p>
              <FounderLinks
                email="kerem@stacksquare.ai"
                linkedin="https://www.linkedin.com/in/keremozkefeli"
              />
            </div>
          </section>

          <section>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
              Why this exists
            </p>
            <p className="mt-4 text-lg leading-relaxed text-[var(--color-ink-soft)]">
              Most student podcasts are pure finance or pure careers. We sit
              between strategy and capital, with a peer-and-pro hybrid format.
              The 2-on-1 dynamic forces sharper conversations. Guests
              don&rsquo;t get to coast.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
