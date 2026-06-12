import { db, quadrantSubscribers } from "@/db";
import { desc } from "drizzle-orm";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

// The Quadrant's (thequadrant.fm) subscriber list. The Quadrant site writes
// to quadrant_subscribers in this database; this is its only admin surface.
export default async function QuadrantSubscribersPage() {
  const subs = await db
    .select()
    .from(quadrantSubscribers)
    .orderBy(desc(quadrantSubscribers.createdAt));

  return (
    <div className="px-8 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">
        The Quadrant · Subscribers
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Digest subscribers from thequadrant.fm. {subs.length} total.
      </p>

      {subs.length === 0 ? (
        <p className="mt-10 rounded-md border border-zinc-200 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
          No subscribers yet.
        </p>
      ) : (
        <div className="mt-8 overflow-hidden rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left dark:border-zinc-800">
                <th className="px-5 py-3 font-medium text-zinc-500">Email</th>
                <th className="px-5 py-3 font-medium text-zinc-500">
                  Subscribed
                </th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800/60"
                >
                  <td className="px-5 py-3">{s.email}</td>
                  <td className="px-5 py-3 text-zinc-500">
                    {formatDate(s.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
