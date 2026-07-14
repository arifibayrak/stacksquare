import Link from "next/link";
import {
  db,
  contacts,
  outreachLog,
  outreachTemplates,
  outreachThreads,
  gmailAccounts,
  OUTREACH_SOURCE_LABELS,
} from "@/db";
import { desc, sql, gte, eq, inArray, isNull } from "drizzle-orm";
import { OutreachComposer, UnmatchedThreads, GmailCard } from "./client";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OutreachQueuePage() {
  const queue = await db
    .select()
    .from(contacts)
    .where(inArray(contacts.stage, ["researched", "reached_out", "replying"]))
    .orderBy(desc(contacts.priority), desc(contacts.updatedAt))
    .limit(50);

  const unmatched = await db
    .select()
    .from(outreachThreads)
    .where(isNull(outreachThreads.contactId))
    .orderBy(desc(outreachThreads.updatedAt))
    .limit(50);

  const contactOptions = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      company: contacts.company,
    })
    .from(contacts)
    .orderBy(desc(contacts.updatedAt))
    .limit(500);

  const gmail = await db.select().from(gmailAccounts);

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

      <section className="mt-8">
        <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-500">
          Channels
        </h2>
        <div className="mt-4">
          <GmailCard
            accounts={gmail.map((a) => ({
              owner: a.owner,
              email: a.email,
              lastSyncAt: a.lastSyncAt ? formatDate(a.lastSyncAt) : null,
              status: a.status,
            }))}
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-500">
          Unmatched conversations
          {unmatched.length > 0 ? ` (${unmatched.length})` : ""}
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Captured DM / email threads we could not match to a contact. Link them
          to file the summary on that contact's timeline, or dismiss.
        </p>
        <UnmatchedThreads
          threads={unmatched.map((t) => ({
            id: t.id,
            sourceLabel: OUTREACH_SOURCE_LABELS[t.source],
            counterpartName: t.counterpartName,
            counterpartLinkedin: t.counterpartLinkedin,
            summary: t.summary,
            when: formatDate(t.lastMessageAt ?? t.updatedAt),
          }))}
          contacts={contactOptions}
        />
      </section>

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
                    {formatDate(r.sentAt)} ·{" "}
                    {r.channel.replace("_", " ")}
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
