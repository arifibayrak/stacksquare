"use client";

import { useRef, useState, useTransition } from "react";
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
const CIRCLE: Array<[string, string]> = [
  ["inner", "Inner circle"],
  ["reach", "Within reach"],
  ["moonshot", "Moonshot"],
];
const OWNER: Array<[string, string]> = [
  ["arif", "Arif"],
  ["kerem", "Kerem"],
  ["both", "Both"],
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
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const sites = (((c.payload as { websites?: unknown })?.websites ??
    []) as string[]).filter((s) => typeof s === "string");

  const summary =
    [c.role, c.company].filter(Boolean).join(" · ") ||
    c.headline ||
    "No role detected";

  function values(): Record<string, string> {
    const fd = new FormData(formRef.current!);
    return Object.fromEntries(fd.entries()) as Record<string, string>;
  }

  function save(): Promise<void> {
    return updateCapture(c.id, values());
  }

  return (
    <li className="rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        <span
          className={
            "text-xs text-zinc-400 transition-transform " +
            (open ? "rotate-90" : "")
          }
        >
          ▶
        </span>
        <span className="min-w-0 flex-1">
          <span className="font-medium text-[var(--color-ink)]">{c.name}</span>
          <span className="ml-2 truncate text-sm text-zinc-500">{summary}</span>
        </span>
        <span className="hidden shrink-0 text-xs text-zinc-400 sm:inline">
          {c.capturedBy} · {formatDate(c.capturedAt)}
        </span>
      </button>

      {open && (
      <div className="border-t border-zinc-200 px-5 pb-5 pt-4 dark:border-zinc-800">
      <a
        href={c.linkedinUrl}
        target="_blank"
        rel="noreferrer"
        className="text-sm text-zinc-500 hover:text-brand-600"
      >
        Open on LinkedIn ↗
      </a>

      <form ref={formRef} className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Name" name="name" defaultValue={c.name} />
        <Field
          label="LinkedIn URL"
          name="linkedinUrl"
          defaultValue={c.linkedinUrl}
        />
        <Field label="Role" name="role" defaultValue={c.role} />
        <Field label="Company" name="company" defaultValue={c.company} />
        <Field label="City" name="city" defaultValue={c.city} />
        <Field
          label="Email"
          name="email"
          type="email"
          defaultValue={c.email}
        />
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
        <Select
          label="Circle"
          name="circle"
          options={CIRCLE}
          defaultValue={c.circle}
        />
        <Select
          label="Owner"
          name="capturedBy"
          options={OWNER}
          defaultValue={c.capturedBy}
        />
      </form>

      {sites.length > 0 && (
        <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs">
          <span className="text-zinc-500">Links:</span>
          {sites.slice(0, 6).map((s) => (
            <a
              key={s}
              href={s}
              target="_blank"
              rel="noreferrer"
              className="text-brand-600 hover:underline"
            >
              {s.replace(/^https?:\/\/(www\.)?/, "").slice(0, 30)}
            </a>
          ))}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              try {
                await save();
                await promoteCapture(c.id);
                toast.success(`${values().name || c.name} added to contacts`);
              } catch {
                toast.error("Promote failed");
              }
            })
          }
          className="rounded-md bg-[var(--color-ink)] px-4 py-1.5 text-sm font-medium text-[var(--color-paper)] hover:opacity-80 disabled:opacity-50"
        >
          {pending ? "…" : "Promote to contact"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              try {
                await save();
                toast.success("Saved");
              } catch {
                toast.error("Save failed");
              }
            })
          }
          className="rounded-md border border-zinc-300 px-4 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Save
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              try {
                await dismissCapture(c.id);
              } catch {
                toast.error("Dismiss failed");
              }
            })
          }
          className="ml-auto rounded-md border border-zinc-300 px-4 py-1.5 text-sm text-zinc-500 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Dismiss
        </button>
      </div>
      </div>
      )}
    </li>
  );
}
