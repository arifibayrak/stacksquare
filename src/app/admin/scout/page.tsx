import Link from "next/link";
import { db, captures } from "@/db";
import { desc, eq, sql } from "drizzle-orm";
import { formatDate } from "@/lib/utils";
import { CaptureActions } from "./client";

export const dynamic = "force-dynamic";

export default async function ScoutQueuePage() {
  const [pending, counts] = await Promise.all([
    db
      .select()
      .from(captures)
      .where(eq(captures.status, "pending"))
      .orderBy(desc(captures.capturedAt))
      .limit(200),
    db
      .select({ status: captures.status, n: sql<number>`count(*)::int` })
      .from(captures)
      .groupBy(captures.status),
  ]);

  const count = (s: string) => counts.find((c) => c.status === s)?.n ?? 0;

  return (
    <div className="px-8 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Scout queue</h1>
      <p className="mt-1 text-sm text-zinc-500">
        LinkedIn profiles captured while browsing with Scout on. Promote to
        create a contact, dismiss to ignore. {count("promoted")} promoted ·{" "}
        {count("dismissed")} dismissed all-time.
      </p>

      {pending.length === 0 ? (
        <p className="mt-10 rounded-md border border-zinc-200 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
          Queue is clear. Flip the Scout switch in the extension and open
          LinkedIn profiles; they will land here.
        </p>
      ) : (
        <ul className="mt-8 space-y-3">
          {pending.map((c) => (
            <li
              key={c.id}
              className="flex items-start justify-between gap-4 rounded-md border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={c.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-[var(--color-ink)] hover:text-brand-600"
                  >
                    {c.name} ↗
                  </a>
                  {c.relationship ? (
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      {c.relationship.replace("_", " ")}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 truncate text-sm text-zinc-600 dark:text-zinc-300">
                  {[c.role, c.company].filter(Boolean).join(" · ") ||
                    c.headline ||
                    "No role detected"}
                  {c.city ? ` · ${c.city}` : ""}
                </p>
                {(c.email || c.phone) && (
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                    {[c.email, c.phone].filter(Boolean).join(" · ")}
                  </p>
                )}
                <p className="mt-1 text-xs text-zinc-500">
                  Captured by {c.capturedBy} · {formatDate(c.capturedAt)}
                </p>
              </div>
              <CaptureActions id={c.id} name={c.name} />
            </li>
          ))}
        </ul>
      )}

      <p className="mt-10 text-xs text-zinc-500">
        Promoted contacts land in{" "}
        <Link href="/admin/contacts" className="text-brand-600 hover:underline">
          Contacts
        </Link>{" "}
        as Identified · Within reach, owned by whoever captured them.
      </p>
    </div>
  );
}
