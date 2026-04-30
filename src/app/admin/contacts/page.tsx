import Link from "next/link";
import { db, contacts, STAGE_LABELS } from "@/db";
import { desc, like, or, eq, and, lte, ne } from "drizzle-orm";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; stage?: string }>;
}) {
  const { q = "", filter = "", stage = "" } = await searchParams;

  const filters = [];
  if (q) {
    filters.push(
      or(
        like(contacts.name, `%${q}%`),
        like(contacts.company, `%${q}%`),
        like(contacts.role, `%${q}%`),
      )!,
    );
  }
  if (stage) {
    filters.push(eq(contacts.stage, stage as never));
  }
  if (filter === "due") {
    const today = new Date().toISOString().slice(0, 10);
    filters.push(
      and(
        lte(contacts.nextActionDue, today),
        ne(contacts.stage, "long_term"),
        ne(contacts.stage, "dormant"),
      )!,
    );
  }

  const list = await db
    .select()
    .from(contacts)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(contacts.updatedAt))
    .limit(200);

  return (
    <div className="px-8 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {list.length} shown · sorted by recent activity
          </p>
        </div>
        <Link
          href="/admin/contacts/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          + New contact
        </Link>
      </div>

      <form className="mt-6 flex gap-3" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name, company, role…"
          className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <select
          name="stage"
          defaultValue={stage}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">All stages</option>
          {Object.entries(STAGE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800">
          Filter
        </button>
      </form>

      <div className="mt-6 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Role / Company</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Next action</th>
              <th className="px-4 py-3">Due</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {list.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-zinc-500">
                  No contacts yet —{" "}
                  <Link
                    href="/admin/contacts/new"
                    className="text-brand-600 hover:underline"
                  >
                    add the first one
                  </Link>
                  .
                </td>
              </tr>
            ) : (
              list.map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/contacts/${c.id}`}
                      className="font-medium hover:text-brand-600"
                    >
                      {c.name}
                    </Link>
                    {c.priority === "p1" && (
                      <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
                        P1
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {c.role}
                    {c.company ? ` · ${c.company}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
                      {STAGE_LABELS[c.stage]}
                    </span>
                  </td>
                  <td className="px-4 py-3 capitalize text-zinc-600 dark:text-zinc-400">
                    {c.owner ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {c.nextAction ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {formatDate(c.nextActionDue)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
