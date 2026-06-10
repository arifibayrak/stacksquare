"use client";

import { useRef, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  addSpeaker,
  deleteSpeaker,
  setSpeakerStatus,
} from "@/lib/actions/event-plan";
import {
  SPEAKER_STATUSES,
  SPEAKER_STATUS_LABELS,
} from "@/db/schema";
import type { ContactOption } from "@/components/admin/venue-form";

export type SpeakerRow = {
  id: string;
  contactId: string;
  name: string;
  company: string | null;
  role: string | null;
  status: (typeof SPEAKER_STATUSES)[number];
};

export function SpeakersSection({
  eventId,
  speakers,
  contacts,
}: {
  eventId: string;
  speakers: SpeakerRow[];
  contacts: ContactOption[];
}) {
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function onAdd(fd: FormData) {
    const contactId = fd.get("contactId") as string;
    const role = (fd.get("role") as string) ?? "";
    if (!contactId) {
      toast.error("Pick a contact");
      return;
    }
    start(async () => {
      try {
        await addSpeaker(eventId, contactId, role);
        formRef.current?.reset();
        toast.success("Speaker added");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Add failed");
      }
    });
  }

  function onStatus(id: string, status: (typeof SPEAKER_STATUSES)[number]) {
    start(async () => {
      try {
        await setSpeakerStatus(id, status);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Update failed");
      }
    });
  }

  function onDelete(id: string) {
    start(async () => {
      try {
        await deleteSpeaker(id);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Delete failed");
      }
    });
  }

  return (
    <section id="speakers" className="scroll-mt-20">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-500">
        Speakers
      </h2>
      <div className="mt-3 space-y-1.5">
        {speakers.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-3 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          >
            <Link
              href={`/admin/contacts/${s.contactId}`}
              className="truncate font-medium hover:text-brand-600"
            >
              {s.name}
            </Link>
            {s.company ? (
              <span className="truncate text-xs text-zinc-400">{s.company}</span>
            ) : null}
            {s.role ? (
              <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                {s.role}
              </span>
            ) : null}
            <div className="ml-auto flex items-center gap-2">
              <select
                value={s.status}
                onChange={(e) =>
                  onStatus(s.id, e.target.value as (typeof SPEAKER_STATUSES)[number])
                }
                disabled={pending}
                className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950"
              >
                {SPEAKER_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {SPEAKER_STATUS_LABELS[st]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => onDelete(s.id)}
                disabled={pending}
                className="text-xs text-zinc-400 hover:text-red-600 disabled:opacity-50"
                aria-label={`Remove ${s.name}`}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
        {speakers.length === 0 && (
          <p className="text-xs text-zinc-400">No speakers yet.</p>
        )}
      </div>

      <form ref={formRef} action={onAdd} className="mt-3 flex flex-wrap items-end gap-2">
        <select
          name="contactId"
          defaultValue=""
          required
          className="w-56 rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">Pick a contact</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.company ? ` · ${c.company}` : ""}
            </option>
          ))}
        </select>
        <input
          name="role"
          placeholder="Role (speaker, moderator, panelist)"
          className="w-64 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Add speaker
        </button>
      </form>
    </section>
  );
}
