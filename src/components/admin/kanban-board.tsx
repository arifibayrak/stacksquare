"use client";

import { useOptimistic, startTransition } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { toast } from "sonner";
import type { Contact } from "@/db/schema";
import { STAGES, STAGE_LABELS } from "@/db/schema";
import { moveContactStage } from "@/lib/actions/contacts";
import { formatDate, daysFromNow } from "@/lib/utils";

type Stage = (typeof STAGES)[number];

type Phase = {
  id: string;
  label: string;
  tagline: string;
  stages: readonly Stage[];
  stripeVar: string;
};

const PHASES: Phase[] = [
  {
    id: "sourcing",
    label: "Sourcing",
    tagline: "find them",
    stages: ["identified", "researched"],
    stripeVar: "var(--color-phase-sourcing)",
  },
  {
    id: "outreach",
    label: "Outreach",
    tagline: "engage",
    stages: ["reached_out", "replying"],
    stripeVar: "var(--color-phase-outreach)",
  },
  {
    id: "production",
    label: "Production",
    tagline: "book and ship",
    stages: ["booked", "recorded", "published"],
    stripeVar: "var(--color-phase-production)",
  },
  {
    id: "maintained",
    label: "Maintained",
    tagline: "alumni and archive",
    stages: ["long_term", "dormant"],
    stripeVar: "var(--color-phase-maintained)",
  },
];

export function KanbanBoard({ contacts }: { contacts: Contact[] }) {
  const [optimistic, setOptimistic] = useOptimistic(
    contacts,
    (state, { id, stage }: { id: string; stage: Stage }) =>
      state.map((c) => (c.id === id ? { ...c, stage } : c)),
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const byStage = new Map<Stage, Contact[]>();
  for (const s of STAGES) byStage.set(s, []);
  for (const c of optimistic) byStage.get(c.stage)?.push(c);

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const newStage = String(over.id) as Stage;
    if (!STAGES.includes(newStage)) return;
    const id = String(active.id);
    const current = optimistic.find((c) => c.id === id);
    if (!current || current.stage === newStage) return;

    startTransition(async () => {
      setOptimistic({ id, stage: newStage });
      try {
        await moveContactStage(id, newStage);
        toast.success(`Moved to ${STAGE_LABELS[newStage]}`, {
          description: current.name,
        });
      } catch (err) {
        toast.error("Could not move contact", {
          description: err instanceof Error ? err.message : "Unknown error",
        });
      }
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PHASES.map((phase) => {
          const total = phase.stages.reduce(
            (sum, s) => sum + (byStage.get(s)?.length ?? 0),
            0,
          );
          return (
            <PhaseColumn
              key={phase.id}
              phase={phase}
              total={total}
              groups={phase.stages.map((s) => ({
                stage: s,
                items: byStage.get(s) ?? [],
              }))}
            />
          );
        })}
      </div>
    </DndContext>
  );
}

function PhaseColumn({
  phase,
  total,
  groups,
}: {
  phase: Phase;
  total: number;
  groups: Array<{ stage: Stage; items: Contact[] }>;
}) {
  return (
    <div className="flex flex-col rounded-lg border border-[var(--color-rule)] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] dark:border-zinc-800 dark:bg-zinc-900">
      <div
        className="h-1 rounded-t-lg"
        style={{ background: phase.stripeVar }}
      />
      <div className="border-b border-[var(--color-rule)] px-4 py-3 dark:border-zinc-800">
        <div className="flex items-baseline justify-between">
          <h3 className="font-mono text-xs uppercase tracking-[0.14em] text-[var(--color-ink)]">
            {phase.label}
          </h3>
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] tabular-nums text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            {total}
          </span>
        </div>
        <p className="mt-0.5 text-[11px] text-[var(--color-ink-muted)]">
          {phase.tagline}
        </p>
      </div>
      <div className="flex flex-col gap-3 p-3">
        {groups.map(({ stage, items }) => (
          <SubStage key={stage} stage={stage} items={items} />
        ))}
      </div>
    </div>
  );
}

function SubStage({ stage, items }: { stage: Stage; items: Contact[] }) {
  const { isOver, setNodeRef } = useDroppable({ id: stage });

  return (
    <div
      ref={setNodeRef}
      className={
        "rounded-md border border-dashed transition-colors " +
        (isOver
          ? "border-brand-500 bg-brand-500/5"
          : "border-transparent")
      }
    >
      <div className="flex items-center justify-between px-2 pt-1 pb-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
          {STAGE_LABELS[stage]}
        </span>
        <span className="font-mono text-[10px] tabular-nums text-zinc-400">
          {items.length}
        </span>
      </div>
      <div className="flex flex-col gap-1.5 px-1.5 pb-1.5">
        {items.length === 0 ? (
          <p className="px-1.5 py-2 text-[11px] text-zinc-400">Drop here</p>
        ) : (
          items.map((c) => <Card key={c.id} contact={c} />)
        )}
      </div>
    </div>
  );
}

function Card({ contact }: { contact: Contact }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: contact.id });
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  const priorityDot =
    contact.priority === "p1"
      ? "bg-red-500"
      : contact.priority === "p2"
        ? "bg-amber-500"
        : "bg-zinc-300";

  const ownerInitials =
    contact.owner === "arif"
      ? "A"
      : contact.owner === "kerem"
        ? "K"
        : contact.owner === "both"
          ? "AK"
          : null;

  const due = daysFromNow(contact.nextActionDue);
  const dueLabel = formatDueLabel(due, contact.nextActionDue);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="cursor-grab rounded-md border border-zinc-200 bg-white p-2.5 text-sm shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-brand-500 active:cursor-grabbing dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="flex items-start gap-2">
        <span
          className={"mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full " + priorityDot}
          aria-label={contact.priority?.toUpperCase()}
        />
        <Link
          href={`/admin/contacts/${contact.id}`}
          onPointerDown={(e) => e.stopPropagation()}
          className="min-w-0 flex-1 truncate font-medium text-[var(--color-ink)] hover:text-brand-600"
        >
          {contact.name}
        </Link>
        {ownerInitials && (
          <span
            className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
            title={`Owner: ${contact.owner}`}
          >
            {ownerInitials}
          </span>
        )}
      </div>
      {(contact.role || contact.company) && (
        <p className="mt-0.5 ml-3.5 truncate text-[11px] text-[var(--color-ink-muted)]">
          {[contact.role, contact.company].filter(Boolean).join(" · ")}
        </p>
      )}
      {(contact.nextAction || dueLabel) && (
        <div className="mt-2 ml-3.5 flex items-center justify-between gap-2 text-[11px]">
          {contact.nextAction ? (
            <span className="truncate text-[var(--color-ink-soft)]">
              → {contact.nextAction}
            </span>
          ) : (
            <span />
          )}
          {dueLabel && (
            <span
              className={
                "shrink-0 font-mono " +
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
        </div>
      )}
    </div>
  );
}

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
