import Link from "next/link";
import { db, captures } from "@/db";
import { desc, eq, sql } from "drizzle-orm";
import { CaptureCard } from "./client";

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
            <CaptureCard key={c.id} capture={c} />
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
