import { SiteNav, SiteFooter } from "@/components/site-nav";
import { SubmissionForm } from "@/components/submission-form";

export const metadata = { title: "Pitch a guest · StackSquare" };

export default function GuestPitchPage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-2xl px-6 py-16">
        <p className="font-mono text-xs uppercase tracking-widest text-brand-600">
          Guest pitch
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          Suggest a guest
        </h1>
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">
          Yourself or someone you&rsquo;d like to hear on the show.
        </p>

        <div className="mt-10">
          <SubmissionForm
            kind="guest"
            submitLabel="Pitch"
            fields={[
              {
                name: "your_name",
                label: "Your name",
                type: "text",
                required: true,
              },
              {
                name: "your_email",
                label: "Your email",
                type: "email",
                required: true,
              },
              {
                name: "guest_name",
                label: "Guest name",
                type: "text",
                required: true,
              },
              {
                name: "guest_role",
                label: "Role / company",
                type: "text",
                placeholder: "Partner at Index Ventures",
              },
              {
                name: "guest_linkedin",
                label: "Guest LinkedIn",
                type: "url",
              },
              {
                name: "why",
                label: "Why this guest?",
                type: "textarea",
                required: true,
                placeholder:
                  "What unique angle would they unlock? Be specific.",
              },
            ]}
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
