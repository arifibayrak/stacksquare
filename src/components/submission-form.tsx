"use client";

import { useState } from "react";

export type SubmissionKind = "apply" | "guest" | "contact";

type Field =
  | { name: string; label: string; type: "text" | "email" | "url"; required?: boolean; placeholder?: string }
  | { name: string; label: string; type: "textarea"; required?: boolean; placeholder?: string; rows?: number };

export function SubmissionForm({
  kind,
  fields,
  submitLabel = "Send",
}: {
  kind: SubmissionKind;
  fields: Field[];
  submitLabel?: string;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, payload: data }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Something went wrong");
      }
      setStatus("ok");
      e.currentTarget.reset();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  if (status === "ok") {
    return (
      <div className="rounded-md border border-green-200 bg-green-50 p-6 text-sm text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-100">
        Thanks — we&rsquo;ll be in touch.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {fields.map((f) => (
        <div key={f.name}>
          <label
            htmlFor={f.name}
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            {f.label}
            {f.required && <span className="text-red-500"> *</span>}
          </label>
          {f.type === "textarea" ? (
            <textarea
              id={f.name}
              name={f.name}
              rows={f.rows ?? 4}
              required={f.required}
              placeholder={f.placeholder}
              className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-zinc-700 dark:bg-zinc-900"
            />
          ) : (
            <input
              id={f.name}
              name={f.name}
              type={f.type}
              required={f.required}
              placeholder={f.placeholder}
              className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-zinc-700 dark:bg-zinc-900"
            />
          )}
        </div>
      ))}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {status === "sending" ? "Sending…" : submitLabel}
      </button>
    </form>
  );
}
