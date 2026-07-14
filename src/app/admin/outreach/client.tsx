"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  logAndMaybeSendOutreach,
  renderTemplate,
} from "@/lib/actions/outreach";
import {
  linkThreadToContact,
  dismissThread,
} from "@/lib/actions/outreach-threads";

type ContactLite = {
  id: string;
  name: string;
  email: string | null;
  stage: string;
};

type TemplateLite = {
  id: string;
  name: string;
  channel: string;
};

type GmailAccountLite = {
  owner: string;
  email: string;
  lastSyncAt: string | null;
  status: string;
};

export function GmailCard({ accounts }: { accounts: GmailAccountLite[] }) {
  const [pending, start] = useTransition();
  const byOwner = (o: string) => accounts.find((a) => a.owner === o);

  function syncNow() {
    start(async () => {
      try {
        const res = await fetch("/api/gmail/sync", { method: "POST" });
        if (!res.ok) throw new Error();
        const data = await res.json();
        const logged = (data.results ?? []).reduce(
          (n: number, r: { logged?: number }) => n + (r.logged ?? 0),
          0,
        );
        toast.success(`Gmail sync done. ${logged} logged.`);
      } catch {
        toast.error("Sync failed");
      }
    });
  }

  return (
    <div className="rounded-md border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Gmail</h3>
        <button
          type="button"
          onClick={syncNow}
          disabled={pending}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {pending ? "Syncing…" : "Sync now"}
        </button>
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        Official Gmail API, read-only. Threads with known contacts are
        summarized daily onto their timelines. Bodies are never stored.
      </p>
      <ul className="mt-3 space-y-2">
        {(["arif", "kerem"] as const).map((o) => {
          const a = byOwner(o);
          return (
            <li
              key={o}
              className="flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-2 dark:border-zinc-800"
            >
              <span className="font-medium">
                {o === "arif" ? "Arif" : "Kerem"}
              </span>
              {a ? (
                <span className="text-xs text-zinc-500">
                  {a.email} · {a.status}
                  {a.lastSyncAt ? ` · synced ${a.lastSyncAt}` : " · never synced"}
                </span>
              ) : (
                <span className="text-xs text-zinc-500">not connected</span>
              )}
              <a
                href={`/api/gmail/connect?owner=${o}`}
                className="ml-auto rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                {a ? "Reconnect" : "Connect"}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type ContactOpt = { id: string; name: string; company: string | null };

type UnmatchedThread = {
  id: string;
  sourceLabel: string;
  counterpartName: string | null;
  counterpartLinkedin: string | null;
  summary: string | null;
  when: string;
};

export function UnmatchedThreads({
  threads,
  contacts,
}: {
  threads: UnmatchedThread[];
  contacts: ContactOpt[];
}) {
  if (threads.length === 0) {
    return (
      <p className="mt-4 text-sm text-zinc-500">
        No unmatched conversations. Threads that match a contact go straight to
        their timeline.
      </p>
    );
  }
  return (
    <ul className="mt-4 space-y-3">
      {threads.map((t) => (
        <UnmatchedRow key={t.id} thread={t} contacts={contacts} />
      ))}
    </ul>
  );
}

function UnmatchedRow({
  thread,
  contacts,
}: {
  thread: UnmatchedThread;
  contacts: ContactOpt[];
}) {
  const [pending, start] = useTransition();
  const [contactId, setContactId] = useState("");

  function onLink() {
    if (!contactId) {
      toast.error("Pick a contact first");
      return;
    }
    start(async () => {
      try {
        await linkThreadToContact(thread.id, contactId);
        toast.success("Linked to contact");
      } catch {
        toast.error("Link failed");
      }
    });
  }

  function onDismiss() {
    start(async () => {
      try {
        await dismissThread(thread.id);
        toast.success("Dismissed");
      } catch {
        toast.error("Dismiss failed");
      }
    });
  }

  return (
    <li className="rounded-md border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs text-zinc-500">
        {thread.when} · {thread.sourceLabel}
      </p>
      <p className="mt-1 font-medium">
        {thread.counterpartName ?? "Unknown"}
        {thread.counterpartLinkedin && (
          <a
            href={thread.counterpartLinkedin}
            target="_blank"
            rel="noreferrer"
            className="ml-2 text-xs font-normal text-brand-600 hover:underline"
          >
            profile
          </a>
        )}
      </p>
      {thread.summary && <p className="mt-1">{thread.summary}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={contactId}
          onChange={(e) => setContactId(e.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">Link to contact…</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.company ? ` (${c.company})` : ""}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onLink}
          disabled={pending}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Link
        </button>
        <button
          type="button"
          onClick={onDismiss}
          disabled={pending}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Dismiss
        </button>
      </div>
    </li>
  );
}

export function OutreachComposer({
  contacts,
  templates,
}: {
  contacts: ContactLite[];
  templates: TemplateLite[];
}) {
  const [pending, start] = useTransition();
  const [contactId, setContactId] = useState(contacts[0]?.id ?? "");
  const [templateId, setTemplateId] = useState("");
  const [channel, setChannel] = useState("linkedin_dm");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function onApplyTemplate() {
    if (!templateId || !contactId) return;
    const r = await renderTemplate(templateId, contactId);
    setSubject(r.subject ?? "");
    setBody(r.body);
    const tpl = templates.find((t) => t.id === templateId);
    if (tpl) setChannel(tpl.channel);
  }

  function onSubmit(fd: FormData) {
    setStatus(null);
    start(async () => {
      try {
        await logAndMaybeSendOutreach(fd);
        setStatus("Sent and logged.");
        setBody("");
        setSubject("");
      } catch (err) {
        setStatus(
          "Error: " + (err instanceof Error ? err.message : "unknown"),
        );
      }
    });
  }

  if (contacts.length === 0) {
    return (
      <p className="rounded-md border border-zinc-200 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
        No contacts in researched / reached out / replying stages. Add
        contacts and move them along the pipeline.
      </p>
    );
  }

  return (
    <form
      action={onSubmit}
      className="space-y-4 rounded-md border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Contact
          </label>
          <select
            name="contactId"
            required
            value={contactId}
            onChange={(e) => setContactId(e.target.value)}
            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.stage})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Template
          </label>
          <div className="mt-1 flex gap-2">
            <select
              name="templateId"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="">none</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onApplyTemplate}
              className="rounded-md border border-zinc-300 px-2 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Apply
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Channel
          </label>
          <select
            name="channel"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="linkedin_dm">LinkedIn DM</option>
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="intro_ask">Intro ask</option>
          </select>
        </div>
      </div>

      {channel === "email" && (
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Subject
          </label>
          <input
            name="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
      )}

      <div>
        <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
          Body *
        </label>
        <textarea
          name="body"
          required
          rows={10}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-mono dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Owner
        </label>
        <select
          name="owner"
          defaultValue="arif"
          className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="arif">Arif</option>
          <option value="kerem">Kerem</option>
          <option value="both">Both</option>
        </select>

        {channel === "email" && (
          <label className="ml-auto flex items-center gap-2 text-sm">
            <input type="checkbox" name="alsoSendEmail" /> Also send via Resend
          </label>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">
          Stage advances to <em>Reached out</em> automatically.
        </p>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {pending ? "Logging…" : "Log outreach"}
        </button>
      </div>

      {status && (
        <p
          className={
            "text-sm " + (status.startsWith("Error") ? "text-red-600" : "text-green-600")
          }
        >
          {status}
        </p>
      )}
    </form>
  );
}
