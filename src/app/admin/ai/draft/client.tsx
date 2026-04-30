"use client";

import { useState, useTransition } from "react";
import { draftOutreach } from "@/lib/actions/ai";

type Lite = { id: string; name: string; stage: string };

export function DraftClient({ contacts }: { contacts: Lite[] }) {
  const [pending, start] = useTransition();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(fd: FormData) {
    setError(null);
    const opts = {
      contactId: String(fd.get("contactId")),
      channel: String(fd.get("channel")) as "linkedin_dm" | "email" | "intro_ask",
      angle: String(fd.get("angle") ?? "") || undefined,
      voice: String(fd.get("voice") ?? "arif") as "arif" | "kerem",
    };
    start(async () => {
      try {
        const r = await draftOutreach(opts);
        setText(r.text);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  return (
    <div className="space-y-6">
      <form
        action={onSubmit}
        className="space-y-4 rounded-md border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Contact
            </label>
            <select
              name="contactId"
              required
              className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.stage})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Channel
            </label>
            <select
              name="channel"
              defaultValue="linkedin_dm"
              className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="linkedin_dm">LinkedIn DM</option>
              <option value="email">Email</option>
              <option value="intro_ask">Intro ask</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Voice
            </label>
            <select
              name="voice"
              defaultValue="arif"
              className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="arif">Arif</option>
              <option value="kerem">Kerem</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Angle (optional)
          </label>
          <input
            name="angle"
            placeholder="Their recent fund close, talk at SuperReturn, etc."
            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {pending ? "Drafting…" : "Draft message"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      {text && (
        <div className="rounded-md border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-500">
              Draft
            </h2>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(text)}
              className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Copy
            </button>
          </div>
          <pre className="mt-3 whitespace-pre-wrap text-sm">{text}</pre>
        </div>
      )}
    </div>
  );
}
