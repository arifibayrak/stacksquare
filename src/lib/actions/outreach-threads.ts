"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { db, outreachThreads, outreachTimeline, contacts } from "@/db";
import { CHANNELS } from "@/db/schema";
import { upsertIdentity } from "@/lib/outreach-identity";
import { recordPastedConversation } from "@/lib/outreach-paste";

async function requireUser() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
}

/**
 * Accept an unmatched conversation from the review queue: link it to a contact,
 * backfill its timeline entries, remember the counterpart's identity so future
 * threads auto-match, freshen last-touch, and mark it accepted so its summary
 * now shows on that contact's timeline.
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
    .set({ contactId, reviewStatus: "accepted", updatedAt: new Date() })
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

  revalidatePath("/admin/scout");
  revalidatePath(`/admin/contacts/${contactId}`);
  return { ok: true };
}

/**
 * Accept an already-matched conversation from the review queue: mark it accepted
 * (its summary reaches the contact's timeline) and freshen last-touch.
 */
export async function acceptThread(threadId: string) {
  await requireUser();

  const [thread] = await db
    .select()
    .from(outreachThreads)
    .where(eq(outreachThreads.id, threadId))
    .limit(1);
  if (!thread) throw new Error("Thread not found");

  await db
    .update(outreachThreads)
    .set({ reviewStatus: "accepted", updatedAt: new Date() })
    .where(eq(outreachThreads.id, threadId));

  if (thread.contactId) {
    await db
      .update(contacts)
      .set({ lastTouchAt: thread.lastMessageAt ?? new Date() })
      .where(eq(contacts.id, thread.contactId));
    revalidatePath(`/admin/contacts/${thread.contactId}`);
  }
  revalidatePath("/admin/scout");
  return { ok: true };
}

/**
 * Dismiss a conversation from the review queue. Marked (not deleted) so a later
 * re-capture of the same thread does not resurrect it, and it never reaches a
 * timeline.
 */
export async function dismissThread(threadId: string) {
  await requireUser();
  await db
    .update(outreachThreads)
    .set({ reviewStatus: "dismissed", updatedAt: new Date() })
    .where(eq(outreachThreads.id, threadId));
  revalidatePath("/admin/scout");
  return { ok: true };
}

const PasteInput = z.object({
  contactId: z.string().uuid(),
  owner: z.enum(["arif", "kerem", "both"]).default("arif"),
  channel: z.enum(CHANNELS).optional().nullable(),
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
    channel: raw.channel || null,
    text: raw.text,
  });

  await recordPastedConversation({
    contactId: parsed.contactId,
    owner: parsed.owner,
    channel: parsed.channel ?? null,
    text: parsed.text,
  });

  // Lands pending in the review queue, not straight on the timeline.
  revalidatePath("/admin/scout");
  revalidatePath(`/admin/contacts/${parsed.contactId}`);
  return { ok: true };
}
