"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { createVenue, updateVenue } from "@/lib/actions/venues";
import type { Venue } from "@/db/schema";

export type ContactOption = {
  id: string;
  name: string;
  company: string | null;
};

export function VenueForm({
  venue,
  contacts,
}: {
  venue?: Venue;
  contacts: ContactOption[];
}) {
  const [pending, start] = useTransition();
  const editing = !!venue;

  function onSubmit(fd: FormData) {
    start(async () => {
      try {
        if (editing) {
          await updateVenue(venue!.id, fd);
          toast.success("Venue saved");
        } else {
          await createVenue(fd);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Save failed");
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Name"
          name="name"
          required
          defaultValue={venue?.name}
          placeholder="Imperial Business School"
        />
        <Field
          label="Area / address"
          name="area"
          defaultValue={venue?.area ?? ""}
          placeholder="South Kensington, London"
        />
        <Field
          label="Capacity"
          name="capacity"
          type="number"
          defaultValue={venue?.capacity?.toString() ?? ""}
          placeholder="60"
        />
        <Field
          label="Typical cost"
          name="typicalCost"
          defaultValue={venue?.typicalCost ?? ""}
          placeholder="Free for students, or GBP 200 per evening"
        />
        <Field
          label="Website / booking URL"
          name="url"
          defaultValue={venue?.url ?? ""}
          placeholder="https://..."
        />
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Contact (CRM)
          </label>
          <select
            name="contactId"
            defaultValue={venue?.contactId ?? ""}
            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">No CRM contact</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.company ? ` · ${c.company}` : ""}
              </option>
            ))}
          </select>
        </div>
        <Field
          label="Contact fallback (not in CRM)"
          name="contactFallback"
          defaultValue={venue?.contactFallback ?? ""}
          placeholder="Front desk, venue@example.com"
        />
      </div>

      <div>
        <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
          Internal notes (never public)
        </label>
        <textarea
          name="notes"
          rows={4}
          defaultValue={venue?.notes ?? ""}
          placeholder="Booking lead time, quirks, who to ask for."
          className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {pending ? "Saving…" : editing ? "Save changes" : "Create venue"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
    </div>
  );
}
