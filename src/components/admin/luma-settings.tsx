"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setLumaCalendar } from "@/lib/actions/events";

export function LumaSettings({
  current,
  envFallback,
}: {
  current: string;
  envFallback: string | null;
}) {
  const [value, setValue] = useState(current);
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      try {
        await setLumaCalendar(value);
        toast.success("Luma calendar updated");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Update failed");
      }
    });
  }

  return (
    <div className="rounded-lg border border-[var(--color-rule)] bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold text-[var(--color-ink)]">
        Public events calendar
      </h2>
      <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
        Luma calendar id (e.g. cal-xxxxxxxx) or a full embed URL. This is the
        calendar embedded below for your team. Public visitors see the curated
        cards on /events, not this calendar.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={envFallback ?? "cal-xxxxxxxx"}
          className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      {!value && envFallback && (
        <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
          Currently falling back to the NEXT_PUBLIC_LUMA_CALENDAR_ID env value.
        </p>
      )}
      {!value && !envFallback && (
        <p className="mt-2 text-xs text-amber-600">
          Not set. The events calendar will show a placeholder until you add a
          Luma calendar.
        </p>
      )}
    </div>
  );
}
