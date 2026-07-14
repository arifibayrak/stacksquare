"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { QuickPill } from "@/components/admin/quick-pill";
import {
  ATTENDEE_STATUSES,
  ATTENDEE_STATUS_LABELS,
  ATTENDEE_FOLLOW_UPS,
  ATTENDEE_FOLLOW_UP_LABELS,
} from "@/db/schema";
import {
  importAttendeesCsv,
  parseAttendeesPaste,
  commitAttendees,
  setAttendeeFollowUp,
  promoteAttendee,
  deleteAttendee,
} from "@/lib/actions/attendees";

type Status = (typeof ATTENDEE_STATUSES)[number];
type FollowUp = (typeof ATTENDEE_FOLLOW_UPS)[number];

export type AttendeeRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: Status;
  followUp: FollowUp;
  contactId: string | null;
};

type PreviewRow = {
  name: string;
  email: string | null;
  phone: string | null;
  status: Status;
};

const PRIMARY =
  "rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900";
const GHOST =
  "rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800";

export function AttendeesSection({
  eventId,
  attendees,
}: {
  eventId: string;
  attendees: AttendeeRow[];
}) {
  return (
    <section id="attendees" className="scroll-mt-20">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-500">
        Attendees
      </h2>
      <p className="mt-1 text-xs text-zinc-400">
        Import the Luma guest CSV, then work the follow-up. Guest data stays
        admin-only and never reaches the public site.
      </p>
      <div className="mt-3 space-y-4">
        <ImportControls eventId={eventId} />
        {attendees.length === 0 ? (
          <p className="text-xs text-zinc-400">
            No attendees yet. Import a guest list above.
          </p>
        ) : (
          <Inbox attendees={attendees} />
        )}
      </div>
    </section>
  );
}

function ImportControls({ eventId }: { eventId: string }) {
  const [pending, start] = useTransition();
  const [parsing, startParse] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);

  function onCsv() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error("Choose a CSV file first");
      return;
    }
    start(async () => {
      try {
        const text = await file.text();
        const res = await importAttendeesCsv(eventId, text);
        toast.success(
          `Imported ${res.imported}, updated ${res.updated}` +
            (res.skipped ? `, skipped ${res.skipped}` : ""),
        );
        if (fileRef.current) fileRef.current.value = "";
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Import failed");
      }
    });
  }

  function onParse() {
    if (!pasteText.trim()) {
      toast.error("Paste a guest list first");
      return;
    }
    startParse(async () => {
      try {
        const res = await parseAttendeesPaste(eventId, pasteText);
        setPreview(res.attendees);
        if (res.attendees.length === 0) toast.error("No guests found in that text");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Parse failed");
      }
    });
  }

  function onCommit() {
    if (!preview || preview.length === 0) return;
    start(async () => {
      try {
        const res = await commitAttendees(eventId, preview);
        toast.success(`Imported ${res.imported}, updated ${res.updated}`);
        setPreview(null);
        setPasteText("");
        setShowPaste(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Import failed");
      }
    });
  }

  return (
    <div className="space-y-3 rounded-lg border border-[var(--color-rule)] bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="max-w-full text-sm text-zinc-600 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-zinc-200 dark:text-zinc-400 dark:file:bg-zinc-800"
        />
        <button type="button" onClick={onCsv} disabled={pending} className={PRIMARY}>
          {pending ? "Importing…" : "Import CSV"}
        </button>
        <button
          type="button"
          onClick={() => setShowPaste((v) => !v)}
          className={GHOST}
        >
          {showPaste ? "Hide paste" : "Paste instead"}
        </button>
      </div>
      <p className="text-[11px] text-zinc-400">
        Luma event, Manage guests, Export, then upload the CSV here. Re-importing
        updates rows and keeps your follow-up state.
      </p>

      {showPaste && (
        <div className="space-y-2 border-t border-[var(--color-rule)] pt-3 dark:border-zinc-800">
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={5}
            placeholder="Paste a guest list (CSV, a table, or a plain list). An AI parses it into attendees for review."
            className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onParse}
              disabled={parsing}
              className={GHOST}
            >
              {parsing ? "Parsing…" : "Parse with AI"}
            </button>
            {preview && (
              <span className="text-xs text-zinc-500">
                {preview.length} found
              </span>
            )}
          </div>
          {preview && preview.length > 0 && (
            <div className="overflow-hidden rounded-md border border-[var(--color-rule)] dark:border-zinc-800">
              <ul className="max-h-48 divide-y divide-[var(--color-rule)] overflow-auto text-sm dark:divide-zinc-800">
                {preview.map((p, i) => (
                  <li key={i} className="flex gap-2 px-3 py-1.5">
                    <span className="min-w-0 flex-1 truncate">{p.name}</span>
                    <span className="min-w-0 truncate text-zinc-400">
                      {p.email ?? ""}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-end border-t border-[var(--color-rule)] p-2 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={onCommit}
                  disabled={pending}
                  className={PRIMARY}
                >
                  {pending ? "Importing…" : `Import ${preview.length}`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type Filter = "all" | FollowUp;

const TABS: Array<{ key: Filter; label: string }> = [
  { key: "all", label: "All" },
  { key: "to_contact", label: "To contact" },
  { key: "contacted", label: "Contacted" },
  { key: "promoted", label: "Promoted" },
  { key: "skip", label: "Skip" },
];

function Inbox({ attendees }: { attendees: AttendeeRow[] }) {
  const [tab, setTab] = useState<Filter>("all");

  const counts = useMemo(() => {
    const c: Record<Filter, number> = {
      all: attendees.length,
      to_contact: 0,
      contacted: 0,
      promoted: 0,
      skip: 0,
    };
    for (const a of attendees) c[a.followUp]++;
    return c;
  }, [attendees]);

  const filtered =
    tab === "all" ? attendees : attendees.filter((a) => a.followUp === tab);

  return (
    <div>
      <div className="flex w-fit flex-wrap gap-1 rounded-lg border border-[var(--color-rule)] bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={
                "rounded-md px-3 py-1.5 text-sm transition-colors " +
                (active
                  ? "bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50")
              }
            >
              {t.label}
              <span className="ml-1.5 font-mono text-[10px] tabular-nums text-zinc-400">
                {counts[t.key]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 divide-y divide-[var(--color-rule)] overflow-hidden rounded-lg border border-[var(--color-rule)] bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
        {filtered.map((a) => (
          <AttendeeLine key={a.id} attendee={a} />
        ))}
        {filtered.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-zinc-400">
            Nothing here.
          </p>
        )}
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: Status }) {
  const tone =
    status === "attended"
      ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
      : status === "no_show"
        ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
        : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400";
  return (
    <span
      className={"shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium " + tone}
    >
      {ATTENDEE_STATUS_LABELS[status]}
    </span>
  );
}

function AttendeeLine({ attendee: a }: { attendee: AttendeeRow }) {
  const [pending, start] = useTransition();

  function onPromote() {
    start(async () => {
      try {
        await promoteAttendee(a.id);
        toast.success("Promoted to contact", { description: a.name });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Promote failed");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--color-ink)]">
          {a.name}
        </p>
        <p className="truncate text-[11px] text-zinc-400">
          {[a.email, a.phone].filter(Boolean).join(" · ") ||
            "no contact details"}
        </p>
      </div>
      <StatusChip status={a.status} />
      <QuickPill
        label="Follow-up"
        current={a.followUp}
        options={ATTENDEE_FOLLOW_UPS.map((f) => ({
          value: f,
          label: ATTENDEE_FOLLOW_UP_LABELS[f],
        }))}
        onChange={async (next) => {
          await setAttendeeFollowUp(a.id, next as FollowUp);
        }}
      />
      {a.contactId ? (
        <Link
          href={`/admin/contacts/${a.contactId}`}
          className="shrink-0 text-xs text-brand-600 hover:underline"
        >
          View contact ↗
        </Link>
      ) : (
        <button
          type="button"
          onClick={onPromote}
          disabled={pending}
          className="shrink-0 rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {pending ? "…" : "Promote"}
        </button>
      )}
      <DeleteAttendeeButton id={a.id} name={a.name} />
    </div>
  );
}

function DeleteAttendeeButton({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Remove ${name} from this event's attendees?`)) return;
        start(async () => {
          try {
            await deleteAttendee(id);
            toast.success("Attendee removed");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Delete failed");
          }
        });
      }}
      aria-label="Remove attendee"
      title="Remove attendee"
      className="shrink-0 rounded p-1 text-sm leading-none text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950"
    >
      ×
    </button>
  );
}
