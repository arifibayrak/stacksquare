"use client";

import { useState, useTransition } from "react";
import { clipSuggestions } from "@/lib/actions/ai";

type Result = Awaited<ReturnType<typeof clipSuggestions>>;

export function ClipsClient({
  episodes,
}: {
  episodes: Array<{ id: string; label: string }>;
}) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (episodes.length === 0) {
    return (
      <p className="rounded-md border border-zinc-200 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
        No episodes with transcripts yet. Add a transcript on an episode
        detail page first.
      </p>
    );
  }

  function onSubmit(fd: FormData) {
    setError(null);
    setResult(null);
    const id = String(fd.get("episodeId"));
    start(async () => {
      try {
        const r = await clipSuggestions(id);
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
        className="flex gap-3 rounded-md border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <select
          name="episodeId"
          required
          className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {episodes.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {pending ? "Reading…" : "Find clips"}
        </button>
      </form>

      {error && (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {result && (
        <ul className="space-y-3">
          {result.data.clips.map((c, i) => (
            <li
              key={i}
              className="rounded-md border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{c.title}</h3>
                <span className="font-mono text-xs text-zinc-500">
                  {c.timestamp} · {c.durationSec}s
                </span>
              </div>
              <p className="mt-2 italic text-zinc-700 dark:text-zinc-300">
                &ldquo;{c.hook}&rdquo;
              </p>
              <p className="mt-2 text-xs text-zinc-500">{c.why}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
