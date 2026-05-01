"use client";

import { useState, useTransition } from "react";
import { enrichFromText } from "@/lib/actions/ai";

type Result = Awaited<ReturnType<typeof enrichFromText>>;

export function EnrichClient() {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(fd: FormData) {
    setError(null);
    setResult(null);
    const text = String(fd.get("text") ?? "");
    start(async () => {
      try {
        const r = await enrichFromText(text);
        setResult(r);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  return (
    <div className="space-y-6">
      <form
        action={onSubmit}
        className="space-y-3 rounded-md border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <textarea
          name="text"
          rows={12}
          required
          placeholder="Paste a LinkedIn bio, About section, or any context about a person…"
          className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-mono dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {pending ? "Thinking…" : "Enrich"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      {result && (
        <div className="rounded-md border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs text-zinc-500">
            Done in {result.elapsedMs}ms
          </p>
          <h2 className="mt-2 text-xl font-semibold">{result.data.name}</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {result.data.role}
            {result.data.company ? ` · ${result.data.company}` : ""}
            {result.data.city ? ` · ${result.data.city}` : ""}
          </p>

          <dl className="mt-6 space-y-4 text-sm">
            <div>
              <dt className="text-xs font-mono uppercase tracking-widest text-zinc-500">
                Fit score
              </dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums">
                {result.data.fitScore}/10
              </dd>
              <p className="text-zinc-600 dark:text-zinc-400">
                {result.data.fitReason}
              </p>
            </div>
            <div>
              <dt className="text-xs font-mono uppercase tracking-widest text-zinc-500">
                Expertise
              </dt>
              <dd className="mt-1 flex flex-wrap gap-2">
                {result.data.expertise.map((e) => (
                  <span
                    key={e}
                    className="rounded bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800"
                  >
                    {e}
                  </span>
                ))}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-mono uppercase tracking-widest text-zinc-500">
                Suggested angles
              </dt>
              <dd className="mt-1">
                <ul className="list-inside list-disc space-y-1">
                  {result.data.suggestedAngles.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </dd>
            </div>
          </dl>

          <p className="mt-6 text-xs text-zinc-500">
            Copy these fields into{" "}
            <a
              href="/admin/contacts/new"
              className="text-brand-600 hover:underline"
            >
              new contact
            </a>{" "}
            (manual paste; wiring auto-create is a future iteration).
          </p>
        </div>
      )}
    </div>
  );
}
