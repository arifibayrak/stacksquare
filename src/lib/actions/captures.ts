"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { db, captures, contacts } from "@/db";

async function requireUser() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
}

/**
 * Promote a captured LinkedIn profile into the CRM. If a contact already
 * exists for the same LinkedIn URL we link to it (filling any blank fields)
 * instead of creating a duplicate.
 */
export async function promoteCapture(id: string) {
  await requireUser();

  const [cap] = await db.select().from(captures).where(eq(captures.id, id));
  if (!cap) throw new Error("Capture not found");

  const [existing] = await db
    .select()
    .from(contacts)
    .where(eq(contacts.linkedinUrl, cap.linkedinUrl));

  // Links harvested from the contact-info overlay ride in the payload.
  const payload = (cap.payload ?? {}) as { websites?: unknown };
  const websites = Array.isArray(payload.websites)
    ? (payload.websites as string[]).filter((w) => typeof w === "string")
    : [];
  const linksNote = websites.length ? `Links: ${websites.join(", ")}` : "";
  const headlineNote = cap.headline ? `Headline: ${cap.headline}` : "";
  const notes = [headlineNote, linksNote].filter(Boolean).join("\n") || null;

  let contactId: string;
  if (existing) {
    await db
      .update(contacts)
      .set({
        role: existing.role ?? cap.role,
        company: existing.company ?? cap.company,
        city: existing.city ?? cap.city,
        relationship: existing.relationship ?? cap.relationship,
        email: existing.email ?? cap.email,
        phone: existing.phone ?? cap.phone,
        seniority: existing.seniority ?? cap.seniority,
        // Append harvested links if the contact has no notes yet.
        notes: existing.notes ?? notes,
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, existing.id));
    contactId = existing.id;
  } else {
    const [row] = await db
      .insert(contacts)
      .values({
        name: cap.name,
        role: cap.role,
        company: cap.company,
        city: cap.city,
        linkedinUrl: cap.linkedinUrl,
        relationship: cap.relationship,
        email: cap.email,
        phone: cap.phone,
        seniority: cap.seniority,
        owner: cap.capturedBy,
        source: "scout",
        notes,
      })
      .returning({ id: contacts.id });
    contactId = row.id;
  }

  await db
    .update(captures)
    .set({ status: "promoted", contactId })
    .where(eq(captures.id, id));

  revalidatePath("/admin/scout");
  revalidatePath("/admin/contacts");
  revalidatePath("/admin/pipeline");
  return { contactId, linked: Boolean(existing) };
}

export async function dismissCapture(id: string) {
  await requireUser();
  await db
    .update(captures)
    .set({ status: "dismissed" })
    .where(eq(captures.id, id));
  revalidatePath("/admin/scout");
}
