"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { db, tasks } from "@/db";
import { currentOwner } from "@/lib/owner";
import { sendTaskAssignedEmail } from "@/lib/notify";
import type { Founder } from "@/lib/agenda";

const PRIORITY = ["p1", "p2", "p3"] as const;
const OWNER = ["arif", "kerem", "both"] as const;

// Real-time "assigned to you" emails: notify every founder the task now lands
// on, except the one doing the assigning. Sending is best-effort and never
// throws (see notify.ts), so it can't break the write.
function assignmentRecipients(
  owner: (typeof OWNER)[number],
  actor: Founder,
): Founder[] {
  const set: Founder[] =
    owner === "both"
      ? ["arif", "kerem"]
      : owner === "arif"
        ? ["arif"]
        : owner === "kerem"
          ? ["kerem"]
          : [];
  return set.filter((f) => f !== actor);
}

async function notifyAssignment(
  owner: (typeof OWNER)[number],
  actor: Founder,
  title: string,
  due: string | null,
) {
  for (const to of assignmentRecipients(owner, actor)) {
    await sendTaskAssignedEmail({ to, assignedBy: actor, title, due });
  }
}

const TaskInput = z.object({
  title: z.string().min(1),
  notes: z.string().optional().nullable(),
  owner: z.enum(OWNER).optional().nullable(),
  priority: z.enum(PRIORITY).default("p2"),
  dueDate: z.string().optional().nullable(),
  contactId: z.string().uuid().optional().nullable(),
  eventId: z.string().uuid().optional().nullable(),
});

function emptyToNull<T extends Record<string, unknown>>(o: T): T {
  const out = { ...o };
  for (const k of Object.keys(out))
    if (out[k] === "") (out as Record<string, unknown>)[k] = null;
  return out;
}

async function requireUser() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
}

function revalidateTasks(
  contactId?: string | null,
  eventId?: string | null,
) {
  revalidatePath("/admin/tasks");
  revalidatePath("/admin");
  if (contactId) revalidatePath(`/admin/contacts/${contactId}`);
  if (eventId) revalidatePath(`/admin/events/${eventId}`);
}

export async function createTask(formData: FormData) {
  await requireUser();
  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
  const parsed = TaskInput.parse(emptyToNull(raw));
  // The admin allowlist means every authed user is one of the founders;
  // an unmapped email is a config problem, not a task author.
  const me = await currentOwner();
  if (!me) throw new Error("Unknown owner. Sign in with a founder account.");
  const owner = parsed.owner ?? me;
  await db.insert(tasks).values({
    title: parsed.title,
    notes: parsed.notes ?? null,
    owner,
    createdBy: me,
    priority: parsed.priority,
    dueDate: parsed.dueDate ?? null,
    contactId: parsed.contactId ?? null,
    eventId: parsed.eventId ?? null,
  });
  await notifyAssignment(owner, me, parsed.title, parsed.dueDate ?? null);
  revalidateTasks(parsed.contactId, parsed.eventId);
}

export async function updateTask(id: string, formData: FormData) {
  await requireUser();
  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
  const parsed = TaskInput.parse(emptyToNull(raw));
  await db
    .update(tasks)
    .set({
      title: parsed.title,
      notes: parsed.notes ?? null,
      // Owner is notNull; keep the current one when the form omits it.
      ...(parsed.owner ? { owner: parsed.owner } : {}),
      priority: parsed.priority,
      dueDate: parsed.dueDate ?? null,
      contactId: parsed.contactId ?? null,
      eventId: parsed.eventId ?? null,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, id));
  revalidateTasks(parsed.contactId, parsed.eventId);
}

export async function toggleTaskDone(id: string, done: boolean) {
  await requireUser();
  await db
    .update(tasks)
    .set({
      status: done ? "done" : "open",
      completedAt: done ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, id));
  revalidateTasks();
}

export async function setTaskOwner(id: string, owner: (typeof OWNER)[number]) {
  await requireUser();
  const [row] = await db
    .update(tasks)
    .set({ owner, updatedAt: new Date() })
    .where(eq(tasks.id, id))
    .returning({ title: tasks.title, dueDate: tasks.dueDate });
  const actor = await currentOwner();
  if (actor && row) await notifyAssignment(owner, actor, row.title, row.dueDate);
  revalidateTasks();
}

export async function setTaskPriority(
  id: string,
  priority: (typeof PRIORITY)[number],
) {
  await requireUser();
  await db
    .update(tasks)
    .set({ priority, updatedAt: new Date() })
    .where(eq(tasks.id, id));
  revalidateTasks();
}

export async function setTaskDue(id: string, due: string | null) {
  await requireUser();
  await db
    .update(tasks)
    .set({ dueDate: due || null, updatedAt: new Date() })
    .where(eq(tasks.id, id));
  revalidateTasks();
}

export async function deleteTask(id: string) {
  await requireUser();
  await db.delete(tasks).where(eq(tasks.id, id));
  revalidateTasks();
}
