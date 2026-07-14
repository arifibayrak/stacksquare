import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, outreachThreads, outreachTimeline, contacts } from "@/db";
import { env } from "@/lib/env";
import { CHANNELS } from "@/db/schema";
import {
  parsePastedTranscript,
  summarizeThreadDelta,
  lastMessageKey,
} from "@/lib/outreach-summarize";

export type OutreachChannel = (typeof CHANNELS)[number];

/**
 * Core of "log a pasted conversation": structure the paste (fast model),
 * summarize it (deep model) and append it to the contact's outreach timeline
 * tagged with the platform it happened on. The raw paste is discarded; only the
 * summary is stored, matching how LinkedIn DM logging works. Shared by the
 * admin server action and the extension's `/api/outreach/paste` endpoint.
 */
export async function recordPastedConversation(input: {
  contactId: string;
  owner: "arif" | "kerem" | "both";
  channel?: OutreachChannel | null;
  subject?: string | null;
  text: string;
}): Promise<{ threadId: string; messageCount: number }> {
  const [contact] = await db
    .select()
    .from(contacts)
    .where(eq(contacts.id, input.contactId))
    .limit(1);
  if (!contact) throw new Error("Contact not found");

  const { counterpartName, messages } = await parsePastedTranscript(input.text);
  if (!messages.length) throw new Error("Could not parse any messages");

  const summary = await summarizeThreadDelta({
    source: "manual",
    contactId: contact.id,
    counterpartName: counterpartName ?? contact.name,
    subject: input.subject ?? null,
    messages,
  });

  const lastAt = new Date();
  // Lands `pending`: the conversation waits in the review queue and does not
  // reach the contact's timeline (which filters to accepted threads) or bump
  // last-touch until it is accepted.
  const [thread] = await db
    .insert(outreachThreads)
    .values({
      source: "manual",
      channel: input.channel ?? null,
      owner: input.owner,
      externalThreadId: randomUUID(),
      contactId: contact.id,
      counterpartName: counterpartName ?? contact.name,
      subject: input.subject ?? null,
      summary: summary.rollingSummary,
      commitments: summary.commitments,
      nextSteps: summary.nextSteps,
      lastMessageKey: lastMessageKey(messages),
      lastMessageAt: lastAt,
      messageCount: messages.length,
      reviewStatus: "pending",
    })
    .returning({ id: outreachThreads.id });

  await db.insert(outreachTimeline).values({
    threadId: thread.id,
    contactId: contact.id,
    source: "manual",
    channel: input.channel ?? null,
    owner: input.owner,
    direction: summary.direction,
    summary: summary.deltaSummary,
    commitments: summary.commitments,
    nextSteps: summary.nextSteps,
    coversTo: lastAt,
    messageCount: messages.length,
    model: env.modelOutreach(),
  });

  return { threadId: thread.id, messageCount: messages.length };
}
