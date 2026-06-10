"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { db, venues } from "@/db";

const VenueInput = z.object({
  name: z.string().min(1),
  area: z.string().optional().nullable(),
  capacity: z.preprocess(
    (v) => (v === null || v === "" || v === undefined ? null : Number(v)),
    z.number().int().nullable(),
  ),
  typicalCost: z.string().optional().nullable(),
  url: z.string().optional().nullable(),
  contactId: z.string().uuid().optional().nullable(),
  contactFallback: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
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

function parseVenue(formData: FormData) {
  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
  return VenueInput.parse(emptyToNull(raw));
}

export async function createVenue(formData: FormData) {
  await requireUser();
  const parsed = parseVenue(formData);
  const [row] = await db
    .insert(venues)
    .values({
      name: parsed.name,
      area: parsed.area ?? null,
      capacity: parsed.capacity,
      typicalCost: parsed.typicalCost ?? null,
      url: parsed.url ?? null,
      contactId: parsed.contactId ?? null,
      contactFallback: parsed.contactFallback ?? null,
      notes: parsed.notes ?? null,
    })
    .returning();
  revalidatePath("/admin/events");
  redirect(`/admin/venues/${row.id}`);
}

export async function updateVenue(id: string, formData: FormData) {
  await requireUser();
  const parsed = parseVenue(formData);
  await db
    .update(venues)
    .set({
      name: parsed.name,
      area: parsed.area ?? null,
      capacity: parsed.capacity,
      typicalCost: parsed.typicalCost ?? null,
      url: parsed.url ?? null,
      contactId: parsed.contactId ?? null,
      contactFallback: parsed.contactFallback ?? null,
      notes: parsed.notes ?? null,
      updatedAt: new Date(),
    })
    .where(eq(venues.id, id));
  revalidatePath("/admin/events");
  revalidatePath(`/admin/venues/${id}`);
}

export async function deleteVenue(id: string) {
  await requireUser();
  // events.venue_id is ON DELETE SET NULL, so linked events survive.
  await db.delete(venues).where(eq(venues.id, id));
  revalidatePath("/admin/events");
  redirect("/admin/events");
}
