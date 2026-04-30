"use client";

import { useTransition } from "react";
import { createTemplate } from "@/lib/actions/outreach";

const CHANNELS: Array<[string, string]> = [
  ["linkedin_dm", "LinkedIn DM"],
  ["email", "Email"],
  ["whatsapp", "WhatsApp"],
  ["intro_ask", "Intro ask"],
];

export function TemplateEditor() {
  const [pending, start] = useTransition();

  function onSubmit(fd: FormData) {
    start(async () => {
      await createTemplate(fd);
    });
  }

  return (
    <form
      action={onSubmit}
      className="mt-4 space-y-4 rounded-md border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <Input name="name" label="Name" required placeholder="Warm DM v1" />
      <div>
        <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
          Channel
        </label>
        <select
          name="channel"
          required
          className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {CHANNELS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <Input
        name="subject"
        label="Subject (email only)"
        placeholder="Quick question, {firstName}"
      />
      <div>
        <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
          Body *
        </label>
        <textarea
          name="body"
          required
          rows={8}
          placeholder="Hi {firstName}, …"
          className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-mono dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <Input
        name="variables"
        label="Variables (comma-separated, optional)"
        placeholder="firstName, company, role"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {pending ? "Saving…" : "Save template"}
      </button>
    </form>
  );
}

function Input({
  name,
  label,
  required,
  placeholder,
}: {
  name: string;
  label: string;
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
        required={required}
        placeholder={placeholder}
        className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
    </div>
  );
}
