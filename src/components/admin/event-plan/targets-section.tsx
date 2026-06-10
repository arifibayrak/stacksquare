"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  addTargets,
  deleteTarget,
  setTargetStatus,
} from "@/lib/actions/event-plan";
import {
  EVENT_TARGET_STATUSES,
  EVENT_TARGET_STATUS_LABELS,
} from "@/db/schema";
import type { ContactOption } from "@/components/admin/venue-form";

export type TargetRow = {
  id: string;
  contactId: string;
  name: string;
  company: string | null;
  status: (typeof EVENT_TARGET_STATUSES)[number];
  followedUp: boolean;
};

export function TargetsSection({
  eventId,
  targets,
  contacts,
}: {
  eventId: string;
  targets: TargetRow[];
  contacts: ContactOption[];
}) {
  const [pending, start] = useTransition();
  const [query, setQuery] = useState("");

  const targetedIds = useMemo(
    () => new Set(targets.map((t) => t.contactId)),
    [targets],
  );

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return contacts
      .filter((c) => !targetedIds.has(c.id))
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.company ?? "").toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [query, contacts, targetedIds]);

  const counts = EVENT_TARGET_STATUSES.map((s) => ({
    status: s,
    n: targets.filter((t) => t.status === s).length,
  }));

  function onAdd(contactIds: string[]) {
    start(async () => {
      try {
        await addTargets(eventId, contactIds);
        setQuery("");
        toast.success(
          contactIds.length === 1 ? "Added to targets" : `${contactIds.length} added`,
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Add failed");
      }
    });
  }

  function onStatus(
    id: string,
    status: (typeof EVENT_TARGET_STATUSES)[number],
  ) {
    start(async () => {
      try {
        await setTargetStatus(id, status);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Update failed");
      }
    });
  }

  function onDelete(id: string) {
    start(async () => {
      try {
        await deleteTarget(id);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Remove failed");
      }
    });
  }

  return (
    <section id="targets" className="scroll-mt-20">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-500">
          Targeted network
        </h2>
        <div className="ml-auto flex flex-wrap gap-1.5">
          {counts.map(({ status, n }) => (
            <span
              key={status}
              className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] tabular-nums text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
            >
              {EVENT_TARGET_STATUS_LABELS[status]} {n}
            </span>
          ))}
        </div>
      </div>

      <div className="relative mt-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search contacts to add..."
          className="w-full max-w-sm rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        {matches.length > 0 && (
          <div className="absolute z-10 mt-1 w-full max-w-sm rounded-md border border-zinc-200 bg-white shadow-md dark:border-zinc-700 dark:bg-zinc-900">
            {matches.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onAdd([c.id])}
                disabled={pending}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-zinc-50 disabled:opacity-50 dark:hover:bg-zinc-800"
              >
                <span>
                  {c.name}
                  {c.company ? (
                    <span className="ml-2 text-xs text-zinc-400">{c.company}</span>
                  ) : null}
                </span>
                <span className="text-xs text-zinc-400">+ add</span>
              </button>
            ))}
            {matches.length > 1 && (
              <button
                type="button"
                onClick={() => onAdd(matches.map((m) => m.id))}
                disabled={pending}
                className="w-full border-t border-zinc-100 px-3 py-2 text-left text-xs font-medium text-brand-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
              >
                Add all {matches.length} shown
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 space-y-1.5">
        {targets.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-3 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          >
            <Link
              href={`/admin/contacts/${t.contactId}`}
              className="truncate font-medium hover:text-brand-600"
            >
              {t.name}
            </Link>
            {t.company ? (
              <span className="truncate text-xs text-zinc-400">{t.company}</span>
            ) : null}
            {t.followedUp && (
              <span className="rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-950 dark:text-green-400">
                Followed up
              </span>
            )}
            <div className="ml-auto flex items-center gap-2">
              <select
                value={t.status}
                onChange={(e) =>
                  onStatus(
                    t.id,
                    e.target.value as (typeof EVENT_TARGET_STATUSES)[number],
                  )
                }
                disabled={pending}
                className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950"
              >
                {EVENT_TARGET_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {EVENT_TARGET_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => onDelete(t.id)}
                disabled={pending}
                className="text-xs text-zinc-400 hover:text-red-600 disabled:opacity-50"
                aria-label={`Remove ${t.name}`}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
        {targets.length === 0 && (
          <p className="text-xs text-zinc-400">
            No targets yet. Search your contacts above to build the invite list.
          </p>
        )}
      </div>
    </section>
  );
}
