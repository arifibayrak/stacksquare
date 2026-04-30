import Link from "next/link";
import { db, contacts, episodes, submissions, STAGES, STAGE_LABELS } from "@/db";
import { sql, isNull, and, lte, ne } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function getCounts() {
  const stageCounts = await db
    .select({
      stage: contacts.stage,
      count: sql<number>`count(*)::int`,
    })
    .from(contacts)
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

  const [epsInProgress] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(episodes)
    .where(ne(episodes.status, "published"));

  return {
    map,
    pendingSubs: pendingSubs?.count ?? 0,
    overdue: overdue?.count ?? 0,
    epsInProgress: epsInProgress?.count ?? 0,
  };
}

export default async function AdminDashboard() {
  const { map, pendingSubs, overdue, epsInProgress } = await getCounts();

  const total = STAGES.reduce((sum, s) => sum + (map.get(s) ?? 0), 0);

  return (
    <div className="px-8 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-1 text-sm text-zinc-500">
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
          label="Inbox (untriaged)"
          value={pendingSubs}
          href="/admin/submissions"
          tone={pendingSubs > 0 ? "warn" : "default"}
        />
        <Stat
          label="Episodes in progress"
          value={epsInProgress}
          href="/admin/episodes"
        />
      </div>

      <div className="mt-12">
        <h2 className="text-sm font-mono uppercase tracking-widest text-zinc-500">
          Pipeline by stage
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-9">
          {STAGES.map((s) => (
            <Link
              key={s}
              href="/admin/pipeline"
              className="rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <p className="text-xs text-zinc-500">{STAGE_LABELS[s]}</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {map.get(s) ?? 0}
              </p>
            </Link>
          ))}
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
      className="rounded-lg border border-zinc-200 bg-white p-5 transition-colors hover:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p
        className={
          "mt-2 text-3xl font-semibold tabular-nums " +
          (tone === "warn" && value > 0 ? "text-amber-600" : "")
        }
      >
        {value}
      </p>
    </Link>
  );
}
