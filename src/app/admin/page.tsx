import Link from "next/link";
import { db, contacts, events, submissions, STAGES } from "@/db";
import { sql, isNull, and, lte, ne, gte, eq } from "drizzle-orm";

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
  const { map, pendingSubs, overdue, upcomingEvents } = await getCounts();

  const total = STAGES.reduce((sum, s) => sum + (map.get(s) ?? 0), 0);

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
