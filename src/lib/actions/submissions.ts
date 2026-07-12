"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { db, submissions, contacts } from "@/db";
import {
  canonicalLinkedin,
  normalizeEmail,
  findContactByIdentity,
} from "@/lib/contacts-dedup";

async function requireUser() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
}

export async function markTriaged(id: string) {
  await requireUser();
  await db
    .update(submissions)
    .set({ triagedAt: new Date() })
    .where(eq(submissions.id, id));
  revalidatePath("/admin/submissions");
}

export async function convertToContact(opts: {
  submissionId: string;
  name: string;
  email: string | null;
  linkedinUrl: string | null;
  source: string;
  notes: string;
}) {
  await requireUser();
  const email = normalizeEmail(opts.email);
  const linkedinUrl = canonicalLinkedin(opts.linkedinUrl);

  // Dedupe: link the submission to the existing contact (filling its blank
  // identity keys) rather than creating a second row for the same person.
  const existing = await findContactByIdentity({ linkedinUrl, email });
  let contactId: string;
  if (existing) {
    await db
      .update(contacts)
      .set({
        email: existing.email ?? email,
        linkedinUrl: existing.linkedinUrl ?? linkedinUrl,
        source: existing.source ?? opts.source,
        notes: existing.notes ?? opts.notes,
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, existing.id));
    contactId = existing.id;
  } else {
    const [c] = await db
      .insert(contacts)
      .values({
        name: opts.name,
        email,
        linkedinUrl,
        source: opts.source,
        notes: opts.notes,
        stage: "identified",
        priority: "p2",
      })
      .returning();
    contactId = c.id;
  }
  await db
    .update(submissions)
    .set({ triagedAt: new Date(), contactId })
    .where(eq(submissions.id, opts.submissionId));
  revalidatePath("/admin/submissions");
  redirect(`/admin/contacts/${contactId}`);
}
