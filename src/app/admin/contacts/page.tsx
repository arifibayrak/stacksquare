import Link from "next/link";
import {
  db,
  contacts,
  STAGE_LABELS,
  CIRCLES,
  CIRCLE_LABELS,
  CIRCLE_DESCRIPTIONS,
  type Contact,
} from "@/db";
import { desc, like, or, eq, and, lte, ne } from "drizzle-orm";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function ContactsTable({ rows }: { rows: Contact[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--color-rule)] bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <table className="w-full text-sm">
        <thead className="border-b border-[var(--color-rule)] text-left text-xs uppercase tracking-wide text-[var(--color-ink-muted)] dark:border-zinc-800">
          <tr>
            <th className="w-8 px-4 py-3"></th>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Role / Company</th>
            <th className="px-4 py-3">Stage</th>
            <th className="px-4 py-3">Owner</th>
            <th className="px-4 py-3">Next action</th>
            <th className="px-4 py-3">Due</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-rule)] dark:divide-zinc-800">
          {rows.map((c) => {
            const dot =
              c.priority === "p1"
                ? "bg-red-500"
                : c.priority === "p2"
                  ? "bg-amber-500"
                  : "bg-zinc-300";
            return (
              <tr
                key={c.id}
                className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
                <td className="px-4 py-3">
                  <span
                    className={"inline-block h-2 w-2 rounded-full " + dot}
                    title={(c.priority ?? "p2").toUpperCase()}
                  />
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/contacts/${c.id}`}
                    className="font-medium text-[var(--color-ink)] hover:text-brand-600"
                  >
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[var(--color-ink-soft)]">
                  {c.role}
                  {c.company ? ` · ${c.company}` : ""}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
                    {STAGE_LABELS[c.stage]}
                  </span>
                </td>
                <td className="px-4 py-3 capitalize text-[var(--color-ink-soft)]">
                  {c.owner ?? "·"}
                </td>
                <td className="px-4 py-3 text-[var(--color-ink-soft)]">
                  {c.nextAction ?? "·"}
                </td>
                <td className="px-4 py-3 text-[var(--color-ink-soft)]">
                  {formatDate(c.nextActionDue)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    filter?: string;
    stage?: string;
    circle?: string;
  }>;
}) {
  const { q = "", filter = "", stage = "", circle = "" } = await searchParams;

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
  if (circle) {
    filters.push(eq(contacts.circle, circle as never));
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

  const isFiltered = Boolean(q || stage || circle || filter);

  const list = await db
    .select()
    .from(contacts)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(contacts.updatedAt))
    .limit(200);

  // Parked contacts (research leads not yet engaged) sit in their own section,
  // out of the working circles, so they don't clutter the active relationships.
  const parked = list.filter((c) => c.parked);
  const active = list.filter((c) => !c.parked);
  const groups = CIRCLES.map((key) => ({
    key,
    rows: active.filter((c) => c.circle === key),
  }));

  return (
    <div className="px-8 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
            Contacts
          </h1>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            {list.length} shown · sorted by recent activity
          </p>
        </div>
        <Link
          href="/admin/contacts/new"
          className="rounded-md bg-[var(--color-ink)] px-4 py-2 text-sm font-medium text-[var(--color-paper)] hover:opacity-80"
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
          name="circle"
          defaultValue={circle}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">All circles</option>
          {CIRCLES.map((c) => (
            <option key={c} value={c}>
              {CIRCLE_LABELS[c]}
            </option>
          ))}
        </select>
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

      {list.length === 0 ? (
        <div className="mt-8 rounded-lg border border-[var(--color-rule)] bg-white px-4 py-16 text-center text-sm text-[var(--color-ink-muted)] dark:border-zinc-800 dark:bg-zinc-900">
          {isFiltered ? (
            <>
              No matches.{" "}
              <Link
                href="/admin/contacts"
                className="text-brand-600 hover:underline"
              >
                Clear filters
              </Link>
              .
            </>
          ) : (
            <>
              No contacts yet.{" "}
              <Link
                href="/admin/contacts/new"
                className="text-brand-600 hover:underline"
              >
                Add the first one
              </Link>
              .
            </>
          )}
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {groups
            .filter((g) => g.rows.length > 0)
            .map((g) => (
              <section key={g.key}>
                <div className="flex items-baseline gap-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-ink)]">
                    {CIRCLE_LABELS[g.key]}
                  </h2>
                  <span className="text-xs text-[var(--color-ink-muted)]">
                    {CIRCLE_DESCRIPTIONS[g.key]} · {g.rows.length}
                  </span>
                </div>
                <div className="mt-3">
                  <ContactsTable rows={g.rows} />
                </div>
              </section>
            ))}
          {parked.length > 0 && (
            <section>
              <div className="flex items-baseline gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-ink)]">
                  Parked
                </h2>
                <span className="text-xs text-[var(--color-ink-muted)]">
                  From research, not yet in the pipeline. Engage one to move it in
                  · {parked.length}
                </span>
              </div>
              <div className="mt-3">
                <ContactsTable rows={parked} />
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
