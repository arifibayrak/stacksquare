"use client";

import { useTransition } from "react";
import { createEpisode, updateEpisode } from "@/lib/actions/episodes";
import { EPISODE_STATUSES, EPISODE_STATUS_LABELS, type Episode } from "@/db/schema";

export function EpisodeForm({
  episode,
  guests,
}: {
  episode?: Episode;
  guests: Array<{ id: string; name: string }>;
}) {
  const [pending, start] = useTransition();
  const editing = !!episode;

  function onSubmit(fd: FormData) {
    start(async () => {
      if (editing) await updateEpisode(episode!.id, fd);
      else await createEpisode(fd);
    });
  }

  return (
    <form action={onSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" name="title" required defaultValue={episode?.title} />
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Guest
          </label>
          <select
            name="guestId"
            defaultValue={episode?.guestId ?? ""}
            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">none</option>
            {guests.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Status
          </label>
          <select
            name="status"
            defaultValue={episode?.status ?? "idea"}
            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {EPISODE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {EPISODE_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <Field
          label="Record date"
          name="recordDate"
          type="date"
          defaultValue={
            episode?.recordDate
              ? String(episode.recordDate).slice(0, 10)
              : ""
          }
        />
        <Field
          label="Record location"
          name="recordLocation"
          defaultValue={episode?.recordLocation ?? ""}
          placeholder="In person, London / Riverside"
        />
        <Field
          label="Publish date"
          name="publishDate"
          type="date"
          defaultValue={
            episode?.publishDate
              ? String(episode.publishDate).slice(0, 10)
              : ""
          }
        />
        <Field
          label="YouTube ID"
          name="youtubeId"
          defaultValue={episode?.youtubeId ?? ""}
          placeholder="dQw4w9WgXcQ"
        />
        <Field
          label="Spotify URL"
          name="spotifyUrl"
          defaultValue={episode?.spotifyUrl ?? ""}
        />
        <Field
          label="Duration (min)"
          name="durationMin"
          type="number"
          defaultValue={episode?.durationMin?.toString() ?? ""}
        />
        <Field
          label="Short clips published"
          name="shortClipsCount"
          type="number"
          defaultValue={episode?.shortClipsCount?.toString() ?? "0"}
        />
      </div>

      <Textarea
        label="Research doc"
        name="researchDoc"
        defaultValue={episode?.researchDoc ?? ""}
        rows={6}
        placeholder="Company history, recent deals, 3 unique angles, etc."
      />

      <Textarea
        label="Question outline"
        name="questionOutline"
        defaultValue={episode?.questionOutline ?? ""}
        rows={8}
        placeholder={"1. Origin\n2. Strategy block\n3. Capital block\n4. Wildcard\n5. Rapid-fire close"}
      />

      <Textarea
        label="Show notes"
        name="showNotes"
        defaultValue={episode?.showNotes ?? ""}
        rows={6}
      />

      <Textarea
        label="Transcript"
        name="transcript"
        defaultValue={episode?.transcript ?? ""}
        rows={6}
        placeholder="Paste the transcript when ready (used for AI clip suggestions)."
      />

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {pending ? "Saving…" : editing ? "Save changes" : "Create episode"}
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
}: {
  label: string;
  name: string;
  defaultValue?: string;
  rows?: number;
  placeholder?: string;
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
        className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-mono dark:border-zinc-700 dark:bg-zinc-900"
      />
    </div>
  );
}
