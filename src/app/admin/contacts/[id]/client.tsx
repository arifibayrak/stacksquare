"use client";

import { useTransition } from "react";
import { logTouch, deleteContact } from "@/lib/actions/contacts";

const CHANNELS: Array<[string, string]> = [
  ["linkedin_dm", "LinkedIn DM"],
  ["email", "Email"],
  ["whatsapp", "WhatsApp"],
  ["intro_ask", "Intro ask"],
  ["in_person", "In person"],
  ["call", "Call"],
  ["other", "Other"],
];

export function TouchLogForm({ contactId }: { contactId: string }) {
  const [pending, start] = useTransition();

  function onSubmit(fd: FormData) {
    start(async () => {
      await logTouch(fd);
      const form = document.getElementById(
        "touch-form-" + contactId,
      ) as HTMLFormElement | null;
      form?.reset();
    });
  }

  return (
    <form
      id={"touch-form-" + contactId}
      action={onSubmit}
      className="space-y-3 rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <input type="hidden" name="contactId" value={contactId} />
      <div className="grid grid-cols-2 gap-3">
        <select
          name="channel"
          defaultValue="linkedin_dm"
          className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {CHANNELS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <select
          name="owner"
          defaultValue="arif"
          className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="arif">Arif</option>
          <option value="kerem">Kerem</option>
          <option value="both">Both</option>
        </select>
      </div>
      <textarea
        name="summary"
        rows={3}
        required
        placeholder="What happened?"
        className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {pending ? "Logging…" : "Log touch"}
      </button>
    </form>
  );
}

export function DeleteContactButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  function onClick() {
    if (!confirm("Delete this contact and all touch history?")) return;
    start(() => deleteContact(id));
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
