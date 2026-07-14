import Link from "next/link";
import { db, contacts, outreachLog, outreachTemplates } from "@/db";
import { desc, sql, gte, eq, inArray } from "drizzle-orm";
import { OutreachComposer } from "./client";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OutreachQueuePage() {
  const queue = await db
    .select()
    .from(contacts)
    .where(inArray(contacts.stage, ["researched", "reached_out", "replying"]))
    .orderBy(desc(contacts.priority), desc(contacts.updatedAt))
    .limit(50);

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [{ count: weekCount = 0 } = { count: 0 }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(outreachLog)
    .where(gte(outreachLog.sentAt, weekAgo));

  const recent = await db
    .select({
      id: outreachLog.id,
      sentAt: outreachLog.sentAt,
      channel: outreachLog.channel,
      contactName: contacts.name,
      contactId: contacts.id,
    })
    .from(outreachLog)
    .leftJoin(contacts, eq(outreachLog.contactId, contacts.id))
    .orderBy(desc(outreachLog.sentAt))
    .limit(15);

  const templates = await db
    .select()
    .from(outreachTemplates)
    .orderBy(desc(outreachTemplates.updatedAt));

  return (
    <div className="px-8 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Outreach queue
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            This week: {weekCount} sent · target 20/week combined
          </p>
        </div>
        <Link
          href="/admin/outreach/templates"
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Manage templates
        </Link>
      </div>

      <p className="mt-6 rounded-md border border-zinc-200 bg-white p-3 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
        Captured DM logs and pasted conversations are reviewed in the{" "}
        <Link href="/admin/scout" className="text-brand-600 hover:underline">
          Scout queue
        </Link>
        .
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[2fr_1fr]">
        <section>
          <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-500">
            Compose & send
          </h2>
          <div className="mt-4">
            <OutreachComposer
              contacts={queue.map((c) => ({
                id: c.id,
                name: c.name,
                email: c.email,
                stage: c.stage,
              }))}
              templates={templates.map((t) => ({
                id: t.id,
                name: t.name,
                channel: t.channel,
              }))}
            />
          </div>
        </section>

        <aside>
          <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-500">
            Recent sends
          </h2>
          {recent.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">No outreach yet.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {recent.map((r) => (
                <li
                  key={r.id}
                  className="rounded-md border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <p className="text-xs text-zinc-500">
                    {formatDate(r.sentAt)} · {r.channel.replace("_", " ")}
                  </p>
                  <Link
                    href={`/admin/contacts/${r.contactId}`}
                    className="mt-1 block font-medium hover:text-brand-600"
                  >
                    {r.contactName}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
