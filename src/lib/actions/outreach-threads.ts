"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { db, outreachThreads, outreachTimeline, contacts } from "@/db";
import { env } from "@/lib/env";
import { upsertIdentity } from "@/lib/outreach-identity";
import {
  parsePastedTranscript,
  summarizeThreadDelta,
  lastMessageKey,
} from "@/lib/outreach-summarize";

async function requireUser() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
}

/**
 * Link an unmatched outreach thread to a contact: set the thread's contactId,
 * backfill its timeline entries, remember the counterpart's identity so future
 * threads auto-match, and freshen the contact's last-touch.
 */
export async function linkThreadToContact(threadId: string, contactId: string) {
  await requireUser();

  const [thread] = await db
    .select()
    .from(outreachThreads)
    .where(eq(outreachThreads.id, threadId))
    .limit(1);
  if (!thread) throw new Error("Thread not found");

  const [contact] = await db
    .select()
    .from(contacts)
    .where(eq(contacts.id, contactId))
    .limit(1);
  if (!contact) throw new Error("Contact not found");

  await db
    .update(outreachThreads)
    .set({ contactId, updatedAt: new Date() })
    .where(eq(outreachThreads.id, threadId));
  await db
    .update(outreachTimeline)
    .set({ contactId })
    .where(eq(outreachTimeline.threadId, threadId));

  if (thread.counterpartLinkedin)
    await upsertIdentity(contactId, "linkedin", thread.counterpartLinkedin);
  if (thread.counterpartEmail)
    await upsertIdentity(contactId, "email", thread.counterpartEmail);

  await db
    .update(contacts)
    .set({ lastTouchAt: thread.lastMessageAt ?? new Date() })
    .where(eq(contacts.id, contactId));

  revalidatePath("/admin/outreach");
  revalidatePath(`/admin/contacts/${contactId}`);
  return { ok: true };
}

/** Dismiss an unmatched thread. Cascades its timeline entries away. */
export async function dismissThread(threadId: string) {
  await requireUser();
  await db.delete(outreachThreads).where(eq(outreachThreads.id, threadId));
  revalidatePath("/admin/outreach");
  return { ok: true };
}

const PasteInput = z.object({
  contactId: z.string().uuid(),
  owner: z.enum(["arif", "kerem", "both"]).default("arif"),
  // Whole WhatsApp / email exports can be long; accept big pastes (the parser
  // keeps the most recent portion) rather than rejecting them.
  text: z.string().min(1).max(500_000),
});

/**
 * Phase 3 fallback: paste a conversation (WhatsApp, call notes, an email thread
 * we did not sync) against a contact. The fast model structures it, the deep
 * model summarizes, and only the summary is stored (raw paste is discarded).
 */
export async function logPastedConversation(formData: FormData) {
  await requireUser();

  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
  const parsed = PasteInput.parse({
    contactId: raw.contactId,
    owner: raw.owner || "arif",
    text: raw.text,
  });

  const [contact] = await db
    .select()
    .from(contacts)
    .where(eq(contacts.id, parsed.contactId))
    .limit(1);
  if (!contact) throw new Error("Contact not found");

  const { counterpartName, messages } = await parsePastedTranscript(parsed.text);
  if (!messages.length) throw new Error("Could not parse any messages");

  const summary = await summarizeThreadDelta({
    source: "manual",
    contactId: contact.id,
    counterpartName: counterpartName ?? contact.name,
    messages,
  });

  const lastAt = new Date();
  const [thread] = await db
    .insert(outreachThreads)
    .values({
      source: "manual",
      owner: parsed.owner,
      externalThreadId: randomUUID(),
      contactId: contact.id,
      counterpartName: counterpartName ?? contact.name,
      summary: summary.rollingSummary,
      commitments: summary.commitments,
      nextSteps: summary.nextSteps,
      lastMessageKey: lastMessageKey(messages),
      lastMessageAt: lastAt,
      messageCount: messages.length,
    })
    .returning({ id: outreachThreads.id });

  await db.insert(outreachTimeline).values({
    threadId: thread.id,
    contactId: contact.id,
    source: "manual",
    owner: parsed.owner,
    direction: summary.direction,
    summary: summary.deltaSummary,
    commitments: summary.commitments,
    nextSteps: summary.nextSteps,
    coversTo: lastAt,
    messageCount: messages.length,
    model: env.modelOutreach(),
  });

  await db
    .update(contacts)
    .set({ lastTouchAt: lastAt })
    .where(eq(contacts.id, contact.id));

  revalidatePath(`/admin/contacts/${contact.id}`);
  return { ok: true };
}
