import { db, submissions, subscribers } from "@/db";
import { desc, isNull } from "drizzle-orm";
import { formatDate } from "@/lib/utils";
import { TriageActions } from "./client";

export const dynamic = "force-dynamic";

export default async function SubmissionsPage() {
  const [pending, subs] = await Promise.all([
    db
      .select()
      .from(submissions)
      .where(isNull(submissions.triagedAt))
      .orderBy(desc(submissions.createdAt)),
    db.select().from(subscribers).orderBy(desc(subscribers.createdAt)),
  ]);

  return (
    <div className="px-8 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Public form submissions awaiting triage. Convert to a contact or mark
        as handled.
      </p>

      {pending.length === 0 ? (
        <p className="mt-10 rounded-md border border-zinc-200 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
          Nothing in the inbox.
        </p>
      ) : (
        <ul className="mt-8 space-y-3">
          {pending.map((s) => {
            const payload = s.payload as Record<string, unknown>;
            return (
              <li
                key={s.id}
                className="rounded-md border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="rounded bg-brand-500/10 px-2 py-0.5 text-xs font-medium text-brand-700 dark:text-brand-500">
                      {s.kind}
                    </span>
                    <span className="ml-3 text-xs text-zinc-500">
                      {formatDate(s.createdAt)}
                    </span>
                  </div>
                  <TriageActions id={s.id} payload={payload} kind={s.kind} />
                </div>
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  {Object.entries(payload).map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-xs uppercase tracking-wide text-zinc-500">
                        {k}
                      </dt>
                      <dd className="text-zinc-700 dark:text-zinc-300">
                        {String(v)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="mt-14 text-lg font-semibold tracking-tight">
        Newsletter subscribers
      </h2>
      <p className="mt-1 text-sm text-zinc-500">
        Emails collected from the &ldquo;join the list&rdquo; form on the
        public contact page.
      </p>
      {subs.length === 0 ? (
        <p className="mt-6 rounded-md border border-zinc-200 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
          No subscribers yet.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-zinc-200 rounded-md border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {subs.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between px-5 py-3 text-sm"
            >
              <span className="text-zinc-700 dark:text-zinc-300">
                {s.email}
              </span>
              <span className="text-xs text-zinc-500">
                {formatDate(s.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
