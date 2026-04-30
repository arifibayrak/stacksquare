import { SiteNav, SiteFooter } from "@/components/site-nav";
import { SubmissionForm } from "@/components/submission-form";

export const metadata = { title: "Apply — StackSquare" };

export default function ApplyPage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-2xl px-6 py-16">
        <p className="font-mono text-xs uppercase tracking-widest text-brand-600">
          Founding circle
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          Apply for the fireside
        </h1>
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">
          We&rsquo;re building a curated room of 10&ndash;15 ambitious peers.
          Tell us who you are and what you&rsquo;d add.
        </p>

        <div className="mt-10">
          <SubmissionForm
            kind="apply"
            submitLabel="Apply"
            fields={[
              { name: "name", label: "Name", type: "text", required: true },
              {
                name: "email",
                label: "Email",
                type: "email",
                required: true,
              },
              {
                name: "linkedin",
                label: "LinkedIn URL",
                type: "url",
                placeholder: "https://linkedin.com/in/…",
              },
              {
                name: "location",
                label: "City",
                type: "text",
                placeholder: "London",
              },
              {
                name: "background",
                label: "What's your background?",
                type: "textarea",
                required: true,
                placeholder:
                  "What you do, where you've worked, what you're working on now.",
              },
              {
                name: "topics",
                label: "What topics would you bring?",
                type: "textarea",
                required: true,
                placeholder: "What perspective do you add to a fireside?",
              },
            ]}
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
