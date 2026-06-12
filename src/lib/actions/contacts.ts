"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { db, contacts, touchLog, submissions, aiRuns, STAGES } from "@/db";

const SENIORITY = ["peer", "mid", "senior", "c_suite"] as const;
const RELATIONSHIP = ["warm_1st", "warm_2nd", "cold"] as const;
const PRIORITY = ["p1", "p2", "p3"] as const;
const OWNER = ["arif", "kerem", "both"] as const;
const CIRCLES = ["inner", "reach", "moonshot"] as const;

const ContactInput = z.object({
  name: z.string().min(1),
  role: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  linkedinUrl: z.string().url().optional().or(z.literal("")).nullable(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  phone: z.string().optional().nullable(),
  seniority: z.enum(SENIORITY).optional().nullable(),
  expertise: z.array(z.string()).default([]),
  relationship: z.enum(RELATIONSHIP).optional().nullable(),
  circle: z.enum(CIRCLES).default("reach"),
  source: z.string().optional().nullable(),
  stage: z.enum(STAGES).default("identified"),
  fitScore: z.coerce.number().int().min(1).max(10).optional().nullable(),
  priority: z.enum(PRIORITY).default("p2"),
  owner: z.enum(OWNER).optional().nullable(),
  nextAction: z.string().optional().nullable(),
  nextActionDue: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

function parseFormData(fd: FormData) {
  const raw = Object.fromEntries(fd.entries()) as Record<string, string>;
  return {
    ...raw,
    expertise: (raw.expertise || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  };
}

function emptyToNull<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj };
  for (const k of Object.keys(out)) {
    if (out[k] === "") (out as Record<string, unknown>)[k] = null;
  }
  return out;
}

export async function createContact(formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const parsed = ContactInput.parse(emptyToNull(parseFormData(formData)));
  const [row] = await db.insert(contacts).values(parsed).returning();
  revalidatePath("/admin/contacts");
  revalidatePath("/admin/pipeline");
  redirect(`/admin/contacts/${row.id}`);
}

export async function updateContact(id: string, formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const parsed = ContactInput.parse(emptyToNull(parseFormData(formData)));
  await db
    .update(contacts)
    .set({ ...parsed, updatedAt: new Date() })
    .where(eq(contacts.id, id));
  revalidatePath("/admin/contacts");
  revalidatePath(`/admin/contacts/${id}`);
  revalidatePath("/admin/pipeline");
}

export async function moveContactStage(
  id: string,
  stage: (typeof STAGES)[number],
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await db
    .update(contacts)
    .set({ stage, updatedAt: new Date() })
    .where(eq(contacts.id, id));
  revalidatePath("/admin/pipeline");
  revalidatePath("/admin/contacts");
  revalidatePath(`/admin/contacts/${id}`);
}

export async function setContactPriority(
  id: string,
  priority: (typeof PRIORITY)[number],
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  await db
    .update(contacts)
    .set({ priority, updatedAt: new Date() })
    .where(eq(contacts.id, id));
  revalidatePath("/admin/pipeline");
  revalidatePath("/admin/contacts");
  revalidatePath(`/admin/contacts/${id}`);
}

export async function setContactOwner(
  id: string,
  owner: (typeof OWNER)[number] | "",
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  await db
    .update(contacts)
    .set({
      owner: owner === "" ? null : owner,
      updatedAt: new Date(),
    })
    .where(eq(contacts.id, id));
  revalidatePath("/admin/pipeline");
  revalidatePath("/admin/contacts");
  revalidatePath(`/admin/contacts/${id}`);
}

export async function setContactCircle(
  id: string,
  circle: (typeof CIRCLES)[number],
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  await db
    .update(contacts)
    .set({ circle, updatedAt: new Date() })
    .where(eq(contacts.id, id));
  revalidatePath("/admin/pipeline");
  revalidatePath("/admin/contacts");
  revalidatePath(`/admin/contacts/${id}`);
}

export async function deleteContact(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Detach rows that reference the contact without a cascade rule
  // (inbox submissions and AI runs keep their history, unlinked),
  // otherwise Postgres rejects the delete with an FK violation.
  await db
    .update(submissions)
    .set({ contactId: null })
    .where(eq(submissions.contactId, id));
  await db
    .update(aiRuns)
    .set({ contactId: null })
    .where(eq(aiRuns.contactId, id));

  await db.delete(contacts).where(eq(contacts.id, id));
  revalidatePath("/admin/contacts");
  revalidatePath("/admin/pipeline");
  redirect("/admin/contacts");
}

export async function logTouch(formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const contactId = String(formData.get("contactId") ?? "");
  const channel = String(formData.get("channel") ?? "other");
  const summary = String(formData.get("summary") ?? "").trim();
  const owner = String(formData.get("owner") ?? "") || null;
  if (!contactId || !summary) return;

  await db.insert(touchLog).values({
    contactId,
    channel: channel as never,
    summary,
    owner: (owner as never) || null,
  });
  await db
    .update(contacts)
    .set({ lastTouchAt: new Date(), updatedAt: new Date() })
    .where(eq(contacts.id, contactId));
  revalidatePath(`/admin/contacts/${contactId}`);
}
