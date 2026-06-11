"use client";

import { useState } from "react";

export function NewsletterForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">(
    "idle",
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error();
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  }

  if (status === "ok") {
    return (
      <p className="rounded-md border border-[var(--color-rule)] bg-[var(--color-paper-soft)] px-4 py-3 text-base text-[var(--color-ink-soft)]">
        You&rsquo;re on the list. See you in the square.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-md items-end gap-2">
      <label htmlFor="newsletter-email" className="sr-only">
        Email
      </label>
      <input
        id="newsletter-email"
        name="email"
        type="email"
        required
        placeholder="you@example.com"
        className="h-12 min-w-0 flex-1 rounded-md border border-[var(--color-rule)] bg-[var(--color-paper)] px-4 text-base text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-ink)] focus:outline-none"
      />
      <button
        type="submit"
        disabled={status === "sending"}
        className="h-12 shrink-0 rounded-md bg-[var(--color-ink)] px-6 text-base font-medium text-[var(--color-paper)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-12px_rgba(26,26,26,0.5)] disabled:opacity-50"
      >
        {status === "sending" ? "Joining…" : "Join"}
      </button>
      {status === "error" && (
        <p className="self-center text-sm text-red-600">Try again.</p>
      )}
    </form>
  );
}
