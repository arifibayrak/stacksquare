import { db, quadrantMessages } from "@/db";
import { desc } from "drizzle-orm";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Contact requests sent through thequadrant.fm's contact form.
export default async function QuadrantMessagesPage() {
  const messages = await db
    .select()
    .from(quadrantMessages)
    .orderBy(desc(quadrantMessages.createdAt));

  return (
    <div className="px-8 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">
        The Quadrant · Messages
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Contact requests from thequadrant.fm. {messages.length} total. Reply
        from arif@thequadrant.fm or kerem@thequadrant.fm.
      </p>

      {messages.length === 0 ? (
        <p className="mt-10 rounded-md border border-zinc-200 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
          No messages yet.
        </p>
      ) : (
        <ul className="mt-8 space-y-3">
          {messages.map((m) => (
            <li
              key={m.id}
              className="rounded-md border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <span className="font-medium">{m.name}</span>{" "}
                  <a
                    href={`mailto:${m.email}`}
                    className="text-sm text-zinc-500 underline-offset-2 hover:underline"
                  >
                    {m.email}
                  </a>
                </div>
                <span className="shrink-0 text-xs text-zinc-500">
                  {formatDate(m.createdAt)}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {m.message}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
