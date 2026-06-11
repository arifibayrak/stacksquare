import { SiteNav, SiteFooter } from "@/components/site-nav";
import { SubmissionForm } from "@/components/submission-form";
import { FadeIn, MaskedLine } from "@/components/motion/reveal";

export const metadata = { title: "Contact · StackSquare" };

export default function ContactPage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-2xl px-6 py-20 sm:py-24">
        <h1 className="font-display text-5xl font-medium leading-[1.06] text-[var(--color-ink)]">
          <MaskedLine delay={0.08}>
            Say <span className="italic">hello</span>.
          </MaskedLine>
        </h1>
        <FadeIn delay={0.3}>
          <p className="mt-4 text-lg text-[var(--color-ink-soft)]">
            Press, sponsorship, or anything else.
          </p>
        </FadeIn>

        <FadeIn delay={0.45}>
          <div className="mt-10">
            <SubmissionForm
              kind="contact"
              submitLabel="Send"
              fields={[
                { name: "name", label: "Name", type: "text", required: true },
                {
                  name: "email",
                  label: "Email",
                  type: "email",
                  required: true,
                },
                {
                  name: "message",
                  label: "Message",
                  type: "textarea",
                  required: true,
                  rows: 6,
                },
              ]}
            />
          </div>
        </FadeIn>
      </main>
      <SiteFooter />
    </>
  );
}
