"use client";

import { useOptimistic, useTransition, startTransition } from "react";
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
import type { Contact } from "@/db/schema";
import { STAGES, STAGE_LABELS } from "@/db/schema";
import { moveContactStage } from "@/lib/actions/contacts";

type Stage = (typeof STAGES)[number];

export function KanbanBoard({ contacts }: { contacts: Contact[] }) {
  const [optimistic, setOptimistic] = useOptimistic(
    contacts,
    (state, { id, stage }: { id: string; stage: Stage }) =>
      state.map((c) => (c.id === id ? { ...c, stage } : c)),
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const grouped = STAGES.map((stage) => ({
    stage,
    items: optimistic.filter((c) => c.stage === stage),
  }));

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
      await moveContactStage(id, newStage);
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-6">
        {grouped.map(({ stage, items }) => (
          <Column key={stage} stage={stage} items={items} />
        ))}
      </div>
    </DndContext>
  );
}

function Column({ stage, items }: { stage: Stage; items: Contact[] }) {
  const { isOver, setNodeRef } = useDroppable({ id: stage });

  return (
    <div
      ref={setNodeRef}
      className={
        "flex w-72 shrink-0 flex-col rounded-lg border bg-white dark:bg-zinc-900 " +
        (isOver
          ? "border-brand-500"
          : "border-zinc-200 dark:border-zinc-800")
      }
    >
      <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
          {STAGE_LABELS[stage]}
        </h3>
        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] tabular-nums text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          {items.length}
        </span>
      </div>
      <div className="flex flex-col gap-2 p-2">
        {items.map((c) => (
          <Card key={c.id} contact={c} />
        ))}
        {items.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-zinc-400">
            Drop contacts here
          </p>
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
        ? "bg-yellow-500"
        : "bg-zinc-400";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="cursor-grab rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm shadow-sm hover:border-brand-500 active:cursor-grabbing dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="flex items-center gap-2">
        <span className={"h-1.5 w-1.5 rounded-full " + priorityDot} />
        <Link
          href={`/admin/contacts/${contact.id}`}
          onPointerDown={(e) => e.stopPropagation()}
          className="font-medium hover:text-brand-600"
        >
          {contact.name}
        </Link>
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        {contact.role}
        {contact.company ? ` · ${contact.company}` : ""}
      </p>
      {contact.nextAction && (
        <p className="mt-2 text-[11px] text-zinc-600 dark:text-zinc-400">
          → {contact.nextAction}
        </p>
      )}
    </div>
  );
}
