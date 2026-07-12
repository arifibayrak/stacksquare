"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { QuickPill } from "@/components/admin/quick-pill";
import {
  addSeedProspects,
  discoverProspects,
  enrichProspect,
  promoteProspect,
  dismissProspect,
  setProspectTier,
  setSegmentMemberStatus,
} from "@/lib/actions/research";
import {
  PROSPECT_ROLE_LABELS,
  PROSPECT_TIERS,
  PROSPECT_TIER_LABELS,
  PROSPECT_STATUSES,
  PROSPECT_STATUS_LABELS,
} from "@/db/schema";

export type Row = {
  memberId: string;
  prospectId: string;
  tier: string | null;
  status: string;
  name: string;
  title: string | null;
  company: string | null;
  city: string | null;
  linkedinUrl: string | null;
  roles: string[];
  turkishSignal: string | null;
  londonSignal: string | null;
  email: string | null;
  enriched: boolean;
  contactId: string | null;
};

const inputCls =
  "block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-zinc-700 dark:bg-zinc-900";

const TIER_OPTIONS = [
  { value: "", label: "·" },
  ...PROSPECT_TIERS.map((t) => ({ value: t, label: PROSPECT_TIER_LABELS[t] })),
];
const STATUS_OPTIONS = PROSPECT_STATUSES.map((s) => ({
  value: s,
  label: PROSPECT_STATUS_LABELS[s],
}));

const msg = (e: unknown) => (e instanceof Error ? e.message : "Unknown error");

export function SeedForm({ segmentId }: { segmentId: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [pending, start] = useTransition();
  return (
    <div>
      <textarea
        ref={ref}
        rows={4}
        placeholder={
          "One per line. Name @ Company, or a LinkedIn URL:\nNazim Salur @ Getir\nhttps://www.linkedin.com/in/..."
        }
        className={inputCls}
      />
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          const raw = ref.current?.value ?? "";
          if (!raw.trim()) return;
          start(async () => {
            try {
              const r = await addSeedProspects(segmentId, raw);
              toast.success(`Added ${r.added} new · linked ${r.linked}`);
              if (ref.current) ref.current.value = "";
            } catch (e) {
              toast.error("Could not add seeds", { description: msg(e) });
            }
          });
        }}
        className="mt-2 rounded-md border border-zinc-300 px-4 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        {pending ? "Adding…" : "Add seeds"}
      </button>
    </div>
  );
}

export function DiscoverButton({ segmentId }: { segmentId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          try {
            const r = await discoverProspects(segmentId);
            toast.success(
              `Discovery: ${r.found} found · ${r.added} new · ${r.linked} added`,
            );
          } catch (e) {
            toast.error("Discovery failed", { description: msg(e) });
          }
        })
      }
      className="rounded-md bg-[var(--color-ink)] px-4 py-1.5 text-sm font-medium text-[var(--color-paper)] hover:opacity-80 disabled:opacity-50"
    >
      {pending ? "Searching the web…" : "Discover with web search"}
    </button>
  );
}

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

export function ProspectRow({
  row,
  segmentId,
}: {
  row: Row;
  segmentId: string;
}) {
  const [pending, start] = useTransition();
  const [dismissed, setDismissed] = useState(row.status === "dismissed");
  const detailHref = `/admin/research/${segmentId}/${row.memberId}`;

  return (
    <tr
      className={
        "hover:bg-zinc-50 dark:hover:bg-zinc-800/50 " +
        (dismissed ? "opacity-50" : "")
      }
    >
      <td className="px-4 py-3">
        <Link
          href={detailHref}
          className="font-medium text-[var(--color-ink)] hover:text-brand-600"
        >
          {row.name}
        </Link>
        {row.status === "discovered" && (
          <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-700 dark:bg-amber-950 dark:text-amber-400">
            unverified
          </span>
        )}
        {row.city && (
          <span className="ml-2 text-xs text-[var(--color-ink-muted)]">
            {row.city}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-[var(--color-ink-soft)]">
        {row.title}
        {row.company ? ` · ${row.company}` : ""}
      </td>
      <td className="px-4 py-3">
        <span className="flex flex-wrap gap-1">
          {row.roles.map((r) => (
            <span
              key={r}
              className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] dark:bg-zinc-800"
            >
              {PROSPECT_ROLE_LABELS[r as keyof typeof PROSPECT_ROLE_LABELS] ?? r}
            </span>
          ))}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="flex flex-col gap-0.5">
          <Signal label="TR" value={row.turkishSignal} />
          <Signal label="LDN" value={row.londonSignal} />
        </span>
      </td>
      <td className="px-4 py-3">
        <QuickPill
          label="Tier"
          current={row.tier ?? ""}
          options={TIER_OPTIONS}
          onChange={(next) => setProspectTier(row.memberId, next)}
        />
      </td>
      <td className="px-4 py-3">
        <QuickPill
          label="Status"
          current={row.status}
          options={STATUS_OPTIONS}
          onChange={(next) => setSegmentMemberStatus(row.memberId, next)}
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {row.contactId ? (
            <Link
              href={`/admin/contacts/${row.contactId}`}
              className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Contact ↗
            </Link>
          ) : (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    try {
                      await enrichProspect(row.prospectId);
                      toast.success(`Enriched ${row.name}`);
                    } catch (e) {
                      toast.error("Enrich failed", { description: msg(e) });
                    }
                  })
                }
                className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                {pending ? "…" : row.enriched ? "Re-enrich" : "Enrich"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    try {
                      await promoteProspect(row.memberId);
                      toast.success(`${row.name} added to contacts`);
                    } catch (e) {
                      toast.error("Promote failed", { description: msg(e) });
                    }
                  })
                }
                className="rounded-md bg-[var(--color-ink)] px-2.5 py-1 text-xs font-medium text-[var(--color-paper)] hover:opacity-80 disabled:opacity-50"
              >
                Promote
              </button>
            </>
          )}
          {!dismissed && row.status !== "promoted" && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  try {
                    await dismissProspect(row.memberId);
                    setDismissed(true);
                  } catch (e) {
                    toast.error("Dismiss failed", { description: msg(e) });
                  }
                })
              }
              className="text-xs text-zinc-400 hover:text-zinc-600"
            >
              Dismiss
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
