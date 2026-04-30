import { ContactForm } from "@/components/admin/contact-form";

export default function NewContactPage() {
  return (
    <div className="px-8 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">New contact</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Add someone to the pipeline.
      </p>

      <div className="mt-8 max-w-3xl">
        <ContactForm />
      </div>
    </div>
  );
}
