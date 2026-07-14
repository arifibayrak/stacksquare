import Link from "next/link";
import { db, contacts, events, submissions, STAGES } from "@/db";
import { sql, isNull, and, lte, ne, gte, eq } from "drizzle-orm";
import { getAgenda, type AgendaItem } from "@/lib/agenda";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PHASES = [
  {
    id: "sourcing",
    label: "Sourcing",
    tagline: "find them",
    stages: ["identified", "researched"] as const,
    stripe: "var(--color-phase-sourcing)",
  },
  {
    id: "outreach",
    label: "Outreach",
    tagline: "engage",
    stages: ["reached_out", "replying"] as const,
    stripe: "var(--color-phase-outreach)",
  },
  {
    id: "production",
    label: "Production",
    tagline: "book and ship",
    stages: ["booked", "recorded", "published"] as const,
    stripe: "var(--color-phase-production)",
  },
  {
    id: "maintained",
    label: "Maintained",
    tagline: "alumni and archive",
    stages: ["long_term", "dormant"] as const,
    stripe: "var(--color-phase-maintained)",
  },
];

async function getCounts() {
  // Parked contacts (research leads not yet engaged) are excluded so the
  // dashboard mirrors the Pipeline board.
  const stageCounts = await db
    .select({
      stage: contacts.stage,
      count: sql<number>`count(*)::int`,
    })
    .from(contacts)
    .where(eq(contacts.parked, false))
    .groupBy(contacts.stage);

  const map = new Map(stageCounts.map((r) => [r.stage, r.count]));

  const [pendingSubs] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(submissions)
    .where(isNull(submissions.triagedAt));

  const today = new Date().toISOString().slice(0, 10);
  const [overdue] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contacts)
    .where(
      and(
        lte(contacts.nextActionDue, today),
        ne(contacts.stage, "long_term"),
        ne(contacts.stage, "dormant"),
      ),
    );

  const [upcoming] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(events)
    .where(and(eq(events.status, "published"), gte(events.startAt, new Date())));

  return {
    map,
    pendingSubs: pendingSubs?.count ?? 0,
    overdue: overdue?.count ?? 0,
    upcomingEvents: upcoming?.count ?? 0,
  };
}

export default async function AdminDashboard() {
  const [{ map, pendingSubs, overdue, upcomingEvents }, agenda] =
    await Promise.all([getCounts(), getAgenda()]);

  const total = STAGES.reduce((sum, s) => sum + (map.get(s) ?? 0), 0);
  const agendaTotal =
    agenda.overdue.length +
    agenda.today.length +
    agenda.soon.length +
    agenda.noDeadline.length;

  return (
    <div className="px-8 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
        Dashboard
      </h1>
      <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
        Today&rsquo;s state of the pipeline.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total contacts" value={total} href="/admin/contacts" />
        <Stat
          label="Follow-ups due"
          value={overdue}
          href="/admin/contacts?filter=due"
          tone={overdue > 0 ? "warn" : "default"}
        />
        <Stat
          label="Inbox untriaged"
          value={pendingSubs}
          href="/admin/submissions"
          tone={pendingSubs > 0 ? "warn" : "default"}
        />
        <Stat
          label="Upcoming events"
          value={upcomingEvents}
          href="/admin/events"
        />
      </div>

      <div className="mt-12">
        <div className="flex items-baseline justify-between">
          <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
            Today
          </h2>
          {agenda.noDeadline.length > 0 && (
            <Link
              href="/admin/tasks"
              className="text-[11px] text-amber-600 hover:underline"
            >
              {agenda.noDeadline.length} need a deadline
            </Link>
          )}
        </div>
        {agendaTotal === 0 ? (
          <p className="mt-4 rounded-lg border border-[var(--color-rule)] bg-white px-4 py-8 text-center text-sm text-[var(--color-ink-muted)] dark:border-zinc-800 dark:bg-zinc-900">
            All clear. Nothing due.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            <AgendaGroup label="Overdue" items={agenda.overdue} tone="overdue" />
            <AgendaGroup label="Due today" items={agenda.today} tone="today" />
            <AgendaGroup label="This week" items={agenda.soon} tone="soon" />
          </div>
        )}
      </div>

      <div className="mt-12">
        <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
          Pipeline by phase
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PHASES.map((p) => {
            const count = p.stages.reduce(
              (sum, s) => sum + (map.get(s) ?? 0),
              0,
            );
            return (
              <Link
                key={p.id}
                href="/admin/pipeline"
                className="overflow-hidden rounded-lg border border-[var(--color-rule)] bg-white transition-colors hover:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="h-1" style={{ background: p.stripe }} />
                <div className="p-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-ink)]">
                    {p.label}
                  </p>
                  <p className="text-[11px] text-[var(--color-ink-muted)]">
                    {p.tagline}
                  </p>
                  <p className="mt-3 text-3xl font-semibold tabular-nums text-[var(--color-ink)]">
                    {count}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-500">
                    {p.stages.map((s) => (
                      <span key={s}>
                        <span className="font-mono tabular-nums">
                          {map.get(s) ?? 0}
                        </span>{" "}
                        <span className="capitalize">
                          {s.replace("_", " ")}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  href,
  tone = "default",
}: {
  label: string;
  value: number;
  href: string;
  tone?: "default" | "warn";
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-[var(--color-rule)] bg-white p-5 transition-colors hover:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <p className="text-xs uppercase tracking-wide text-[var(--color-ink-muted)]">
        {label}
      </p>
      <p
        className={
          "mt-2 text-3xl font-semibold tabular-nums " +
          (tone === "warn" && value > 0
            ? "text-amber-600"
            : "text-[var(--color-ink)]")
        }
      >
        {value}
      </p>
    </Link>
  );
}

function AgendaGroup({
  label,
  items,
  tone,
}: {
  label: string;
  items: AgendaItem[];
  tone: "overdue" | "today" | "soon";
}) {
  if (items.length === 0) return null;
  const dot =
    tone === "overdue"
      ? "bg-red-500"
      : tone === "today"
        ? "bg-amber-500"
        : "bg-zinc-300";
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className={"h-1.5 w-1.5 rounded-full " + dot} />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink)]">
          {label}
        </h3>
        <span className="text-[11px] text-[var(--color-ink-muted)]">
          {items.length}
        </span>
      </div>
      <div className="mt-2 divide-y divide-[var(--color-rule)] overflow-hidden rounded-lg border border-[var(--color-rule)] bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
        {items.map((it) => (
          <AgendaRow key={it.kind + it.id} item={it} />
        ))}
      </div>
    </div>
  );
}

function AgendaRow({ item }: { item: AgendaItem }) {
  const initials =
    item.owner === "arif"
      ? "A"
      : item.owner === "kerem"
        ? "K"
        : item.owner === "both"
          ? "AK"
          : "·";
  return (
    <Link
      href={item.href}
      className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
    >
      <span
        className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
        title={item.owner ? `Owner: ${item.owner}` : "Unassigned"}
      >
        {initials}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-[var(--color-ink)]">
        {item.title}
        {item.context && (
          <span className="text-[var(--color-ink-muted)]">
            {" · "}
            {item.context}
          </span>
        )}
      </span>
      <span className="shrink-0 font-mono text-[11px] text-[var(--color-ink-muted)]">
        {item.due ? formatDate(item.due) : "no date"}
      </span>
    </Link>
  );
}
