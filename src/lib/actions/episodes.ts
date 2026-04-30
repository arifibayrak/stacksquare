"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { db, episodes, EPISODE_STATUSES } from "@/db";
import { slugify } from "@/lib/utils";

const EpisodeInput = z.object({
  title: z.string().min(1),
  guestId: z.string().uuid().optional().or(z.literal("")).nullable(),
  status: z.enum(EPISODE_STATUSES).default("idea"),
  recordDate: z.string().optional().nullable(),
  recordLocation: z.string().optional().nullable(),
  publishDate: z.string().optional().nullable(),
  youtubeId: z.string().optional().nullable(),
  spotifyUrl: z.string().optional().nullable(),
  durationMin: z.coerce.number().int().optional().nullable(),
  shortClipsCount: z.coerce.number().int().default(0),
  researchDoc: z.string().optional().nullable(),
  questionOutline: z.string().optional().nullable(),
  showNotes: z.string().optional().nullable(),
  transcript: z.string().optional().nullable(),
});

function emptyToNull<T extends Record<string, unknown>>(o: T): T {
  const out = { ...o };
  for (const k of Object.keys(out))
    if (out[k] === "") (out as Record<string, unknown>)[k] = null;
  return out;
}

export async function createEpisode(formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const data = emptyToNull(
    Object.fromEntries(formData.entries()) as Record<string, string>,
  );
  const parsed = EpisodeInput.parse(data);
  const slug = slugify(parsed.title) + "-" + Math.random().toString(36).slice(2, 6);
  const [row] = await db
    .insert(episodes)
    .values({ ...parsed, slug, guestId: parsed.guestId || null })
    .returning();
  revalidatePath("/admin/episodes");
  redirect(`/admin/episodes/${row.id}`);
}

export async function updateEpisode(id: string, formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const data = emptyToNull(
    Object.fromEntries(formData.entries()) as Record<string, string>,
  );
  const parsed = EpisodeInput.parse(data);
  await db
    .update(episodes)
    .set({ ...parsed, guestId: parsed.guestId || null, updatedAt: new Date() })
    .where(eq(episodes.id, id));
  revalidatePath("/admin/episodes");
  revalidatePath(`/admin/episodes/${id}`);
  revalidatePath("/episodes");
}

export async function moveEpisodeStatus(
  id: string,
  status: (typeof EPISODE_STATUSES)[number],
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  await db
    .update(episodes)
    .set({ status, updatedAt: new Date() })
    .where(eq(episodes.id, id));
  revalidatePath("/admin/episodes");
  revalidatePath("/episodes");
}

export async function deleteEpisode(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  await db.delete(episodes).where(eq(episodes.id, id));
  revalidatePath("/admin/episodes");
  redirect("/admin/episodes");
}
