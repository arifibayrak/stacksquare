import { SiteNav, SiteFooter } from "@/components/site-nav";
import { SubmissionForm } from "@/components/submission-form";

export const metadata = { title: "Contact · StackSquare" };

export default function ContactPage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-4xl font-semibold tracking-tight">Contact</h1>
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">
          Press, sponsorship, or anything else.
        </p>

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
      </main>
      <SiteFooter />
    </>
  );
}
