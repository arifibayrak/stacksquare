"use client";

import { useState } from "react";

export type SubmissionKind = "apply" | "guest" | "contact" | "speaker" | "partner";

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
      <div className="rounded-md border border-[var(--color-rule)] bg-[var(--color-paper-soft)] p-6 text-base text-[var(--color-ink-soft)]">
        Thanks. We&rsquo;ll be in touch.
      </div>
    );
  }

  const inputClasses =
    "mt-1.5 block w-full rounded-md border border-[var(--color-rule)] bg-[var(--color-paper)] px-4 py-2.5 text-base text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-ink)] focus:outline-none";

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {fields.map((f) => (
        <div key={f.name}>
          <label
            htmlFor={`${kind}-${f.name}`}
            className="block font-mono text-xs uppercase tracking-[0.14em] text-[var(--color-ink-muted)]"
          >
            {f.label}
            {f.required && <span className="text-[var(--color-brand-600)]"> *</span>}
          </label>
          {f.type === "textarea" ? (
            <textarea
              id={`${kind}-${f.name}`}
              name={f.name}
              rows={f.rows ?? 4}
              required={f.required}
              placeholder={f.placeholder}
              className={inputClasses}
            />
          ) : (
            <input
              id={`${kind}-${f.name}`}
              name={f.name}
              type={f.type}
              required={f.required}
              placeholder={f.placeholder}
              className={inputClasses}
            />
          )}
        </div>
      ))}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={status === "sending"}
        className="rounded-md bg-[var(--color-ink)] px-6 py-3 text-base font-medium text-[var(--color-paper)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-12px_rgba(26,26,26,0.5)] disabled:opacity-50"
      >
        {status === "sending" ? "Sending…" : submitLabel}
      </button>
    </form>
  );
}
