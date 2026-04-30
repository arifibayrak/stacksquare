import { db, contacts } from "@/db";
import { desc, ne } from "drizzle-orm";
import { KanbanBoard } from "@/components/admin/kanban-board";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const list = await db
    .select()
    .from(contacts)
    .where(ne(contacts.stage, "dormant"))
    .orderBy(desc(contacts.priority), desc(contacts.updatedAt));

  return (
    <div className="px-8 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pipeline</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Drag cards across stages. Updates save instantly.
          </p>
        </div>
      </div>

      <div className="mt-8">
        <KanbanBoard contacts={list} />
      </div>
    </div>
  );
}
