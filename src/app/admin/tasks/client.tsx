"use client";

import {
  useOptimistic,
  useRef,
  useState,
  useTransition,
  startTransition,
} from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { Task } from "@/db/schema";
import { OWNERS, OWNER_LABELS } from "@/db/schema";
import { QuickPill } from "@/components/admin/quick-pill";
import {
  createTask,
  toggleTaskDone,
  setTaskOwner,
  setTaskPriority,
  setTaskDue,
  deleteTask,
} from "@/lib/actions/tasks";
import { formatDate, daysFromNow } from "@/lib/utils";

export type TaskRow = Task & {
  contactName: string | null;
  eventTitle: string | null;
};

type Owner = (typeof OWNERS)[number];
type Founder = "arif" | "kerem";
type TabKey = "mine" | "theirs" | "shared" | "all";

type BucketKey = "overdue" | "today" | "week" | "later" | "none";

const BUCKETS: Array<{ key: BucketKey; label: string; nudge?: string }> = [
  { key: "overdue", label: "Overdue" },
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "later", label: "Later" },
  { key: "none", label: "No date", nudge: "needs a deadline" },
];

function bucketOf(t: TaskRow): BucketKey {
  if (!t.dueDate) return "none";
  const days = daysFromNow(t.dueDate);
  if (days === null) return "none";
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days <= 7) return "week";
  return "later";
}

export function TasksClient({
  tasks,
  viewer,
}: {
  tasks: TaskRow[];
  viewer: Founder | null;
}) {
  const other: Founder = viewer === "kerem" ? "arif" : "kerem";
  const [tab, setTab] = useState<TabKey>(viewer ? "mine" : "all");
  const [showDone, setShowDone] = useState(false);

  const [optimistic, setOptimistic] = useOptimistic(
    tasks,
    (state, action: { id: string; done: boolean }): TaskRow[] =>
      state.map((t) =>
        t.id === action.id
          ? {
              ...t,
              status: action.done ? ("done" as const) : ("open" as const),
            }
          : t,
      ),
  );

  function matchesTab(t: TaskRow, key: TabKey): boolean {
    if (key === "all") return true;
    if (key === "shared") return t.owner === "both";
    if (key === "mine")
      return viewer !== null && (t.owner === viewer || t.owner === "both");
    return t.owner === other || t.owner === "both";
  }

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: "mine", label: "Mine" },
    { key: "theirs", label: `${OWNER_LABELS[other]}'s` },
    { key: "shared", label: "Shared" },
    { key: "all", label: "All" },
  ];

  const filtered = optimistic.filter((t) => matchesTab(t, tab));
  const open = filtered.filter((t) => t.status === "open");
  const done = filtered.filter((t) => t.status === "done");

  const grouped = new Map<BucketKey, TaskRow[]>();
  for (const b of BUCKETS) grouped.set(b.key, []);
  for (const t of open) grouped.get(bucketOf(t))?.push(t);

  function onToggle(t: TaskRow, next: boolean) {
    startTransition(async () => {
      setOptimistic({ id: t.id, done: next });
      try {
        await toggleTaskDone(t.id, next);
        toast.success(next ? "Done" : "Reopened", { description: t.title });
      } catch (err) {
        toast.error("Could not update task", {
          description: err instanceof Error ? err.message : "Unknown error",
        });
      }
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex w-fit gap-1 rounded-lg border border-[var(--color-rule)] bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
        {tabs.map((t) => {
          const count = optimistic.filter(
            (task) => task.status === "open" && matchesTab(task, t.key),
          ).length;
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
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100")
              }
            >
              {t.label}
              <span className="ml-1.5 font-mono text-[10px] tabular-nums text-zinc-400">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <QuickAdd viewer={viewer} />

      {open.length === 0 ? (
        <div className="rounded-lg border border-[var(--color-rule)] bg-white px-4 py-16 text-center text-sm text-[var(--color-ink-muted)] dark:border-zinc-800 dark:bg-zinc-900">
          No open tasks here. Add one above.
        </div>
      ) : (
        BUCKETS.map(({ key, label, nudge }) => {
          const items = grouped.get(key) ?? [];
          if (items.length === 0) return null;
          return (
            <section key={key}>
              <div className="flex items-baseline gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-ink)]">
                  {label}
                </h2>
                <span className="text-xs text-[var(--color-ink-muted)]">
                  {nudge ? `${nudge} · ` : ""}
                  {items.length}
                </span>
              </div>
              <div className="mt-3 divide-y divide-[var(--color-rule)] overflow-hidden rounded-lg border border-[var(--color-rule)] bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
                {items.map((t) => (
                  <TaskLine key={t.id} task={t} onToggle={onToggle} />
                ))}
              </div>
            </section>
          );
        })
      )}

      {done.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            className="flex items-baseline gap-3"
          >
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-ink)]">
              Done
            </h2>
            <span className="text-xs text-[var(--color-ink-muted)]">
              {done.length} · {showDone ? "hide" : "show"}
            </span>
          </button>
          {showDone && (
            <div className="mt-3 divide-y divide-[var(--color-rule)] overflow-hidden rounded-lg border border-[var(--color-rule)] bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
              {done.map((t) => (
                <TaskLine key={t.id} task={t} onToggle={onToggle} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function QuickAdd({ viewer }: { viewer: Founder | null }) {
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function onSubmit(fd: FormData) {
    start(async () => {
      try {
        await createTask(fd);
        formRef.current?.reset();
        toast.success("Task added");
      } catch (err) {
        toast.error("Could not add task", {
          description: err instanceof Error ? err.message : "Unknown error",
        });
      }
    });
  }

  return (
    <form
      ref={formRef}
      action={onSubmit}
      className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--color-rule)] bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <input
        name="title"
        required
        placeholder="Add a task…"
        className="min-w-48 flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-zinc-700 dark:bg-zinc-900"
      />
      <select
        name="owner"
        defaultValue={viewer ?? "arif"}
        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
      >
        {OWNERS.map((o) => (
          <option key={o} value={o}>
            {OWNER_LABELS[o]}
          </option>
        ))}
      </select>
      <input
        type="date"
        name="dueDate"
        aria-label="Due date"
        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-[var(--color-ink)] px-4 py-2 text-sm font-medium text-[var(--color-paper)] hover:opacity-80 disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add"}
      </button>
    </form>
  );
}

function TaskLine({
  task,
  onToggle,
}: {
  task: TaskRow;
  onToggle: (t: TaskRow, next: boolean) => void;
}) {
  const isDone = task.status === "done";
  const due = daysFromNow(task.dueDate);
  const dueLabel = formatDueLabel(due, task.dueDate);

  const priorityDot =
    task.priority === "p1"
      ? "bg-red-500"
      : task.priority === "p2"
        ? "bg-amber-500"
        : "bg-zinc-300";

  const ownerInitials =
    task.owner === "arif" ? "A" : task.owner === "kerem" ? "K" : "AK";

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
      <input
        type="checkbox"
        checked={isDone}
        onChange={(e) => onToggle(task, e.target.checked)}
        aria-label={isDone ? "Reopen task" : "Mark task done"}
        className="h-4 w-4 shrink-0 cursor-pointer accent-brand-600"
      />
      <span
        className={"h-1.5 w-1.5 shrink-0 rounded-full " + priorityDot}
        title={(task.priority ?? "p2").toUpperCase()}
      />
      <div className="min-w-0 flex-1">
        <p
          className={
            "truncate text-sm " +
            (isDone
              ? "text-[var(--color-ink-muted)] line-through"
              : "font-medium text-[var(--color-ink)]")
          }
        >
          {task.title}
        </p>
        {(task.contactName || task.eventTitle || task.notes) && (
          <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-[var(--color-ink-muted)]">
            {task.contactId && task.contactName && (
              <Link
                href={`/admin/contacts/${task.contactId}`}
                className="shrink-0 hover:text-brand-600 hover:underline"
              >
                {task.contactName}
              </Link>
            )}
            {task.eventId && task.eventTitle && (
              <Link
                href={`/admin/events/${task.eventId}`}
                className="shrink-0 hover:text-brand-600 hover:underline"
              >
                {task.eventTitle}
              </Link>
            )}
            {task.notes && <span className="truncate">{task.notes}</span>}
          </p>
        )}
      </div>
      {dueLabel && (
        <span
          className={
            "shrink-0 font-mono text-[11px] " +
            (due !== null && due < 0
              ? "text-red-600"
              : due !== null && due <= 3
                ? "text-amber-600"
                : "text-zinc-400")
          }
        >
          {dueLabel}
        </span>
      )}
      <span
        className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
        title={`Owner: ${OWNER_LABELS[task.owner]}`}
      >
        {ownerInitials}
      </span>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <QuickPill
          label="Owner"
          current={task.owner}
          options={OWNERS.map((o) => ({ value: o, label: OWNER_LABELS[o] }))}
          onChange={async (next) => {
            await setTaskOwner(task.id, next as Owner);
          }}
        />
        <QuickPill
          label="Priority"
          current={task.priority ?? "p2"}
          options={[
            { value: "p1", label: "P1" },
            { value: "p2", label: "P2" },
            { value: "p3", label: "P3" },
          ]}
          onChange={async (next) => {
            await setTaskPriority(task.id, next as "p1" | "p2" | "p3");
          }}
        />
        <QuickPill
          label="Due"
          current={task.dueDate ?? ""}
          options={dueOptions(task.dueDate)}
          onChange={async (next) => {
            await setTaskDue(task.id, next || null);
          }}
        />
        <DeleteTaskButton id={task.id} title={task.title} />
      </div>
    </div>
  );
}

function DeleteTaskButton({ id, title }: { id: string; title: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this task?")) return;
        start(async () => {
          try {
            await deleteTask(id);
            toast.success("Task deleted", { description: title });
          } catch (err) {
            toast.error("Could not delete task", {
              description: err instanceof Error ? err.message : "Unknown error",
            });
          }
        });
      }}
      aria-label="Delete task"
      title="Delete task"
      className="rounded p-1 text-sm leading-none text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950"
    >
      ×
    </button>
  );
}

// Preset deadlines for the Due pill; the current date (if any) is kept as an
// option so the pill shows it instead of a misleading "Set".
function dueOptions(current: string | null): Array<{
  value: string;
  label: string;
}> {
  const iso = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };
  const opts = [
    { value: "", label: "No date" },
    { value: iso(0), label: "Today" },
    { value: iso(1), label: "Tomorrow" },
    { value: iso(3), label: "In 3d" },
    { value: iso(7), label: "In 1w" },
  ];
  if (current && !opts.some((o) => o.value === current)) {
    opts.unshift({ value: current, label: formatDate(current) });
  }
  return opts;
}

// Same due-label shape as the pipeline kanban cards.
function formatDueLabel(
  days: number | null,
  raw: string | Date | null | undefined,
): string | null {
  if (!raw) return null;
  if (days === null) return null;
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days <= 7) return `In ${days}d`;
  return formatDate(raw);
}
