import { asc, eq, sql } from "drizzle-orm";
import { db, tasks, contacts, events } from "@/db";
import { currentOwner } from "@/lib/owner";
import { TasksClient } from "./client";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const viewer = await currentOwner();

  const rows = await db
    .select({
      task: tasks,
      contactName: contacts.name,
      eventTitle: events.title,
    })
    .from(tasks)
    .leftJoin(contacts, eq(tasks.contactId, contacts.id))
    .leftJoin(events, eq(tasks.eventId, events.id))
    .orderBy(
      sql`${tasks.dueDate} asc nulls last`,
      asc(tasks.priority),
      asc(tasks.createdAt),
    );

  const list = rows.map((r) => ({
    ...r.task,
    contactName: r.contactName,
    eventTitle: r.eventTitle,
  }));
  const openCount = list.filter((t) => t.status === "open").length;

  return (
    <div className="px-8 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
          Tasks
        </h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          {openCount} open · the shared work queue, sorted by due date
        </p>
      </div>
      <div className="mt-8">
        <TasksClient tasks={list} viewer={viewer} />
      </div>
    </div>
  );
}
