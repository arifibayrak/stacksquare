"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  addSeedProspects,
  discoverProspects,
  enrichProspect,
  promoteProspect,
  dismissProspect,
  deleteMember,
  deleteDiscoveryRun,
  deleteSegment,
  setChecked,
} from "@/lib/actions/research";
import { PROSPECT_ROLES, PROSPECT_ROLE_LABELS } from "@/db/schema";
import { formatDate } from "@/lib/utils";

type Role = (typeof PROSPECT_ROLES)[number];

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
  originSignal: string | null;
  locationSignal: string | null;
  email: string | null;
  enriched: boolean;
  contactId: string | null;
  promoted: boolean;
  runId: string | null;
  runSeq: number | null;
};

export type RunCard = {
  id: string;
  seq: number;
  label: string;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  params: {
    location: string | null;
    origin: string | null;
    roles: string[];
    keywords: string | null;
    count: number | null;
  } | null;
  summary: {
    found?: number;
    added?: number;
    linked?: number;
    dropped?: number;
    webSearches?: number;
    byOrigin?: { high: number; medium: number; low: number };
    byLocation?: { high: number; medium: number; low: number };
  } | null;
  notes: string | null;
  liveCount: number;
};

const inputCls =
  "block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-zinc-700 dark:bg-zinc-900";

const msg = (e: unknown) => (e instanceof Error ? e.message : "Unknown error");

export function DeleteListButton({ id, name }: { id: string; name?: string }) {
  const [pending, start] = useTransition();
  function onClick() {
    if (
      !confirm(
        `Delete ${name ? `“${name}”` : "this list"}? People only in ` +
          "this list are removed. Anyone already added to Contacts is kept.",
      )
    )
      return;
    start(async () => {
      try {
        await deleteSegment(id);
      } catch (err) {
        if (err instanceof Error && err.message.includes("NEXT_REDIRECT"))
          throw err; // let Next's redirect through
        toast.error(msg(err) || "Delete failed");
      }
    });
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
    >
      {pending ? "Deleting…" : "Delete list"}
    </button>
  );
}

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

export function DiscoverForm({ segmentId }: { segmentId: string }) {
  const [pending, start] = useTransition();
  const [location, setLocation] = useState("");
  const [origin, setOrigin] = useState("");
  const [keywords, setKeywords] = useState("");
  const [count, setCount] = useState("12");
  const [roles, setRoles] = useState<Role[]>([]);

  function toggleRole(r: Role) {
    setRoles((rs) => (rs.includes(r) ? rs.filter((x) => x !== r) : [...rs, r]));
  }

  function run() {
    start(async () => {
      try {
        const r = await discoverProspects(segmentId, {
          location: location.trim() || undefined,
          origin: origin.trim() || undefined,
          keywords: keywords.trim() || undefined,
          roles: roles.length ? roles : undefined,
          count: count.trim() ? Number(count) : undefined,
        });
        const parts = [
          `${r.added} new`,
          r.linked ? `${r.linked} already in list` : "",
          r.dropped ? `${r.dropped} skipped (no source / off-location)` : "",
          `${r.rounds} round${r.rounds === 1 ? "" : "s"}`,
          r.exhausted && r.added < r.requested
            ? "web exhausted — no more verified matches"
            : "",
        ].filter(Boolean);
        toast.success(
          `Search #${r.seq}: ${r.added} of ${r.requested} requested`,
          { description: parts.join(" · ") },
        );
      } catch (e) {
        toast.error("Discovery failed", { description: msg(e) });
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Where based (e.g. London)"
          className={inputCls}
        />
        <input
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          placeholder="Origin / heritage (e.g. Turkish) — optional"
          className={inputCls}
        />
        <input
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="Titles / keywords (e.g. founder, CTO, technical)"
          className={inputCls}
        />
        <input
          type="number"
          min={1}
          max={30}
          value={count}
          onChange={(e) => setCount(e.target.value)}
          placeholder="How many (max 30)"
          className={inputCls}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-[var(--color-ink-muted)]">
          Who:
        </span>
        {PROSPECT_ROLES.map((r) => {
          const on = roles.includes(r);
          return (
            <button
              key={r}
              type="button"
              onClick={() => toggleRole(r)}
              className={
                "rounded-full border px-2.5 py-1 text-xs transition-colors " +
                (on
                  ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-paper)]"
                  : "border-zinc-300 text-[var(--color-ink-soft)] hover:border-[var(--color-ink)] dark:border-zinc-700")
              }
            >
              {PROSPECT_ROLE_LABELS[r]}
            </button>
          );
        })}
        <span className="text-xs text-[var(--color-ink-muted)]">
          (none = any role)
        </span>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={run}
        className="rounded-md bg-[var(--color-ink)] px-4 py-1.5 text-sm font-medium text-[var(--color-paper)] hover:opacity-80 disabled:opacity-50"
      >
        {pending ? "Searching the web…" : "Discover with web search"}
      </button>
    </div>
  );
}

function chip(text: string) {
  return (
    <span
      key={text}
      className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-[var(--color-ink-soft)] dark:bg-zinc-800"
    >
      {text}
    </span>
  );
}

function SearchRunCard({
  run,
  segmentId,
  active,
}: {
  run: RunCard;
  segmentId: string;
  active: boolean;
}) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [gone, setGone] = useState(false);
  if (gone) return null;

  const p = run.params;
  const s = run.summary;
  const paramChips = [
    p?.roles?.length && p.roles.map((r) => PROSPECT_ROLE_LABELS[r as Role] ?? r).join(", "),
    p?.keywords && `“${p.keywords}”`,
    p?.location && `in ${p.location}`,
    p?.origin && `origin ${p.origin}`,
    p?.count && `up to ${p.count}`,
  ].filter(Boolean) as string[];

  function del(alsoProspects: boolean) {
    start(async () => {
      try {
        await deleteDiscoveryRun(run.id, alsoProspects);
        toast.success(
          alsoProspects
            ? `Deleted Search #${run.seq} and its ${run.liveCount} people`
            : `Removed Search #${run.seq}`,
        );
        setGone(true);
      } catch (e) {
        toast.error("Delete failed", { description: msg(e) });
      }
    });
  }

  return (
    <li
      className={
        "rounded-lg border bg-white p-4 dark:bg-zinc-900 " +
        (active
          ? "border-brand-500 ring-1 ring-brand-500"
          : "border-[var(--color-rule)] dark:border-zinc-800")
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs font-semibold text-[var(--color-ink)]">
          Search #{run.seq}
        </span>
        <span className="text-sm text-[var(--color-ink-soft)]">{run.label}</span>
        {run.status === "error" && (
          <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-red-700 dark:bg-red-950 dark:text-red-400">
            failed
          </span>
        )}
        <span className="ml-auto text-xs text-[var(--color-ink-muted)]">
          {formatDate(run.createdAt)}
        </span>
      </div>

      {paramChips.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">{paramChips.map(chip)}</div>
      )}

      {run.status === "error" ? (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">
          {run.errorMessage}
        </p>
      ) : (
        <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
          {s?.found ?? 0} found · {s?.added ?? 0} new · {s?.linked ?? 0} linked
          {s?.dropped ? ` · ${s.dropped} skipped` : ""}
          {s?.webSearches ? ` · ${s.webSearches} web searches` : ""}
          {" · "}
          <span className="text-[var(--color-ink-soft)]">
            {run.liveCount} still here
          </span>
          {s?.byLocation && (
            <>
              {" · "}location {s.byLocation.high}H/{s.byLocation.medium}M/
              {s.byLocation.low}L
            </>
          )}
          {s?.byOrigin && (
            <>
              {" · "}origin {s.byOrigin.high}H/{s.byOrigin.medium}M/
              {s.byOrigin.low}L
            </>
          )}
        </p>
      )}

      {run.notes && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="text-xs text-brand-600 hover:underline"
          >
            {open ? "Hide findings" : "Show findings"}
          </button>
          {open && (
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-[var(--color-paper-soft)] p-3 text-xs text-[var(--color-ink-soft)] dark:bg-zinc-950">
              {run.notes}
            </pre>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
        {run.liveCount > 0 &&
          (active ? (
            <Link
              href={`/admin/research/${segmentId}`}
              className="rounded-md border border-brand-500 px-2.5 py-1 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/30"
            >
              Clear filter
            </Link>
          ) : (
            <Link
              href={`/admin/research/${segmentId}?run=${run.id}`}
              className="rounded-md border border-zinc-300 px-2.5 py-1 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              View {run.liveCount} results
            </Link>
          ))}

        {!confirm ? (
          <button
            type="button"
            onClick={() => setConfirm(true)}
            className="text-zinc-400 hover:text-red-600"
          >
            Delete search…
          </button>
        ) : (
          <span className="flex items-center gap-2">
            <span className="text-[var(--color-ink-muted)]">Delete:</span>
            <button
              type="button"
              disabled={pending}
              onClick={() => del(false)}
              className="rounded border border-zinc-300 px-2 py-0.5 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              title="Keep the people, just remove this search record"
            >
              record only
            </button>
            {run.liveCount > 0 && (
              <button
                type="button"
                disabled={pending}
                onClick={() => del(true)}
                className="rounded bg-red-600 px-2 py-0.5 font-medium text-white hover:bg-red-700 disabled:opacity-50"
                title="Delete this search and the people it found (promoted people are kept)"
              >
                + {run.liveCount} people
              </button>
            )}
            <button
              type="button"
              onClick={() => setConfirm(false)}
              className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
            >
              cancel
            </button>
          </span>
        )}
      </div>
    </li>
  );
}

export function SearchesPanel({
  runs,
  segmentId,
  ungroupedCount,
  activeRun,
}: {
  runs: RunCard[];
  segmentId: string;
  ungroupedCount: number;
  activeRun: string;
}) {
  if (runs.length === 0 && ungroupedCount === 0) return null;
  return (
    <div className="mt-8">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-ink)]">
        Searches
      </h2>
      <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
        Each web search is kept separate. Click a search to see only its people,
        expand its findings, or delete it.
      </p>
      <ul className="mt-3 space-y-2">
        {runs.map((r) => (
          <SearchRunCard
            key={r.id}
            run={r}
            segmentId={segmentId}
            active={activeRun === r.id}
          />
        ))}
        {ungroupedCount > 0 && (
          <li
            className={
              "flex flex-wrap items-center gap-2 rounded-lg border bg-white p-4 text-sm dark:bg-zinc-900 " +
              (activeRun === "none"
                ? "border-brand-500 ring-1 ring-brand-500"
                : "border-[var(--color-rule)] dark:border-zinc-800")
            }
          >
            <span className="font-mono text-xs font-semibold text-[var(--color-ink)]">
              Ungrouped
            </span>
            <span className="text-[var(--color-ink-soft)]">
              {ungroupedCount} added before search tracking, or seeded manually
            </span>
            {activeRun === "none" ? (
              <Link
                href={`/admin/research/${segmentId}`}
                className="ml-auto rounded-md border border-brand-500 px-2.5 py-1 text-xs text-brand-600"
              >
                Clear filter
              </Link>
            ) : (
              <Link
                href={`/admin/research/${segmentId}?run=none`}
                className="ml-auto rounded-md border border-zinc-300 px-2.5 py-1 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                View
              </Link>
            )}
          </li>
        )}
      </ul>
    </div>
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
  view,
}: {
  row: Row;
  segmentId: string;
  view: "all" | "checked";
}) {
  const [pending, start] = useTransition();
  const [dismissed, setDismissed] = useState(row.status === "dismissed");
  const [deleted, setDeleted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const detailHref = `/admin/research/${segmentId}/${row.memberId}`;
  const checked = row.status === "qualified";

  if (deleted || dismissed) return null;

  const run = (fn: () => Promise<unknown>, ok: string, fail: string) =>
    start(async () => {
      try {
        await fn();
        if (ok) toast.success(ok);
      } catch (e) {
        toast.error(fail, { description: msg(e) });
      }
    });

  const dotClass = checked
    ? "bg-emerald-500"
    : row.status === "discovered"
      ? "bg-amber-400"
      : "bg-zinc-300";
  const dotTitle = checked
    ? "Verified"
    : row.status === "discovered"
      ? "Not reviewed"
      : "Enriched";

  return (
    <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
      <td className="px-4 py-3">
        <span
          className={
            "mr-2 inline-block h-1.5 w-1.5 rounded-full align-middle " + dotClass
          }
          title={dotTitle}
        />
        <Link
          href={detailHref}
          className="font-medium text-[var(--color-ink)] hover:text-brand-600"
        >
          {row.name}
        </Link>
        {row.city && (
          <span className="ml-2 text-xs text-[var(--color-ink-muted)]">
            {row.city}
          </span>
        )}
        {row.runSeq != null && (
          <Link
            href={`/admin/research/${segmentId}?run=${row.runId}`}
            title="Filter to this search"
            className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-ink-muted)] hover:text-brand-600 dark:bg-zinc-800"
          >
            #{row.runSeq}
          </Link>
        )}
      </td>
      <td className="px-4 py-3 text-[var(--color-ink-soft)]">
        {[row.title, row.company].filter(Boolean).join(" · ")}
        {row.roles.length > 0 && (
          <span className="ml-2 inline-flex flex-wrap gap-1 align-middle">
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
        <span className="flex flex-col gap-0.5">
          <Signal label="ORIG" value={row.originSignal} />
          <Signal label="LOC" value={row.locationSignal} />
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          {row.promoted ? (
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
                  run(
                    () => setChecked(row.memberId, !checked),
                    checked ? `Unverified ${row.name}` : `Verified ${row.name}`,
                    "Failed",
                  )
                }
                className={
                  "rounded-md border px-2.5 py-1 text-xs disabled:opacity-50 " +
                  (checked
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : "border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800")
                }
                title={checked ? "Verified. Click to un-verify." : "Mark verified"}
              >
                {checked ? "✓ Verified" : "Verify"}
              </button>
              {view === "checked" && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    run(
                      () => promoteProspect(row.memberId),
                      `${row.name} added to contacts`,
                      "Add to contacts failed",
                    )
                  }
                  className="rounded-md bg-[var(--color-ink)] px-2.5 py-1 text-xs font-medium text-[var(--color-paper)] hover:opacity-80 disabled:opacity-50"
                  title="Create/link a contact (kept off the pipeline until you engage)"
                >
                  Add to Contacts
                </button>
              )}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  className="rounded-md px-2 py-1 text-sm leading-none text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
                  aria-label="More actions"
                >
                  ⋯
                </button>
                {menuOpen && (
                  <>
                    <button
                      type="button"
                      aria-hidden
                      tabIndex={-1}
                      onClick={() => {
                        setMenuOpen(false);
                        setConfirmDel(false);
                      }}
                      className="fixed inset-0 z-10 cursor-default"
                    />
                    <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-md border border-[var(--color-rule)] bg-white py-1 text-xs shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          setMenuOpen(false);
                          run(
                            () => enrichProspect(row.prospectId),
                            `Enriched ${row.name}`,
                            "Enrich failed",
                          );
                        }}
                        className="block w-full px-3 py-1.5 text-left hover:bg-zinc-50 disabled:opacity-50 dark:hover:bg-zinc-800"
                      >
                        {row.enriched ? "Re-enrich (web)" : "Enrich (web)"}
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          setMenuOpen(false);
                          run(
                            () =>
                              dismissProspect(row.memberId).then(() =>
                                setDismissed(true),
                              ),
                            `Dismissed ${row.name}`,
                            "Dismiss failed",
                          );
                        }}
                        className="block w-full px-3 py-1.5 text-left hover:bg-zinc-50 disabled:opacity-50 dark:hover:bg-zinc-800"
                      >
                        Dismiss
                      </button>
                      {confirmDel ? (
                        <div className="flex items-center gap-2 px-3 py-1.5">
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() =>
                              run(
                                () =>
                                  deleteMember(row.memberId).then(() =>
                                    setDeleted(true),
                                  ),
                                `Deleted ${row.name}`,
                                "Delete failed",
                              )
                            }
                            className="rounded bg-red-600 px-2 py-0.5 font-medium text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDel(false)}
                            className="text-[var(--color-ink-muted)]"
                          >
                            cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDel(true)}
                          className="block w-full px-3 py-1.5 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
