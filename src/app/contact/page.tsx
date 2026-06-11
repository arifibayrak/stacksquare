import { PublicShell } from "@/components/public-shell";
import { SubmissionForm } from "@/components/submission-form";
import { NewsletterForm } from "@/components/newsletter-form";
import { FadeIn, MaskedLine, Reveal } from "@/components/motion/reveal";

export const metadata = { title: "Contact · Stacksquare" };

const paths = [
  { id: "attend", label: "Attend" },
  { id: "speak", label: "Speak" },
  { id: "partner", label: "Host or partner" },
];

function lumaCalendarUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_LUMA_CALENDAR_ID?.trim();
  if (!raw) return null;
  if (raw.startsWith("http")) return raw;
  return `https://luma.com/calendar/${raw}`;
}

function SectionHeading({
  index,
  id,
  title,
  blurb,
}: {
  index: string;
  id: string;
  title: React.ReactNode;
  blurb: string;
}) {
  return (
    <div id={id} className="scroll-mt-28">
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs tabular-nums text-[var(--color-ink-muted)]">
          {index}
        </span>
        <span
          aria-hidden
          className="size-2 rounded-[2px] bg-[var(--color-brand-500)]"
        />
      </div>
      <h2 className="mt-4 font-display text-3xl font-medium leading-tight text-[var(--color-ink)] sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 max-w-md text-base leading-relaxed text-[var(--color-ink-soft)]">
        {blurb}
      </p>
    </div>
  );
}

export default function ContactPage() {
  const calendarUrl = lumaCalendarUrl();

  return (
    <PublicShell>
      <main className="mx-auto max-w-5xl px-6 py-20 sm:py-28">
        <FadeIn delay={0.05}>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
            Contact
          </p>
        </FadeIn>
        <h1 className="mt-6 font-display text-5xl font-medium leading-[1.06] text-[var(--color-ink)] sm:text-6xl">
          <MaskedLine delay={0.1}>
            Get in the <span className="italic text-[var(--color-brand-600)]">square</span>.
          </MaskedLine>
        </h1>
        <FadeIn delay={0.32}>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-[var(--color-ink-soft)]">
            Three ways in. Pick yours.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {paths.map((p) => (
              <a
                key={p.id}
                href={`#${p.id}`}
                className="rounded-full border border-[var(--color-rule)] px-4 py-1.5 font-mono text-xs uppercase tracking-[0.14em] text-[var(--color-ink-soft)] transition-colors duration-300 hover:border-[var(--color-ink)] hover:text-[var(--color-ink)]"
              >
                {p.label}
              </a>
            ))}
          </div>
        </FadeIn>

        <div className="mt-12 space-y-12">
          <Reveal>
            <section className="grid gap-10 border-t border-[var(--color-rule)] pt-12 lg:grid-cols-[2fr_3fr] lg:gap-16">
              <SectionHeading
                index="01"
                id="attend"
                title={
                  <>
                    Attend the <span className="italic">sessions</span>.
                  </>
                }
                blurb="Be in the room next time. Follow the Stacksquare calendar on Luma to catch every session, or leave your email and we will write when a new room opens."
              />
              <div className="space-y-6">
                {calendarUrl && (
                  <a
                    href={calendarUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="group inline-flex items-center gap-2 rounded-md bg-[var(--color-ink)] px-6 py-3 text-base font-medium text-[var(--color-paper)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-12px_rgba(26,26,26,0.5)]"
                  >
                    Follow the calendar on Luma
                    <span
                      aria-hidden
                      className="transition-transform duration-300 group-hover:translate-x-1"
                    >
                      ↗
                    </span>
                  </a>
                )}
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
                    Or join the list
                  </p>
                  <div className="mt-3">
                    <NewsletterForm />
                  </div>
                </div>
              </div>
            </section>
          </Reveal>

          <Reveal>
            <section className="grid gap-10 border-t border-[var(--color-rule)] pt-12 lg:grid-cols-[2fr_3fr] lg:gap-16">
              <SectionHeading
                index="02"
                id="speak"
                title={
                  <>
                    Take the seat in the <span className="italic">middle</span>.
                  </>
                }
                blurb="Founder, builder, operator, investor, professor. If you can hold a room across the four lenses, tell us what you would bring."
              />
              <div>
                <SubmissionForm
                  kind="speaker"
                  submitLabel="Pitch your session"
                  fields={[
                    { name: "name", label: "Name", type: "text", required: true },
                    { name: "email", label: "Email", type: "email", required: true },
                    {
                      name: "role",
                      label: "Who you are",
                      type: "text",
                      required: true,
                      placeholder: "Founder, professor, operator, investor...",
                    },
                    {
                      name: "organization",
                      label: "Company or institution",
                      type: "text",
                    },
                    {
                      name: "link",
                      label: "LinkedIn or website",
                      type: "url",
                      placeholder: "https://",
                    },
                    {
                      name: "message",
                      label: "What would you talk about?",
                      type: "textarea",
                      required: true,
                      rows: 5,
                    },
                  ]}
                />
              </div>
            </section>
          </Reveal>

          <Reveal>
            <section className="grid gap-10 border-t border-[var(--color-rule)] pt-12 lg:grid-cols-[2fr_3fr] lg:gap-16">
              <SectionHeading
                index="03"
                id="partner"
                title={
                  <>
                    Bring the <span className="italic">room</span>.
                  </>
                }
                blurb="Venues, event organizations, and companies. If you have a space, an audience, or a brand that belongs in the square, let's plan something together."
              />
              <div>
                <SubmissionForm
                  kind="partner"
                  submitLabel="Start the conversation"
                  fields={[
                    { name: "name", label: "Name", type: "text", required: true },
                    { name: "email", label: "Email", type: "email", required: true },
                    {
                      name: "organization",
                      label: "Organization",
                      type: "text",
                      required: true,
                      placeholder: "Venue, event org, company...",
                    },
                    {
                      name: "message",
                      label: "What do you have in mind?",
                      type: "textarea",
                      required: true,
                      rows: 5,
                    },
                  ]}
                />
              </div>
            </section>
          </Reveal>
        </div>

        <Reveal>
          <p className="mt-12 border-t border-[var(--color-rule)] pt-12 text-base text-[var(--color-ink-muted)]">
            Press or anything else:{" "}
            <a
              href="mailto:arif@stacksquare.ai"
              className="draw-link text-[var(--color-ink)]"
            >
              arif@stacksquare.ai
            </a>{" "}
            ·{" "}
            <a
              href="mailto:kerem@stacksquare.ai"
              className="draw-link text-[var(--color-ink)]"
            >
              kerem@stacksquare.ai
            </a>
          </p>
        </Reveal>
      </main>
    </PublicShell>
  );
}
