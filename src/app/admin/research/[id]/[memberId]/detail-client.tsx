"use client";

import Link from "next/link";
import { useRef, useTransition } from "react";
import { toast } from "sonner";
import {
  updateProspect,
  enrichProspect,
  promoteProspect,
  dismissProspectGlobal,
} from "@/lib/actions/research";

export type ProspectDetail = {
  memberId: string;
  segmentId: string;
  segmentSlug: string;
  prospectId: string;
  name: string;
  title: string | null;
  company: string | null;
  city: string | null;
  linkedinUrl: string | null;
  email: string | null;
  emailConfidence: string | null;
  roles: string[];
  bio: string | null;
  notes: string | null;
  discoveredVia: string | null;
  sourceUrl: string | null;
  turkishSignal: string | null;
  londonSignal: string | null;
  enrichedAt: string | null;
  contactId: string | null;
};

const inputCls =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-zinc-700 dark:bg-zinc-900";

const msg = (e: unknown) => (e instanceof Error ? e.message : "Unknown error");

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

export function ProspectDetailClient({ p }: { p: ProspectDetail }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();

  function values(): Record<string, string> {
    const fd = new FormData(formRef.current!);
    return Object.fromEntries(fd.entries()) as Record<string, string>;
  }

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-3">
      <form ref={formRef} className="lg:col-span-2 grid gap-3 sm:grid-cols-2">
        <Field label="Name" name="name" defaultValue={p.name} />
        <Field label="Title" name="title" defaultValue={p.title} />
        <Field label="Company" name="company" defaultValue={p.company} />
        <Field label="City" name="city" defaultValue={p.city} />
        <Field
          label="LinkedIn URL"
          name="linkedinUrl"
          defaultValue={p.linkedinUrl}
        />
        <Field label="Email" name="email" type="email" defaultValue={p.email} />
        <label className="block sm:col-span-2">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Roles (comma-separated: founder, operator, investor, ecosystem,
            organizer)
          </span>
          <input
            name="roles"
            defaultValue={p.roles.join(", ")}
            className={inputCls}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Bio
          </span>
          <textarea
            name="bio"
            rows={3}
            defaultValue={p.bio ?? ""}
            className={inputCls}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Notes (provenance / lawful basis / do-not-contact)
          </span>
          <textarea
            name="notes"
            rows={4}
            defaultValue={p.notes ?? ""}
            className={inputCls}
          />
        </label>

        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                try {
                  await updateProspect(p.prospectId, values());
                  toast.success("Saved");
                } catch (e) {
                  toast.error("Save failed", { description: msg(e) });
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
                  await enrichProspect(p.prospectId);
                  toast.success("Enriched");
                } catch (e) {
                  toast.error("Enrich failed", { description: msg(e) });
                }
              })
            }
            className="rounded-md border border-zinc-300 px-4 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            {pending ? "…" : "Enrich (web search)"}
          </button>
          {p.contactId ? (
            <Link
              href={`/admin/contacts/${p.contactId}`}
              className="rounded-md bg-[var(--color-ink)] px-4 py-1.5 text-sm font-medium text-[var(--color-paper)] hover:opacity-80"
            >
              View contact ↗
            </Link>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  try {
                    await promoteProspect(p.memberId);
                    toast.success(`${p.name} added to contacts`);
                  } catch (e) {
                    toast.error("Promote failed", { description: msg(e) });
                  }
                })
              }
              className="rounded-md bg-[var(--color-ink)] px-4 py-1.5 text-sm font-medium text-[var(--color-paper)] hover:opacity-80 disabled:opacity-50"
            >
              Promote to contact
            </button>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                try {
                  await dismissProspectGlobal(
                    p.prospectId,
                    "Removed from detail page",
                  );
                  toast.success("Marked do-not-contact across all databases");
                } catch (e) {
                  toast.error("Failed", { description: msg(e) });
                }
              })
            }
            className="ml-auto text-xs text-zinc-400 hover:text-red-600"
          >
            Remove (do-not-contact)
          </button>
        </div>
      </form>

      <aside className="space-y-3 text-sm">
        <div className="rounded-lg border border-[var(--color-rule)] bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-muted)]">
            Provenance
          </h3>
          <dl className="mt-2 space-y-1 text-[var(--color-ink-soft)]">
            <Prov label="Found via" value={p.discoveredVia} />
            <Prov
              label="Turkish signal"
              value={p.turkishSignal}
            />
            <Prov label="London signal" value={p.londonSignal} />
            <Prov label="Email conf." value={p.emailConfidence} />
            <Prov
              label="Enriched"
              value={p.enrichedAt ? p.enrichedAt.slice(0, 10) : null}
            />
          </dl>
          {p.sourceUrl && (
            <a
              href={p.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 block truncate text-xs text-brand-600 hover:underline"
            >
              Source ↗
            </a>
          )}
          {p.linkedinUrl && (
            <a
              href={p.linkedinUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block truncate text-xs text-brand-600 hover:underline"
            >
              LinkedIn ↗
            </a>
          )}
        </div>
      </aside>
    </div>
  );
}

function Prov({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-[var(--color-ink-muted)]">{label}</dt>
      <dd className="capitalize">{value ?? "·"}</dd>
    </div>
  );
}
