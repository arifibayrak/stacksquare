import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import {
  db,
  events,
  appSettings,
  EVENT_STATUSES,
  EVENT_STATUS_LABELS,
  SETTING_LUMA_CALENDAR,
} from "@/db";
import { env } from "@/lib/env";
import { formatDate } from "@/lib/utils";
import { LumaSettings } from "@/components/admin/luma-settings";
import { LumaEmbed } from "@/components/luma-embed";

export const dynamic = "force-dynamic";

export default async function EventsAdminPage() {
  const list = await db
    .select()
    .from(events)
    .orderBy(asc(events.sortOrder), desc(events.startAt));

  const [setting] = await db
    .select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, SETTING_LUMA_CALENDAR))
    .limit(1);

  const calendarSource = setting?.value?.trim() || env.lumaCalendarId();

  const grouped = EVENT_STATUSES.map((status) => ({
    status,
    items: list.filter((e) => e.status === status),
  }));

  return (
    <div className="px-8 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
          <p className="mt-1 text-sm text-zinc-500">
            What the public site shows. Registration happens on Luma.
          </p>
        </div>
        <Link
          href="/admin/events/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          + New event
        </Link>
      </div>

      <div className="mt-8 max-w-2xl">
        <LumaSettings
          current={setting?.value ?? ""}
          envFallback={env.lumaCalendarId()}
        />
      </div>

      <div className="mt-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
          Live Luma calendar
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          What is scheduled on Luma. Registrations are managed there. Mirror the
          ones worth showcasing into the cards below so they appear on
          /events.
        </p>
        <div className="mt-3 max-w-3xl">
          <LumaEmbed source={calendarSource} minHeight={500} />
        </div>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {grouped.map(({ status, items }) => (
          <div
            key={status}
            className="flex flex-col rounded-lg border border-[var(--color-rule)] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-rule)] px-3 py-2.5 dark:border-zinc-800">
              <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-ink)]">
                {EVENT_STATUS_LABELS[status]}
              </h3>
              <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] tabular-nums text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                {items.length}
              </span>
            </div>
            <div className="flex flex-col gap-1.5 p-2">
              {items.map((e) => (
                <Link
                  key={e.id}
                  href={`/admin/events/${e.id}`}
                  className="rounded-md border border-zinc-200 bg-white p-2.5 text-sm shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-brand-500 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate font-medium text-[var(--color-ink)]">
                      {e.title}
                    </p>
                    {e.featured && (
                      <span className="shrink-0 rounded bg-brand-50 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-brand-700">
                        Featured
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 font-mono text-[10px] text-zinc-400">
                    {e.startAt ? formatDate(e.startAt) : "No date set"}
                    {e.location ? ` · ${e.location}` : ""}
                  </p>
                </Link>
              ))}
              {items.length === 0 && (
                <p className="px-2 py-4 text-center text-[11px] text-zinc-400">
                  Empty
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
