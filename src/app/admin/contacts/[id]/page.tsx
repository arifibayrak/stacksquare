import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import { db, contacts, touchLog } from "@/db";
import { ContactForm } from "@/components/admin/contact-form";
import {
  TouchLogForm,
  DeleteContactButton,
  ContactQuickActions,
} from "./client";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ContactDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [contact] = await db
    .select()
    .from(contacts)
    .where(eq(contacts.id, id))
    .limit(1);
  if (!contact) notFound();

  const log = await db
    .select()
    .from(touchLog)
    .where(eq(touchLog.contactId, id))
    .orderBy(desc(touchLog.happenedAt))
    .limit(50);

  return (
    <div className="px-8 py-10">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/admin/contacts"
            className="text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
          >
            ← Contacts
          </Link>
          <h1 className="mt-2 truncate text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
            {contact.name}
          </h1>
          {(contact.role || contact.company) && (
            <p className="mt-1 truncate text-sm text-[var(--color-ink-muted)]">
              {[contact.role, contact.company].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <DeleteContactButton id={contact.id} />
      </div>

      <div className="mt-4">
        <ContactQuickActions
          id={contact.id}
          stage={contact.stage}
          priority={contact.priority}
          owner={contact.owner}
          circle={contact.circle}
        />
      </div>

      <div className="mt-10 grid gap-12 lg:grid-cols-[2fr_1fr]">
        <section>
          <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-500">
            Details
          </h2>
          <div className="mt-4">
            <ContactForm contact={contact} />
          </div>
        </section>

        <aside className="space-y-6">
          <section>
            <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-500">
              Log a touch
            </h2>
            <div className="mt-4">
              <TouchLogForm contactId={contact.id} />
            </div>
          </section>

          <section>
            <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-500">
              Touch history
            </h2>
            {log.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500">No touches yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {log.map((t) => (
                  <li
                    key={t.id}
                    className="rounded-md border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <p className="text-xs text-zinc-500">
                      {formatDate(t.happenedAt)} · {t.channel.replace("_", " ")}
                      {t.owner ? ` · ${t.owner}` : ""}
                    </p>
                    <p className="mt-1">{t.summary}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
