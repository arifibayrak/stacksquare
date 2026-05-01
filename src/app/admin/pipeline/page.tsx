import { db, contacts } from "@/db";
import { asc, desc } from "drizzle-orm";
import { KanbanBoard } from "@/components/admin/kanban-board";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const list = await db
    .select()
    .from(contacts)
    .orderBy(asc(contacts.priority), desc(contacts.updatedAt));

  return (
    <div className="px-8 py-10">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
            Pipeline
          </h1>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            Four phases. Drag a card across phases or sub-stages to move it.
          </p>
        </div>
      </div>

      <div className="mt-8">
        <KanbanBoard contacts={list} />
      </div>
    </div>
  );
}
