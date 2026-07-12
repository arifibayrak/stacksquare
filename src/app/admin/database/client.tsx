"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { promoteProspect, removeFromDatabase } from "@/lib/actions/research";
import { PROSPECT_ROLE_LABELS } from "@/db/schema";

export type DbRow = {
  prospectId: string;
  memberId: string;
  name: string;
  title: string | null;
  company: string | null;
  city: string | null;
  linkedinUrl: string | null;
  roles: string[];
  originSignal: string | null;
  locationSignal: string | null;
  lists: { id: string; name: string }[];
};

const msg = (e: unknown) => (e instanceof Error ? e.message : "Unknown error");

function Signal({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  const color =
    value === "high"
      ? "text-emerald-600 dark:text-emerald-400"
      : value === "medium"
        ? "text-amber-600 dark:text-amber-400"
        : "text-zinc-400";
  return (
    <span className={"font-mono text-[10px] uppercase " + color}>
      {label} {value[0]}
    </span>
  );
}

export function DatabaseRow({ row }: { row: DbRow }) {
  const [pending, start] = useTransition();
  const [gone, setGone] = useState(false);
  if (gone) return null;

  return (
    <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
      <td className="px-4 py-3">
        <span className="font-medium text-[var(--color-ink)]">{row.name}</span>
        {row.city && (
          <span className="ml-2 text-xs text-[var(--color-ink-muted)]">
            {row.city}
          </span>
        )}
        {row.linkedinUrl && (
          <a
            href={row.linkedinUrl}
            target="_blank"
            rel="noreferrer"
            className="ml-2 text-xs text-brand-600 hover:underline"
          >
            in ↗
          </a>
        )}
      </td>
      <td className="px-4 py-3 text-[var(--color-ink-soft)]">
        {row.title}
        {row.company ? ` · ${row.company}` : ""}
        {row.roles.length > 0 && (
          <span className="ml-2 inline-flex flex-wrap gap-1">
            {row.roles.map((r) => (
              <span
                key={r}
                className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] dark:bg-zinc-800"
              >
                {PROSPECT_ROLE_LABELS[r as keyof typeof PROSPECT_ROLE_LABELS] ??
                  r}
              </span>
            ))}
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <span className="flex flex-wrap gap-1">
          {row.lists.map((l) => (
            <Link
              key={l.id}
              href={`/admin/research/${l.id}`}
              className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-[var(--color-ink-soft)] hover:text-brand-600 dark:bg-zinc-800"
            >
              {l.name}
            </Link>
          ))}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="flex flex-col gap-0.5">
          <Signal label="ORIG" value={row.originSignal} />
          <Signal label="LOC" value={row.locationSignal} />
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                try {
                  await promoteProspect(row.memberId);
                  toast.success(`${row.name} added to contacts`);
                  setGone(true);
                } catch (e) {
                  toast.error("Add to contacts failed", { description: msg(e) });
                }
              })
            }
            className="rounded-md bg-[var(--color-ink)] px-2.5 py-1 text-xs font-medium text-[var(--color-paper)] hover:opacity-80 disabled:opacity-50"
            title="Create/link a contact (kept off the pipeline until you engage)"
          >
            Add to Contacts
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                try {
                  await removeFromDatabase(row.prospectId);
                  toast.success(`Removed ${row.name} from Database`);
                  setGone(true);
                } catch (e) {
                  toast.error("Remove failed", { description: msg(e) });
                }
              })
            }
            className="text-xs text-zinc-400 hover:text-zinc-600"
            title="Un-check across every list (keeps the person in Discover)"
          >
            Remove
          </button>
        </div>
      </td>
    </tr>
  );
}
