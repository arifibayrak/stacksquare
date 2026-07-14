"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  db,
  contacts,
  eventAttendees,
  eventTargets,
  aiRuns,
  ATTENDEE_STATUSES,
  ATTENDEE_FOLLOW_UPS,
} from "@/db";
import { env } from "@/lib/env";
import { parseCsv, mapLumaRows, type ParsedAttendee } from "@/lib/csv";
import { findContactByIdentity, normalizeEmail } from "@/lib/contacts-dedup";

async function requireUser() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
}

function revalidateEvent(eventId: string) {
  revalidatePath(`/admin/events/${eventId}`);
}

// App-level upsert keyed on (event, email), falling back to name for the
// email-less. Re-importing updates the guest's Luma facts (status/answers) but
// never touches our triage state (follow_up, contact_id, note).
async function upsertAttendees(
  eventId: string,
  parsed: ParsedAttendee[],
  source: "csv" | "paste",
): Promise<{ imported: number; updated: number }> {
  const existing = await db
    .select({
      id: eventAttendees.id,
      email: eventAttendees.email,
      name: eventAttendees.name,
    })
    .from(eventAttendees)
    .where(eq(eventAttendees.eventId, eventId));

  const byEmail = new Map<string, string>();
  const byName = new Map<string, string>();
  for (const e of existing) {
    if (e.email) byEmail.set(e.email.toLowerCase(), e.id);
    else byName.set(e.name.toLowerCase(), e.id);
  }

  let imported = 0;
  let updated = 0;
  const now = new Date();

  for (const a of parsed) {
    const emailKey = a.email ? a.email.toLowerCase() : null;
    const existingId = emailKey
      ? byEmail.get(emailKey)
      : byName.get(a.name.toLowerCase());

    if (existingId) {
      await db
        .update(eventAttendees)
        .set({
          name: a.name,
          ...(a.email ? { email: a.email } : {}),
          ...(a.phone ? { phone: a.phone } : {}),
          status: a.status,
          answers: a.answers,
          source,
          updatedAt: now,
        })
        .where(eq(eventAttendees.id, existingId));
      updated++;
    } else {
      const [ins] = await db
        .insert(eventAttendees)
        .values({
          eventId,
          name: a.name,
          email: a.email,
          phone: a.phone,
          status: a.status,
          answers: a.answers,
          source,
        })
        .returning({ id: eventAttendees.id });
      if (ins) {
        if (emailKey) byEmail.set(emailKey, ins.id);
        else byName.set(a.name.toLowerCase(), ins.id);
      }
      imported++;
    }
  }
  return { imported, updated };
}

export async function importAttendeesCsv(eventId: string, csvText: string) {
  await requireUser();
  const { attendees, skipped } = mapLumaRows(parseCsv(csvText));
  if (attendees.length === 0) {
    throw new Error(
      "No attendees found. Make sure this is the Luma guest CSV export.",
    );
  }
  const res = await upsertAttendees(eventId, attendees, "csv");
  revalidateEvent(eventId);
  return { ok: true as const, ...res, skipped, total: attendees.length };
}

const PasteOut = z.object({
  attendees: z.array(
    z.object({
      name: z.string(),
      email: z.string().nullable(),
      phone: z.string().nullable(),
      status: z.enum(ATTENDEE_STATUSES).default("registered"),
    }),
  ),
});

// AI fallback for messy sources: parse pasted text into structured guests for
// review. Does not write attendees; the client commits after you confirm.
export async function parseAttendeesPaste(eventId: string, text: string) {
  await requireUser();
  if (!text.trim()) throw new Error("Nothing to parse");
  const { output } = await generateText({
    model: anthropic(env.modelFast()),
    output: Output.object({ schema: PasteOut }),
    system:
      "Extract an event guest list from pasted text (a CSV, a table, or a plain list). " +
      "Return one entry per real person with name, and email/phone when present. " +
      "status: 'attended' if they checked in or attended, 'no_show' if marked absent, otherwise 'registered'. " +
      "Never invent people or fields; leave email/phone null if absent.",
    prompt: text.slice(0, 12000),
  });
  await db.insert(aiRuns).values({
    kind: "parse_attendees",
    input: { eventId, text: text.slice(0, 4000) },
    output,
    model: env.modelFast(),
  });
  return { ok: true as const, attendees: output.attendees };
}

const CommitInput = z.array(
  z.object({
    name: z.string().min(1),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    status: z.enum(ATTENDEE_STATUSES).default("registered"),
  }),
);

export async function commitAttendees(
  eventId: string,
  rows: z.input<typeof CommitInput>,
) {
  await requireUser();
  const parsed: ParsedAttendee[] = CommitInput.parse(rows).map((r) => ({
    name: r.name,
    email: r.email ?? null,
    phone: r.phone ?? null,
    status: r.status,
    answers: {},
  }));
  if (parsed.length === 0) throw new Error("No attendees to import");
  const res = await upsertAttendees(eventId, parsed, "paste");
  revalidateEvent(eventId);
  return { ok: true as const, ...res, total: parsed.length };
}

export async function setAttendeeFollowUp(
  id: string,
  followUp: (typeof ATTENDEE_FOLLOW_UPS)[number],
) {
  await requireUser();
  const [row] = await db
    .update(eventAttendees)
    .set({ followUp, updatedAt: new Date() })
    .where(eq(eventAttendees.id, id))
    .returning({ eventId: eventAttendees.eventId });
  if (row) revalidateEvent(row.eventId);
}

export async function setAttendeeStatus(
  id: string,
  status: (typeof ATTENDEE_STATUSES)[number],
) {
  await requireUser();
  const [row] = await db
    .update(eventAttendees)
    .set({ status, updatedAt: new Date() })
    .where(eq(eventAttendees.id, id))
    .returning({ eventId: eventAttendees.eventId });
  if (row) revalidateEvent(row.eventId);
}

export async function setAttendeeNote(id: string, note: string) {
  await requireUser();
  const [row] = await db
    .update(eventAttendees)
    .set({ note: note.trim() || null, updatedAt: new Date() })
    .where(eq(eventAttendees.id, id))
    .returning({ eventId: eventAttendees.eventId });
  if (row) revalidateEvent(row.eventId);
}

// Turn a worthwhile attendee into a real contact (dedup by email), link them,
// mark them promoted, and seed an event_targets "attended" row so the existing
// follow-up flow on this event picks them up.
export async function promoteAttendee(id: string) {
  await requireUser();
  const [a] = await db
    .select()
    .from(eventAttendees)
    .where(eq(eventAttendees.id, id))
    .limit(1);
  if (!a) throw new Error("Attendee not found");

  let contactId = a.contactId;
  if (!contactId) {
    const existing = await findContactByIdentity({ email: a.email });
    if (existing) {
      contactId = existing.id;
      await db
        .update(contacts)
        .set({
          email: existing.email ?? normalizeEmail(a.email),
          phone: existing.phone ?? a.phone,
          updatedAt: new Date(),
        })
        .where(eq(contacts.id, existing.id));
    } else {
      const [c] = await db
        .insert(contacts)
        .values({
          name: a.name,
          email: normalizeEmail(a.email),
          phone: a.phone,
          source: "event",
          circle: "reach",
        })
        .returning({ id: contacts.id });
      contactId = c.id;
    }
  }

  await db
    .update(eventAttendees)
    .set({ contactId, followUp: "promoted", updatedAt: new Date() })
    .where(eq(eventAttendees.id, id));

  await db
    .insert(eventTargets)
    .values({ eventId: a.eventId, contactId, status: "attended" })
    .onConflictDoNothing();

  revalidateEvent(a.eventId);
  revalidatePath("/admin/contacts");
  return { ok: true as const, contactId };
}

export async function deleteAttendee(id: string) {
  await requireUser();
  const [row] = await db
    .delete(eventAttendees)
    .where(eq(eventAttendees.id, id))
    .returning({ eventId: eventAttendees.eventId });
  if (row) revalidateEvent(row.eventId);
}
