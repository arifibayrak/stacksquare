"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  promoteCapture,
  dismissCapture,
  updateCapture,
} from "@/lib/actions/captures";
import { formatDate } from "@/lib/utils";
import type { Capture } from "@/db/schema";

const SENIORITY: Array<[string, string]> = [
  ["", "·"],
  ["peer", "Peer"],
  ["mid", "Mid"],
  ["senior", "Senior"],
  ["c_suite", "C-suite"],
];
const RELATIONSHIP: Array<[string, string]> = [
  ["", "·"],
  ["warm_1st", "Warm, 1st"],
  ["warm_2nd", "Warm, 2nd"],
  ["cold", "Cold"],
];

const inputCls =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-zinc-700 dark:bg-zinc-900";

function Field({
  label,
  name,
  defaultValue,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        className={inputCls}
      />
    </label>
  );
}

function Select({
  label,
  name,
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  options: Array<[string, string]>;
  defaultValue?: string | null;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      <select name={name} defaultValue={defaultValue ?? ""} className={inputCls}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

export function CaptureCard({ capture: c }: { capture: Capture }) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const sites = (((c.payload as { websites?: unknown })?.websites ??
    []) as string[]).filter((s) => typeof s === "string");

  function onSave(fd: FormData) {
    const raw = Object.fromEntries(fd.entries()) as Record<string, string>;
    start(async () => {
      try {
        await updateCapture(c.id, raw);
        toast.success("Capture saved");
        setEditing(false);
      } catch {
        toast.error("Save failed");
      }
    });
  }

  if (editing) {
    return (
      <li className="rounded-md border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <form action={onSave} className="grid gap-3 sm:grid-cols-2">
          <Field label="Name" name="name" defaultValue={c.name} />
          <Field label="LinkedIn URL" name="linkedinUrl" defaultValue={c.linkedinUrl} />
          <Field label="Role" name="role" defaultValue={c.role} />
          <Field label="Company" name="company" defaultValue={c.company} />
          <Field label="City" name="city" defaultValue={c.city} />
          <Field label="Email" name="email" type="email" defaultValue={c.email} />
          <Field label="Phone" name="phone" defaultValue={c.phone} />
          <Select
            label="Seniority"
            name="seniority"
            options={SENIORITY}
            defaultValue={c.seniority}
          />
          <Select
            label="Relationship"
            name="relationship"
            options={RELATIONSHIP}
            defaultValue={c.relationship}
          />
          <div className="col-span-full mt-1 flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-[var(--color-ink)] px-3 py-1.5 text-xs font-medium text-[var(--color-paper)] hover:opacity-80 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-start justify-between gap-4 rounded-md border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={c.linkedinUrl}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-[var(--color-ink)] hover:text-brand-600"
          >
            {c.name} ↗
          </a>
          {c.relationship ? (
            <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {c.relationship.replace("_", " ")}
            </span>
          ) : null}
        </div>
        <p className="mt-1 truncate text-sm text-zinc-600 dark:text-zinc-300">
          {[c.role, c.company].filter(Boolean).join(" · ") ||
            c.headline ||
            "No role detected"}
          {c.city ? ` · ${c.city}` : ""}
        </p>
        {(c.email || c.phone) && (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            {[c.email, c.phone].filter(Boolean).join(" · ")}
          </p>
        )}
        {sites.length > 0 && (
          <p className="mt-1 flex flex-wrap gap-x-3 text-xs">
            {sites.slice(0, 4).map((s) => (
              <a
                key={s}
                href={s}
                target="_blank"
                rel="noreferrer"
                className="text-brand-600 hover:underline"
              >
                {s.replace(/^https?:\/\/(www\.)?/, "").slice(0, 28)}
              </a>
            ))}
          </p>
        )}
        <p className="mt-1 text-xs text-zinc-500">
          Captured by {c.capturedBy} · {formatDate(c.capturedAt)}
        </p>
      </div>
      <CaptureActions
        id={c.id}
        name={c.name}
        onEdit={() => setEditing(true)}
      />
    </li>
  );
}

function CaptureActions({
  id,
  name,
  onEdit,
}: {
  id: string;
  name: string;
  onEdit: () => void;
}) {
  const [pending, start] = useTransition();

  return (
    <div className="flex shrink-0 flex-col gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            try {
              const res = await promoteCapture(id);
              toast.success(
                res.linked
                  ? `${name} linked to existing contact`
                  : `${name} added to contacts`,
              );
            } catch {
              toast.error("Promote failed");
            }
          })
        }
        className="rounded-md bg-[var(--color-ink)] px-3 py-1.5 text-xs font-medium text-[var(--color-paper)] hover:opacity-80 disabled:opacity-50"
      >
        {pending ? "…" : "Promote"}
      </button>
      <button
        type="button"
        onClick={onEdit}
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        Edit
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            try {
              await dismissCapture(id);
            } catch {
              toast.error("Dismiss failed");
            }
          })
        }
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        Dismiss
      </button>
    </div>
  );
}
