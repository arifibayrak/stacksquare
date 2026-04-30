"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { db, submissions, contacts } from "@/db";

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
  const [c] = await db
    .insert(contacts)
    .values({
      name: opts.name,
      email: opts.email,
      linkedinUrl: opts.linkedinUrl,
      source: opts.source,
      notes: opts.notes,
      stage: "identified",
      priority: "p2",
    })
    .returning();
  await db
    .update(submissions)
    .set({ triagedAt: new Date(), contactId: c.id })
    .where(eq(submissions.id, opts.submissionId));
  revalidatePath("/admin/submissions");
  redirect(`/admin/contacts/${c.id}`);
}
