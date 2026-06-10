"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { addTask, deleteTask, toggleTask } from "@/lib/actions/event-plan";
import {
  EVENT_TASK_SECTIONS,
  EVENT_TASK_SECTION_LABELS,
  OWNERS,
  OWNER_LABELS,
} from "@/db/schema";
import { formatDate } from "@/lib/utils";

export type TaskRow = {
  id: string;
  section: (typeof EVENT_TASK_SECTIONS)[number];
  title: string;
  owner: (typeof OWNERS)[number] | null;
  dueDate: string | null;
  done: boolean;
};

export function TasksSection({
  eventId,
  tasks,
}: {
  eventId: string;
  tasks: TaskRow[];
}) {
  return (
    <section id="tasks" className="scroll-mt-20">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-500">
        Tasks
      </h2>
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        {EVENT_TASK_SECTIONS.map((section) => (
          <TaskColumn
            key={section}
            eventId={eventId}
            section={section}
            tasks={tasks.filter((t) => t.section === section)}
          />
        ))}
      </div>
    </section>
  );
}

function TaskColumn({
  eventId,
  section,
  tasks,
}: {
  eventId: string;
  section: (typeof EVENT_TASK_SECTIONS)[number];
  tasks: TaskRow[];
}) {
  const [pending, start] = useTransition();
  const open = tasks.filter((t) => !t.done).length;

  function onAdd(fd: FormData) {
    start(async () => {
      try {
        await addTask(eventId, fd);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Add failed");
      }
    });
  }

  function onToggle(id: string, done: boolean) {
    start(async () => {
      try {
        await toggleTask(id, done);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Update failed");
      }
    });
  }

  function onDelete(id: string) {
    start(async () => {
      try {
        await deleteTask(id);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Delete failed");
      }
    });
  }

  return (
    <div className="flex flex-col rounded-lg border border-[var(--color-rule)] bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between border-b border-[var(--color-rule)] px-3 py-2.5 dark:border-zinc-800">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.14em]">
          {EVENT_TASK_SECTION_LABELS[section]}
        </h3>
        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] tabular-nums text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          {open} open
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2">
        {tasks.map((t) => (
          <div
            key={t.id}
            className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            <input
              type="checkbox"
              checked={t.done}
              onChange={(e) => onToggle(t.id, e.target.checked)}
              disabled={pending}
              className="h-4 w-4 shrink-0 rounded border-zinc-300 dark:border-zinc-700"
            />
            <span
              className={
                "min-w-0 flex-1 truncate" +
                (t.done ? " text-zinc-400 line-through" : "")
              }
            >
              {t.title}
            </span>
            {t.owner && (
              <span className="shrink-0 rounded bg-zinc-100 px-1 py-0.5 text-[9px] uppercase text-zinc-500 dark:bg-zinc-800">
                {OWNER_LABELS[t.owner]}
              </span>
            )}
            {t.dueDate && (
              <span className="shrink-0 font-mono text-[10px] text-zinc-400">
                {formatDate(t.dueDate)}
              </span>
            )}
            <button
              type="button"
              onClick={() => onDelete(t.id)}
              disabled={pending}
              className="shrink-0 text-xs text-zinc-300 opacity-0 hover:text-red-600 group-hover:opacity-100 disabled:opacity-50"
              aria-label={`Delete ${t.title}`}
            >
              ✕
            </button>
          </div>
        ))}
        {tasks.length === 0 && (
          <p className="px-2 py-3 text-center text-[11px] text-zinc-400">
            Empty
          </p>
        )}
      </div>
      <form
        action={onAdd}
        className="flex items-center gap-1.5 border-t border-[var(--color-rule)] p-2 dark:border-zinc-800"
      >
        <input type="hidden" name="section" value={section} />
        <input
          name="title"
          required
          placeholder="Add task..."
          className="min-w-0 flex-1 rounded border border-zinc-200 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950"
        />
        <select
          name="owner"
          defaultValue=""
          className="rounded border border-zinc-200 bg-white px-1 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950"
        >
          <option value="">Who</option>
          {OWNERS.map((o) => (
            <option key={o} value={o}>
              {OWNER_LABELS[o]}
            </option>
          ))}
        </select>
        <input
          name="dueDate"
          type="date"
          className="rounded border border-zinc-200 bg-white px-1 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-zinc-900 px-2 py-1.5 text-xs font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          +
        </button>
      </form>
    </div>
  );
}
