"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { createEvent, updateEvent } from "@/lib/actions/events";
import {
  EVENT_STATUSES,
  EVENT_STATUS_LABELS,
  type EventItem,
} from "@/db/schema";

function toDatetimeLocal(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  // Render in local time for the datetime-local input.
  const off = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - off).toISOString().slice(0, 16);
}

export function EventForm({
  event,
  venues = [],
}: {
  event?: EventItem;
  venues?: { id: string; name: string; capacity: number | null }[];
}) {
  const [pending, start] = useTransition();
  const editing = !!event;

  function onSubmit(fd: FormData) {
    start(async () => {
      try {
        if (editing) {
          await updateEvent(event!.id, fd);
          toast.success("Event saved");
        } else {
          await createEvent(fd);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Save failed");
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-6">
      <Field
        label="Title"
        name="title"
        required
        defaultValue={event?.title}
        placeholder="Fireside with a founder"
      />

      <Textarea
        label="Summary"
        name="summary"
        defaultValue={event?.summary ?? ""}
        rows={3}
        mono={false}
        placeholder="One or two lines shown on the public site."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Date & time"
          name="startAt"
          type="datetime-local"
          defaultValue={toDatetimeLocal(event?.startAt)}
        />
        <Field
          label="Location"
          name="location"
          defaultValue={event?.location ?? ""}
          placeholder="Imperial Business School, London"
        />
        <Field
          label="Luma event URL"
          name="lumaUrl"
          defaultValue={event?.lumaUrl ?? ""}
          placeholder="https://lu.ma/your-event"
        />
        <Field
          label="Luma event id (optional)"
          name="lumaEventId"
          defaultValue={event?.lumaEventId ?? ""}
          placeholder="evt-xxxxxxxx"
        />
        <Field
          label="Cover image URL (optional)"
          name="coverImage"
          defaultValue={event?.coverImage ?? ""}
          placeholder="https://..."
        />
        <Textarea
          label="Photo gallery (one image URL per line, optional)"
          name="gallery"
          defaultValue={event?.gallery?.join("\n") ?? ""}
          rows={4}
          placeholder={"/events/my-event/1.jpg\n/events/my-event/2.jpg"}
        />
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Status
          </label>
          <select
            name="status"
            defaultValue={event?.status ?? "draft"}
            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {EVENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {EVENT_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <Field
          label="Sort order"
          name="sortOrder"
          type="number"
          defaultValue={event?.sortOrder?.toString() ?? "0"}
        />
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 text-sm text-[var(--color-ink)]">
            <input
              type="checkbox"
              name="featured"
              defaultChecked={event?.featured ?? false}
              className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
            />
            Featured on homepage
          </label>
        </div>
      </div>

      <div id="venue" className="scroll-mt-20">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-500">
          Venue and logistics (internal)
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Venue
            </label>
            <select
              name="venueId"
              defaultValue={event?.venueId ?? ""}
              className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="">No venue linked</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                  {v.capacity ? ` (cap ${v.capacity})` : ""}
                </option>
              ))}
            </select>
          </div>
          <Field
            label="Target headcount"
            name="targetHeadcount"
            type="number"
            defaultValue={event?.targetHeadcount?.toString() ?? ""}
            placeholder="40"
          />
          <Field
            label="Catering plan"
            name="catering"
            defaultValue={event?.catering ?? ""}
            placeholder="Pizza and soft drinks, ordered by Kerem"
          />
          <Field
            label="AV / room setup"
            name="avSetup"
            defaultValue={event?.avSetup ?? ""}
            placeholder="Two mics, projector, fireside seating"
          />
        </div>
        <div className="mt-4">
          <Textarea
            label="Run of show"
            name="runOfShow"
            defaultValue={event?.runOfShow ?? ""}
            rows={4}
            placeholder={"18:00 doors\n18:30 fireside\n19:15 Q&A\n19:30 mingling"}
          />
        </div>
      </div>

      <Textarea
        label="Internal notes (never public)"
        name="notes"
        defaultValue={event?.notes ?? ""}
        rows={4}
        placeholder="Prep, speaker logistics, follow-ups."
      />

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {pending ? "Saving…" : editing ? "Save changes" : "Create event"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
    </div>
  );
}

function Textarea({
  label,
  name,
  defaultValue,
  rows,
  placeholder,
  mono = true,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  rows?: number;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </label>
      <textarea
        name={name}
        rows={rows ?? 4}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={
          "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" +
          (mono ? " font-mono" : "")
        }
      />
    </div>
  );
}
