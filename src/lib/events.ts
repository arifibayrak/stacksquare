import { eq } from "drizzle-orm";
import { db, events, type EventItem } from "@/db";

export type SplitEvents = {
  upcoming: EventItem[];
  past: EventItem[];
};

function startMs(e: EventItem): number | null {
  if (!e.startAt) return null;
  const t = new Date(e.startAt).getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * Published events for the public site, split into upcoming (active) and past
 * (finished). Undated events are treated as upcoming and sorted last.
 * Upcoming: soonest first. Past: most recent first (recap archive order).
 */
export async function getPublishedEvents(): Promise<SplitEvents> {
  const rows = await db
    .select()
    .from(events)
    .where(eq(events.status, "published"));

  const now = Date.now();
  const upcoming: EventItem[] = [];
  const past: EventItem[] = [];

  for (const e of rows) {
    const ms = startMs(e);
    if (ms !== null && ms < now) past.push(e);
    else upcoming.push(e);
  }

  upcoming.sort((a, b) => (startMs(a) ?? Infinity) - (startMs(b) ?? Infinity));
  past.sort((a, b) => (startMs(b) ?? 0) - (startMs(a) ?? 0));

  return { upcoming, past };
}
