"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, notInArray } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import {
  db,
  contacts,
  touchLog,
  outreachLog,
  aiRuns,
  submissions,
  captures,
  venues,
  prospects,
  eventSpeakers,
  eventTargets,
} from "@/db";

async function requireUser() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
}

function firstNonNull<T>(vals: (T | null | undefined)[]): T | null {
  for (const v of vals) if (v != null && v !== ("" as unknown as T)) return v;
  return null;
}

/**
 * Merge duplicate contacts into a chosen primary: fill the primary's blank
 * fields from the duplicates, union their tags/expertise, append their notes,
 * re-point every related row (touches, outreach, AI runs, submissions,
 * captures, venues, prospects, event speakers/targets, referrals) to the
 * primary, then delete the duplicates. The one unique join (event_targets)
 * is de-conflicted before re-pointing.
 */
export async function mergeContacts(primaryId: string, duplicateIds: string[]) {
  await requireUser();
  const ids = [...new Set(duplicateIds)].filter((id) => id && id !== primaryId);
  if (ids.length === 0) return { merged: 0 };

  const [primary] = await db
    .select()
    .from(contacts)
    .where(eq(contacts.id, primaryId));
  if (!primary) throw new Error("Primary contact not found");
  const dups = await db.select().from(contacts).where(inArray(contacts.id, ids));
  if (dups.length === 0) return { merged: 0 };

  const expertise = [
    ...new Set([
      ...(primary.expertise ?? []),
      ...dups.flatMap((d) => d.expertise ?? []),
    ]),
  ];
  const tags = [
    ...new Set([
      ...(primary.tags ?? []),
      ...dups.flatMap((d) => d.tags ?? []),
    ]),
  ];
  const notes =
    [
      primary.notes,
      ...dups.map((d) => (d.notes ? `Merged from ${d.name}:\n${d.notes}` : null)),
    ]
      .filter(Boolean)
      .join("\n\n") || null;

  await db
    .update(contacts)
    .set({
      role: primary.role ?? firstNonNull(dups.map((d) => d.role)),
      company: primary.company ?? firstNonNull(dups.map((d) => d.company)),
      city: primary.city ?? firstNonNull(dups.map((d) => d.city)),
      linkedinUrl:
        primary.linkedinUrl ?? firstNonNull(dups.map((d) => d.linkedinUrl)),
      email: primary.email ?? firstNonNull(dups.map((d) => d.email)),
      phone: primary.phone ?? firstNonNull(dups.map((d) => d.phone)),
      seniority: primary.seniority ?? firstNonNull(dups.map((d) => d.seniority)),
      relationship:
        primary.relationship ?? firstNonNull(dups.map((d) => d.relationship)),
      source: primary.source ?? firstNonNull(dups.map((d) => d.source)),
      fitScore: primary.fitScore ?? firstNonNull(dups.map((d) => d.fitScore)),
      owner: primary.owner ?? firstNonNull(dups.map((d) => d.owner)),
      nextAction:
        primary.nextAction ?? firstNonNull(dups.map((d) => d.nextAction)),
      nextActionDue:
        primary.nextActionDue ?? firstNonNull(dups.map((d) => d.nextActionDue)),
      lastTouchAt:
        primary.lastTouchAt ?? firstNonNull(dups.map((d) => d.lastTouchAt)),
      expertise,
      tags,
      notes,
      updatedAt: new Date(),
    })
    .where(eq(contacts.id, primaryId));

  // Re-point simple FK references (no unique constraints) to the primary.
  await db
    .update(touchLog)
    .set({ contactId: primaryId })
    .where(inArray(touchLog.contactId, ids));
  await db
    .update(outreachLog)
    .set({ contactId: primaryId })
    .where(inArray(outreachLog.contactId, ids));
  await db
    .update(aiRuns)
    .set({ contactId: primaryId })
    .where(inArray(aiRuns.contactId, ids));
  await db
    .update(submissions)
    .set({ contactId: primaryId })
    .where(inArray(submissions.contactId, ids));
  await db
    .update(captures)
    .set({ contactId: primaryId })
    .where(inArray(captures.contactId, ids));
  await db
    .update(venues)
    .set({ contactId: primaryId })
    .where(inArray(venues.contactId, ids));
  await db
    .update(prospects)
    .set({ contactId: primaryId })
    .where(inArray(prospects.contactId, ids));
  await db
    .update(eventSpeakers)
    .set({ contactId: primaryId })
    .where(inArray(eventSpeakers.contactId, ids));
  // Referral self-reference.
  await db
    .update(contacts)
    .set({ introducedById: primaryId })
    .where(inArray(contacts.introducedById, ids));

  // event_targets has a unique (event_id, contact_id): move only rows whose
  // event the primary isn't already targeted for; drop the conflicting rest.
  const primaryEvents = await db
    .select({ eventId: eventTargets.eventId })
    .from(eventTargets)
    .where(eq(eventTargets.contactId, primaryId));
  const primaryEventIds = primaryEvents.map((e) => e.eventId);
  if (primaryEventIds.length) {
    await db
      .update(eventTargets)
      .set({ contactId: primaryId })
      .where(
        and(
          inArray(eventTargets.contactId, ids),
          notInArray(eventTargets.eventId, primaryEventIds),
        ),
      );
    await db
      .delete(eventTargets)
      .where(inArray(eventTargets.contactId, ids));
  } else {
    await db
      .update(eventTargets)
      .set({ contactId: primaryId })
      .where(inArray(eventTargets.contactId, ids));
  }

  await db.delete(contacts).where(inArray(contacts.id, ids));

  revalidatePath("/admin/contacts");
  revalidatePath("/admin/contacts/duplicates");
  revalidatePath("/admin/pipeline");
  return { merged: ids.length };
}
