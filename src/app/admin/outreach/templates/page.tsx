import { db, outreachTemplates } from "@/db";
import { desc } from "drizzle-orm";
import { TemplateEditor } from "./client";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const list = await db
    .select()
    .from(outreachTemplates)
    .orderBy(desc(outreachTemplates.updatedAt));

  return (
    <div className="px-8 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">
        Outreach templates
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Reusable scripts. Use{" "}
        <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-zinc-800">
          {"{name}"}
        </code>
        ,{" "}
        <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-zinc-800">
          {"{firstName}"}
        </code>
        ,{" "}
        <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-zinc-800">
          {"{company}"}
        </code>
        ,{" "}
        <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-zinc-800">
          {"{role}"}
        </code>{" "}
        as variables.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-500">
            New template
          </h2>
          <TemplateEditor />
        </section>

        <section>
          <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-500">
            Existing ({list.length})
          </h2>
          {list.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">
              No templates yet. Start with a warm DM template that is short, ends
              with a Calendly link and 2 proposed slots.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {list.map((t) => (
                <li
                  key={t.id}
                  className="rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{t.name}</h3>
                    <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
                      {t.channel.replace("_", " ")}
                    </span>
                  </div>
                  {t.subject && (
                    <p className="mt-2 text-xs text-zinc-500">
                      Subject: {t.subject}
                    </p>
                  )}
                  <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap rounded bg-zinc-50 p-2 text-xs dark:bg-zinc-950">
                    {t.body}
                  </pre>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
