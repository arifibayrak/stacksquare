"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { Resend } from "resend";
import {
  db,
  contacts,
  events,
  eventCosts,
  eventSpeakers,
  eventTargets,
  eventTasks,
  outreachLog,
  COST_CATEGORIES,
  EVENT_TARGET_STATUSES,
  EVENT_TASK_SECTIONS,
  SPEAKER_STATUSES,
  OWNERS,
} from "@/db";
import { env } from "@/lib/env";
import { formatDate } from "@/lib/utils";

const CHANNELS = [
  "linkedin_dm",
  "email",
  "whatsapp",
  "intro_ask",
  "in_person",
  "call",
  "other",
] as const;

async function requireUser() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
}

function revalidateEvent(eventId: string) {
  revalidatePath(`/admin/events/${eventId}`);
}

// "120" or "120.50" (pounds) -> pence; empty -> null.
function poundsToPence(v: string | null | undefined): number | null {
  if (!v || !v.trim()) return null;
  const n = Number(v);
  if (Number.isNaN(n)) return null;
  return Math.round(n * 100);
}

// ---------- Costs ----------

const CostInput = z.object({
  label: z.string().min(1),
  category: z.enum(COST_CATEGORIES).default("other"),
  estimated: z.string().optional().nullable(),
  actual: z.string().optional().nullable(),
  paidBy: z.enum(OWNERS).optional().nullable(),
  note: z.string().optional().nullable(),
});

function parseCost(formData: FormData) {
  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
  return CostInput.parse({
    ...raw,
    paidBy: raw.paidBy || null,
    note: raw.note || null,
  });
}

export async function addCost(eventId: string, formData: FormData) {
  await requireUser();
  const parsed = parseCost(formData);
  await db.insert(eventCosts).values({
    eventId,
    label: parsed.label,
    category: parsed.category,
    estimatedPence: poundsToPence(parsed.estimated),
    actualPence: poundsToPence(parsed.actual),
    paidBy: parsed.paidBy ?? null,
    note: parsed.note ?? null,
  });
  revalidateEvent(eventId);
}

export async function setCostActual(id: string, actual: string) {
  await requireUser();
  const [row] = await db
    .update(eventCosts)
    .set({ actualPence: poundsToPence(actual) })
    .where(eq(eventCosts.id, id))
    .returning({ eventId: eventCosts.eventId });
  if (row) revalidateEvent(row.eventId);
}

export async function deleteCost(id: string) {
  await requireUser();
  const [row] = await db
    .delete(eventCosts)
    .where(eq(eventCosts.id, id))
    .returning({ eventId: eventCosts.eventId });
  if (row) revalidateEvent(row.eventId);
}

// ---------- Speakers ----------

export async function addSpeaker(
  eventId: string,
  contactId: string,
  role: string,
) {
  await requireUser();
  await db.insert(eventSpeakers).values({
    eventId,
    contactId,
    role: role.trim() || null,
  });
  revalidateEvent(eventId);
}

export async function setSpeakerStatus(
  id: string,
  status: (typeof SPEAKER_STATUSES)[number],
) {
  await requireUser();
  const [row] = await db
    .update(eventSpeakers)
    .set({ status })
    .where(eq(eventSpeakers.id, id))
    .returning({ eventId: eventSpeakers.eventId });
  if (row) revalidateEvent(row.eventId);
}

export async function deleteSpeaker(id: string) {
  await requireUser();
  const [row] = await db
    .delete(eventSpeakers)
    .where(eq(eventSpeakers.id, id))
    .returning({ eventId: eventSpeakers.eventId });
  if (row) revalidateEvent(row.eventId);
}

// ---------- Targets ----------

export async function addTargets(eventId: string, contactIds: string[]) {
  await requireUser();
  if (contactIds.length === 0) return;
  await db
    .insert(eventTargets)
    .values(contactIds.map((contactId) => ({ eventId, contactId })))
    .onConflictDoNothing();
  revalidateEvent(eventId);
}

export async function setTargetStatus(
  id: string,
  status: (typeof EVENT_TARGET_STATUSES)[number],
) {
  await requireUser();
  const [row] = await db
    .update(eventTargets)
    .set({ status })
    .where(eq(eventTargets.id, id))
    .returning({ eventId: eventTargets.eventId });
  if (row) revalidateEvent(row.eventId);
}

export async function deleteTarget(id: string) {
  await requireUser();
  const [row] = await db
    .delete(eventTargets)
    .where(eq(eventTargets.id, id))
    .returning({ eventId: eventTargets.eventId });
  if (row) revalidateEvent(row.eventId);
}

// ---------- Tasks ----------

const TaskInput = z.object({
  section: z.enum(EVENT_TASK_SECTIONS),
  title: z.string().min(1),
  owner: z.enum(OWNERS).optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

export async function addTask(eventId: string, formData: FormData) {
  await requireUser();
  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
  const parsed = TaskInput.parse({
    ...raw,
    owner: raw.owner || null,
    dueDate: raw.dueDate || null,
  });
  await db.insert(eventTasks).values({
    eventId,
    section: parsed.section,
    title: parsed.title,
    owner: parsed.owner ?? null,
    dueDate: parsed.dueDate ?? null,
  });
  revalidateEvent(eventId);
}

export async function toggleTask(id: string, done: boolean) {
  await requireUser();
  const [row] = await db
    .update(eventTasks)
    .set({ done })
    .where(eq(eventTasks.id, id))
    .returning({ eventId: eventTasks.eventId });
  if (row) revalidateEvent(row.eventId);
}

export async function deleteTask(id: string) {
  await requireUser();
  const [row] = await db
    .delete(eventTasks)
    .where(eq(eventTasks.id, id))
    .returning({ eventId: eventTasks.eventId });
  if (row) revalidateEvent(row.eventId);
}

// ---------- Batch follow-up outreach ----------

function fillTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

const FollowUpInput = z.object({
  targetIds: z.array(z.string().uuid()).min(1),
  templateId: z.string().uuid().optional().nullable(),
  channel: z.enum(CHANNELS),
  subject: z.string().optional().nullable(),
  body: z.string().min(1),
  owner: z.enum(OWNERS).optional().nullable(),
  alsoSendEmail: z.boolean().default(false),
});

// Logs one outreach entry per selected target (variables filled per
// contact), stamps followed_up_at, and optionally sends real email via
// Resend to contacts that have an email address.
export async function followUpBatch(
  eventId: string,
  input: z.infer<typeof FollowUpInput>,
): Promise<{ logged: number; emailed: number }> {
  await requireUser();
  const parsed = FollowUpInput.parse(input);

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  if (!event) throw new Error("Event not found");

  const rows = await db
    .select({
      targetId: eventTargets.id,
      contact: contacts,
    })
    .from(eventTargets)
    .innerJoin(contacts, eq(eventTargets.contactId, contacts.id))
    .where(
      and(
        eq(eventTargets.eventId, eventId),
        inArray(eventTargets.id, parsed.targetIds),
      ),
    );
  if (rows.length === 0) throw new Error("No matching attendees");

  const resendKey = env.resendKey();
  const wantsEmail = parsed.alsoSendEmail && parsed.channel === "email";
  if (wantsEmail && !resendKey) throw new Error("RESEND_API_KEY not configured");
  const resend = wantsEmail && resendKey ? new Resend(resendKey) : null;

  let emailed = 0;
  const now = new Date();

  for (const { targetId, contact: c } of rows) {
    const vars: Record<string, string> = {
      name: c.name,
      firstName: c.name.split(" ")[0] ?? c.name,
      role: c.role ?? "",
      company: c.company ?? "",
      city: c.city ?? "",
      event: event.title,
      eventDate: event.startAt ? formatDate(event.startAt) : "",
    };
    const body = fillTemplate(parsed.body, vars);
    const subject = parsed.subject ? fillTemplate(parsed.subject, vars) : null;

    if (resend && c.email) {
      await resend.emails.send({
        from: env.resendFrom(),
        to: c.email,
        subject: subject ?? `Thanks for joining ${event.title}`,
        text: body,
      });
      emailed += 1;
    }

    await db.insert(outreachLog).values({
      contactId: c.id,
      templateId: parsed.templateId ?? null,
      channel: parsed.channel,
      subject,
      body,
      owner: parsed.owner ?? null,
    });

    await db
      .update(eventTargets)
      .set({ followedUpAt: now })
      .where(eq(eventTargets.id, targetId));

    await db
      .update(contacts)
      .set({ lastTouchAt: now, updatedAt: now })
      .where(eq(contacts.id, c.id));
  }

  revalidateEvent(eventId);
  revalidatePath("/admin/outreach");
  return { logged: rows.length, emailed };
}
