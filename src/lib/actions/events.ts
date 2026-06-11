"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import {
  db,
  events,
  eventTasks,
  appSettings,
  EVENT_STATUSES,
  SETTING_LUMA_CALENDAR,
} from "@/db";
import { slugify } from "@/lib/utils";
import { DEFAULT_EVENT_TASKS } from "@/lib/event-task-defaults";

const EventInput = z.object({
  title: z.string().min(1),
  summary: z.string().optional().nullable(),
  lumaUrl: z.string().optional().nullable(),
  lumaEventId: z.string().optional().nullable(),
  startAt: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  coverImage: z.string().optional().nullable(),
  gallery: z.string().optional().nullable(),
  status: z.enum(EVENT_STATUSES).default("draft"),
  featured: z.coerce.boolean().default(false),
  sortOrder: z.coerce.number().int().default(0),
  notes: z.string().optional().nullable(),
  venueId: z.string().uuid().optional().nullable(),
  targetHeadcount: z.preprocess(
    (v) => (v === null || v === "" || v === undefined ? null : Number(v)),
    z.number().int().nullable(),
  ),
  catering: z.string().optional().nullable(),
  avSetup: z.string().optional().nullable(),
  runOfShow: z.string().optional().nullable(),
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

// HTML datetime-local sends "2026-06-01T18:30"; store as a real timestamp.
function parseStartAt(v: string | null | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Textarea sends one image URL per line; store as a clean array (or null).
function parseGallery(v: string | null | undefined): string[] | null {
  if (!v) return null;
  const urls = v
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  return urls.length > 0 ? urls : null;
}

function revalidatePublic() {
  revalidatePath("/");
  revalidatePath("/events");
}

export async function createEvent(formData: FormData) {
  await requireUser();
  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
  // Checkbox: present only when checked.
  raw.featured = formData.get("featured") ? "true" : "false";
  const parsed = EventInput.parse(emptyToNull(raw));
  const slug =
    slugify(parsed.title) + "-" + Math.random().toString(36).slice(2, 6);
  const [row] = await db
    .insert(events)
    .values({
      title: parsed.title,
      slug,
      summary: parsed.summary ?? null,
      lumaUrl: parsed.lumaUrl ?? null,
      lumaEventId: parsed.lumaEventId ?? null,
      startAt: parseStartAt(parsed.startAt),
      location: parsed.location ?? null,
      coverImage: parsed.coverImage ?? null,
      gallery: parseGallery(parsed.gallery),
      status: parsed.status,
      featured: parsed.featured,
      sortOrder: parsed.sortOrder,
      notes: parsed.notes ?? null,
      venueId: parsed.venueId ?? null,
      targetHeadcount: parsed.targetHeadcount,
      catering: parsed.catering ?? null,
      avSetup: parsed.avSetup ?? null,
      runOfShow: parsed.runOfShow ?? null,
    })
    .returning();
  // Seed the standard process checklist; delete what does not apply.
  await db.insert(eventTasks).values(
    DEFAULT_EVENT_TASKS.map((t, i) => ({
      eventId: row.id,
      section: t.section,
      title: t.title,
      sortOrder: i,
    })),
  );
  revalidatePath("/admin/events");
  revalidatePublic();
  redirect(`/admin/events/${row.id}`);
}

export async function updateEvent(id: string, formData: FormData) {
  await requireUser();
  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
  raw.featured = formData.get("featured") ? "true" : "false";
  const parsed = EventInput.parse(emptyToNull(raw));
  await db
    .update(events)
    .set({
      title: parsed.title,
      summary: parsed.summary ?? null,
      lumaUrl: parsed.lumaUrl ?? null,
      lumaEventId: parsed.lumaEventId ?? null,
      startAt: parseStartAt(parsed.startAt),
      location: parsed.location ?? null,
      coverImage: parsed.coverImage ?? null,
      gallery: parseGallery(parsed.gallery),
      status: parsed.status,
      featured: parsed.featured,
      sortOrder: parsed.sortOrder,
      notes: parsed.notes ?? null,
      venueId: parsed.venueId ?? null,
      targetHeadcount: parsed.targetHeadcount,
      catering: parsed.catering ?? null,
      avSetup: parsed.avSetup ?? null,
      runOfShow: parsed.runOfShow ?? null,
      updatedAt: new Date(),
    })
    .where(eq(events.id, id));
  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${id}`);
  revalidatePublic();
}

export async function setEventStatus(
  id: string,
  status: (typeof EVENT_STATUSES)[number],
) {
  await requireUser();
  await db
    .update(events)
    .set({ status, updatedAt: new Date() })
    .where(eq(events.id, id));
  revalidatePath("/admin/events");
  revalidatePublic();
}

export async function deleteEvent(id: string) {
  await requireUser();
  await db.delete(events).where(eq(events.id, id));
  revalidatePath("/admin/events");
  redirect("/admin/events");
}

// Upsert the Luma calendar id/URL the public site embeds.
export async function setLumaCalendar(value: string) {
  await requireUser();
  const trimmed = value.trim();
  await db
    .insert(appSettings)
    .values({ key: SETTING_LUMA_CALENDAR, value: trimmed, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: trimmed, updatedAt: new Date() },
    });
  revalidatePath("/admin/events");
  revalidatePublic();
}
