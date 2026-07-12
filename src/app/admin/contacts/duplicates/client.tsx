"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { mergeContacts } from "@/lib/actions/dedup";
import { STAGE_LABELS } from "@/db/schema";
import { formatDate } from "@/lib/utils";

export type DupContact = {
  id: string;
  name: string;
  email: string | null;
  linkedinUrl: string | null;
  company: string | null;
  city: string | null;
  role: string | null;
  stage: keyof typeof STAGE_LABELS;
  createdAt: string;
};

export type Cluster = {
  id: string;
  reasons: string[];
  contacts: DupContact[];
};

const msg = (e: unknown) => (e instanceof Error ? e.message : "Unknown error");

function ClusterCard({ cluster }: { cluster: Cluster }) {
  const [primary, setPrimary] = useState(cluster.contacts[0]?.id ?? "");
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);

  if (done) return null;

  function merge() {
    const others = cluster.contacts.map((c) => c.id).filter((id) => id !== primary);
    if (!primary || others.length === 0) return;
    start(async () => {
      try {
        const r = await mergeContacts(primary, others);
        toast.success(`Merged ${r.merged} into one contact`);
        setDone(true);
      } catch (e) {
        toast.error("Merge failed", { description: msg(e) });
      }
    });
  }

  return (
    <li className="rounded-lg border border-[var(--color-rule)] bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
          {cluster.contacts.length} likely the same
        </span>
        {cluster.reasons.map((r) => (
          <span
            key={r}
            className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-700 dark:bg-amber-950 dark:text-amber-400"
          >
            {r}
          </span>
        ))}
      </div>

      <ul className="space-y-1.5">
        {cluster.contacts.map((c) => (
          <li key={c.id} className="flex items-start gap-3 text-sm">
            <input
              type="radio"
              name={`primary-${cluster.id}`}
              checked={primary === c.id}
              onChange={() => setPrimary(c.id)}
              className="mt-1"
              title="Keep this one"
            />
            <div className="min-w-0 flex-1">
              <Link
                href={`/admin/contacts/${c.id}`}
                className="font-medium text-[var(--color-ink)] hover:text-brand-600"
              >
                {c.name}
              </Link>
              <span className="ml-2 text-[var(--color-ink-soft)]">
                {[c.role, c.company].filter(Boolean).join(" · ")}
              </span>
              <div className="text-xs text-[var(--color-ink-muted)]">
                {[
                  c.email,
                  c.linkedinUrl?.replace(/^https?:\/\/(www\.)?/, ""),
                  c.city,
                  STAGE_LABELS[c.stage],
                  `added ${formatDate(c.createdAt)}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={merge}
          className="rounded-md bg-[var(--color-ink)] px-4 py-1.5 text-sm font-medium text-[var(--color-paper)] hover:opacity-80 disabled:opacity-50"
        >
          {pending ? "Merging…" : "Merge into selected"}
        </button>
        <span className="text-xs text-[var(--color-ink-muted)]">
          Keeps the selected record; fills its blanks and moves history from the
          others, then deletes them.
        </span>
      </div>
    </li>
  );
}

export function DuplicatesClient({ clusters }: { clusters: Cluster[] }) {
  return (
    <ul className="mt-4 space-y-3">
      {clusters.map((c) => (
        <ClusterCard key={c.id} cluster={c} />
      ))}
    </ul>
  );
}
