import { and, eq, isNotNull } from "drizzle-orm";
import {
  db,
  gmailAccounts,
  contacts,
  contactIdentities,
  outreachThreads,
  outreachTimeline,
} from "@/db";
import { env } from "@/lib/env";
import { normalizeEmail } from "@/lib/contacts-dedup";
import { resolveContact, upsertIdentity } from "@/lib/outreach-identity";
import {
  triageThread,
  summarizeThreadDelta,
  lastMessageKey,
  type OutreachMessage,
} from "@/lib/outreach-summarize";
import {
  refreshAccessToken,
  decryptToken,
  listThreadIds,
  getThread,
  parseMessage,
} from "@/lib/gmail";

// Phase 2 sync: pull recent Gmail threads that involve a known contact, then
// summarize into the outreach timeline. Identity-driven search means we only
// ever fetch mail with people already in the CRM (data minimization), and only
// summaries are stored (docs/adr/0004).

type Owner = "arif" | "kerem";
const WINDOW = "newer_than:45d";
const CHUNK = 12; // addresses per Gmail query
const MAX_THREADS = 80; // cap per account per run

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

/** All contact emails we know, mapped to their contact id. */
async function knownEmails(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const primary = await db
    .select({ id: contacts.id, email: contacts.email })
    .from(contacts)
    .where(isNotNull(contacts.email));
  for (const c of primary) {
    const e = normalizeEmail(c.email);
    if (e) map.set(e, c.id);
  }
  const extra = await db
    .select({ contactId: contactIdentities.contactId, value: contactIdentities.value })
    .from(contactIdentities)
    .where(eq(contactIdentities.kind, "email"));
  for (const r of extra) {
    const e = normalizeEmail(r.value);
    if (e && !map.has(e)) map.set(e, r.contactId);
  }
  return map;
}

export type SyncResult = {
  owner: Owner;
  logged: number;
  skipped: number;
  errors: number;
};

export async function syncGmailAccount(owner: Owner): Promise<SyncResult> {
  const result: SyncResult = { owner, logged: 0, skipped: 0, errors: 0 };

  const [account] = await db
    .select()
    .from(gmailAccounts)
    .where(eq(gmailAccounts.owner, owner))
    .limit(1);
  if (!account) return result;

  let accessToken: string;
  try {
    accessToken = await refreshAccessToken(decryptToken(account.refreshTokenEnc));
  } catch {
    await db
      .update(gmailAccounts)
      .set({ status: "error", updatedAt: new Date() })
      .where(eq(gmailAccounts.id, account.id));
    result.errors += 1;
    return result;
  }

  const accountEmail = normalizeEmail(account.email);
  const emailMap = await knownEmails();
  const addresses = [...emailMap.keys()].filter((e) => e !== accountEmail);
  if (addresses.length === 0) {
    await db
      .update(gmailAccounts)
      .set({ lastSyncAt: new Date(), status: "connected", updatedAt: new Date() })
      .where(eq(gmailAccounts.id, account.id));
    return result;
  }

  // Collect candidate thread ids across identity-scoped searches.
  const threadIds = new Set<string>();
  for (const group of chunk(addresses, CHUNK)) {
    const clause = group.map((a) => `from:${a} OR to:${a}`).join(" OR ");
    const query = `${WINDOW} -category:promotions -category:social (${clause})`;
    try {
      const ids = await listThreadIds(accessToken, query, 50);
      for (const id of ids) threadIds.add(id);
    } catch {
      result.errors += 1;
    }
    if (threadIds.size >= MAX_THREADS) break;
  }

  for (const threadId of [...threadIds].slice(0, MAX_THREADS)) {
    try {
      const done = await syncOneThread({
        owner,
        accessToken,
        threadId,
        accountEmail,
        emailMap,
      });
      if (done === "logged") result.logged += 1;
      else result.skipped += 1;
    } catch {
      result.errors += 1;
    }
  }

  await db
    .update(gmailAccounts)
    .set({ lastSyncAt: new Date(), status: "connected", updatedAt: new Date() })
    .where(eq(gmailAccounts.id, account.id));

  return result;
}

async function syncOneThread(opts: {
  owner: Owner;
  accessToken: string;
  threadId: string;
  accountEmail: string | null;
  emailMap: Map<string, string>;
}): Promise<"logged" | "skipped"> {
  const { owner, accessToken, threadId, accountEmail, emailMap } = opts;

  const thread = await getThread(accessToken, threadId);
  const messages = (thread.messages ?? []).map(parseMessage);
  if (messages.length === 0) return "skipped";

  const subject = messages[0].subject || null;
  const transcript: OutreachMessage[] = messages
    .filter((m) => m.text)
    .map((m) => ({
      from: m.fromEmail && m.fromEmail === accountEmail ? "me" : "them",
      at: m.internalDate ? String(m.internalDate) : null,
      text: m.text,
    }));
  if (transcript.length === 0) return "skipped";

  const newKey = lastMessageKey(transcript);

  const [existing] = await db
    .select()
    .from(outreachThreads)
    .where(
      and(
        eq(outreachThreads.source, "gmail"),
        eq(outreachThreads.owner, owner),
        eq(outreachThreads.externalThreadId, threadId),
      ),
    )
    .limit(1);

  if (existing && newKey && existing.lastMessageKey === newKey) return "skipped";

  // Counterpart = first participant we recognize that is not the account owner.
  let counterpartEmail: string | null = null;
  for (const m of messages) {
    const e = normalizeEmail(m.fromEmail);
    if (e && e !== accountEmail && emailMap.has(e)) {
      counterpartEmail = e;
      break;
    }
  }
  const counterpartName = messages.find((m) => m.fromEmail !== accountEmail)?.from
    ?.replace(/<[^>]+>/, "")
    .replace(/"/g, "")
    .trim() ?? null;

  const contact = counterpartEmail
    ? await resolveContact({ email: counterpartEmail })
    : null;

  const lastAt = messages[messages.length - 1]?.internalDate
    ? new Date(messages[messages.length - 1].internalDate as number)
    : new Date();
  const firstAt = messages[0]?.internalDate
    ? new Date(messages[0].internalDate as number)
    : null;

  const triage = await triageThread({
    counterpartName,
    subject,
    messages: transcript,
  });

  if (!triage.worthLogging) {
    if (existing) {
      await db
        .update(outreachThreads)
        .set({ lastMessageKey: newKey, lastMessageAt: lastAt, updatedAt: new Date() })
        .where(eq(outreachThreads.id, existing.id));
    } else {
      await db.insert(outreachThreads).values({
        source: "gmail",
        owner,
        externalThreadId: threadId,
        contactId: contact?.id ?? null,
        counterpartName,
        counterpartEmail,
        subject,
        lastMessageKey: newKey,
        lastMessageAt: lastAt,
        messageCount: transcript.length,
      });
    }
    return "skipped";
  }

  const summary = await summarizeThreadDelta({
    source: "gmail",
    contactId: contact?.id ?? null,
    threadId: existing?.id ?? null,
    counterpartName,
    subject,
    previousSummary: existing?.summary ?? null,
    messages: transcript,
  });

  let dbThreadId: string;
  if (existing) {
    await db
      .update(outreachThreads)
      .set({
        contactId: contact?.id ?? existing.contactId,
        counterpartName: counterpartName ?? existing.counterpartName,
        counterpartEmail: counterpartEmail ?? existing.counterpartEmail,
        subject: subject ?? existing.subject,
        summary: summary.rollingSummary,
        commitments: summary.commitments,
        nextSteps: summary.nextSteps,
        lastMessageKey: newKey,
        lastMessageAt: lastAt,
        messageCount: transcript.length,
        updatedAt: new Date(),
      })
      .where(eq(outreachThreads.id, existing.id));
    dbThreadId = existing.id;
  } else {
    const [row] = await db
      .insert(outreachThreads)
      .values({
        source: "gmail",
        owner,
        externalThreadId: threadId,
        contactId: contact?.id ?? null,
        counterpartName,
        counterpartEmail,
        subject,
        summary: summary.rollingSummary,
        commitments: summary.commitments,
        nextSteps: summary.nextSteps,
        lastMessageKey: newKey,
        lastMessageAt: lastAt,
        messageCount: transcript.length,
      })
      .returning({ id: outreachThreads.id });
    dbThreadId = row.id;
  }

  await db.insert(outreachTimeline).values({
    threadId: dbThreadId,
    contactId: contact?.id ?? null,
    source: "gmail",
    owner,
    direction: summary.direction,
    summary: summary.deltaSummary,
    commitments: summary.commitments,
    nextSteps: summary.nextSteps,
    coversFrom: firstAt,
    coversTo: lastAt,
    messageCount: transcript.length,
    model: env.modelDeep(),
  });

  if (contact) {
    if (counterpartEmail)
      await upsertIdentity(contact.id, "email", counterpartEmail);
    await db
      .update(contacts)
      .set({ lastTouchAt: lastAt })
      .where(eq(contacts.id, contact.id));
  }

  return "logged";
}
