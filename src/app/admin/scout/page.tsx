import Link from "next/link";
import {
  db,
  captures,
  outreachThreads,
  contacts,
  OUTREACH_SOURCE_LABELS,
  CHANNEL_LABELS,
} from "@/db";
import { desc, eq, sql } from "drizzle-orm";
import { CaptureCard, ConversationReview } from "./client";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ScoutQueuePage() {
  const [pending, counts, pendingThreads, contactOptions] = await Promise.all([
    db
      .select()
      .from(captures)
      .where(eq(captures.status, "pending"))
      .orderBy(desc(captures.capturedAt))
      .limit(200),
    db
      .select({ status: captures.status, n: sql<number>`count(*)::int` })
      .from(captures)
      .groupBy(captures.status),
    db
      .select({
        id: outreachThreads.id,
        source: outreachThreads.source,
        channel: outreachThreads.channel,
        counterpartName: outreachThreads.counterpartName,
        counterpartLinkedin: outreachThreads.counterpartLinkedin,
        summary: outreachThreads.summary,
        contactId: outreachThreads.contactId,
        owner: outreachThreads.owner,
        lastMessageAt: outreachThreads.lastMessageAt,
        updatedAt: outreachThreads.updatedAt,
        contactName: contacts.name,
      })
      .from(outreachThreads)
      .leftJoin(contacts, eq(outreachThreads.contactId, contacts.id))
      .where(eq(outreachThreads.reviewStatus, "pending"))
      .orderBy(desc(outreachThreads.updatedAt))
      .limit(100),
    db
      .select({
        id: contacts.id,
        name: contacts.name,
        company: contacts.company,
      })
      .from(contacts)
      .orderBy(desc(contacts.updatedAt))
      .limit(500),
  ]);

  const count = (s: string) => counts.find((c) => c.status === s)?.n ?? 0;

  const reviewThreads = pendingThreads.map((t) => ({
    id: t.id,
    when: formatDate(t.lastMessageAt ?? t.updatedAt),
    sourceLabel: t.channel
      ? CHANNEL_LABELS[t.channel]
      : OUTREACH_SOURCE_LABELS[t.source],
    counterpartName: t.counterpartName,
    counterpartLinkedin: t.counterpartLinkedin,
    summary: t.summary,
    contactId: t.contactId,
    contactName: t.contactName,
    owner: t.owner,
  }));

  return (
    <div className="px-8 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Scout queue</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Review what Scout captured before it enters the CRM: profiles, LinkedIn
        DM logs, and pasted chats. {count("promoted")} profiles promoted ·{" "}
        {count("dismissed")} dismissed all-time.
      </p>

      <section className="mt-8">
        <h2 className="font-mono text-xs uppercase tracking-widest text-zinc-500">
          Conversations to review
          {reviewThreads.length > 0 ? ` (${reviewThreads.length})` : ""}
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Captured LinkedIn DM logs and pasted chats (WhatsApp, Gmail, and more).
          Accept to file the summary on the contact&apos;s timeline, or dismiss.
        </p>
        <ConversationReview threads={reviewThreads} contacts={contactOptions} />
      </section>

      <section className="mt-10">
        <h2 className="font-mono text-xs uppercase tracking-widest text-zinc-500">
          Profiles to review
          {pending.length > 0 ? ` (${pending.length})` : ""}
        </h2>
        {pending.length === 0 ? (
          <p className="mt-4 rounded-md border border-zinc-200 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
            No profiles waiting. Flip the Scout switch in the extension and open
            LinkedIn profiles; they will land here.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {pending.map((c) => (
              <CaptureCard key={c.id} capture={c} />
            ))}
          </ul>
        )}
      </section>

      <p className="mt-10 text-xs text-zinc-500">
        Promoted contacts land in{" "}
        <Link href="/admin/contacts" className="text-brand-600 hover:underline">
          Contacts
        </Link>{" "}
        as Identified · Within reach, owned by whoever captured them.
      </p>
    </div>
  );
}
