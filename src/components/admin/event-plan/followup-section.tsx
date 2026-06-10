"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { followUpBatch } from "@/lib/actions/event-plan";

const CHANNELS = [
  "linkedin_dm",
  "email",
  "whatsapp",
  "intro_ask",
  "in_person",
  "call",
  "other",
] as const;

const CHANNEL_LABELS: Record<(typeof CHANNELS)[number], string> = {
  linkedin_dm: "LinkedIn DM",
  email: "Email",
  whatsapp: "WhatsApp",
  intro_ask: "Intro ask",
  in_person: "In person",
  call: "Call",
  other: "Other",
};

const OWNERS = ["arif", "kerem", "both"] as const;

export type AttendeeRow = {
  targetId: string;
  name: string;
  hasEmail: boolean;
  followedUp: boolean;
};

export type TemplateOption = {
  id: string;
  name: string;
  channel: (typeof CHANNELS)[number];
  subject: string | null;
  body: string;
};

export function FollowUpSection({
  eventId,
  attendees,
  templates,
}: {
  eventId: string;
  attendees: AttendeeRow[];
  templates: TemplateOption[];
}) {
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(attendees.filter((a) => !a.followedUp).map((a) => a.targetId)),
  );
  const [templateId, setTemplateId] = useState("");
  const [channel, setChannel] = useState<(typeof CHANNELS)[number]>("email");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [owner, setOwner] = useState("");
  const [alsoSendEmail, setAlsoSendEmail] = useState(false);

  const noEmailSelected = useMemo(
    () =>
      attendees.filter((a) => selected.has(a.targetId) && !a.hasEmail).length,
    [attendees, selected],
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onTemplate(id: string) {
    setTemplateId(id);
    const t = templates.find((x) => x.id === id);
    if (t) {
      setChannel(t.channel);
      setSubject(t.subject ?? "");
      setBody(t.body);
    }
  }

  function onSend() {
    if (selected.size === 0) {
      toast.error("Select at least one attendee");
      return;
    }
    if (!body.trim()) {
      toast.error("Write or pick a message");
      return;
    }
    start(async () => {
      try {
        const res = await followUpBatch(eventId, {
          targetIds: [...selected],
          templateId: templateId || null,
          channel,
          subject: subject || null,
          body,
          owner: (owner || null) as "arif" | "kerem" | "both" | null,
          alsoSendEmail,
        });
        toast.success(
          `Logged ${res.logged} follow-up${res.logged === 1 ? "" : "s"}` +
            (res.emailed ? `, emailed ${res.emailed}` : ""),
        );
        setSelected(new Set());
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Follow-up failed");
      }
    });
  }

  if (attendees.length === 0) {
    return (
      <section id="followup" className="scroll-mt-20">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-500">
          Follow-up outreach
        </h2>
        <p className="mt-3 text-xs text-zinc-400">
          Mark targets as Attended after the event, then batch follow-ups
          appear here.
        </p>
      </section>
    );
  }

  return (
    <section id="followup" className="scroll-mt-20">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-500">
        Follow-up outreach
      </h2>
      <div className="mt-3 grid gap-4 lg:grid-cols-[260px_1fr]">
        <div className="rounded-lg border border-[var(--color-rule)] bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="px-2 py-1 text-[10px] uppercase tracking-wide text-zinc-400">
            Attendees ({selected.size} selected)
          </p>
          {attendees.map((a) => (
            <label
              key={a.targetId}
              className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <input
                type="checkbox"
                checked={selected.has(a.targetId)}
                onChange={() => toggle(a.targetId)}
                className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
              />
              <span className="min-w-0 flex-1 truncate">{a.name}</span>
              {a.followedUp && (
                <span className="shrink-0 text-[9px] font-medium uppercase text-green-600">
                  done
                </span>
              )}
              {!a.hasEmail && (
                <span className="shrink-0 text-[9px] uppercase text-zinc-400">
                  no email
                </span>
              )}
            </label>
          ))}
        </div>

        <div className="space-y-3 rounded-lg border border-[var(--color-rule)] bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-wrap gap-2">
            <select
              value={templateId}
              onChange={(e) => onTemplate(e.target.value)}
              className="rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            >
              <option value="">No template</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <select
              value={channel}
              onChange={(e) =>
                setChannel(e.target.value as (typeof CHANNELS)[number])
              }
              className="rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            >
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {CHANNEL_LABELS[c]}
                </option>
              ))}
            </select>
            <select
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className="rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            >
              <option value="">Sent by</option>
              {OWNERS.map((o) => (
                <option key={o} value={o}>
                  {o[0].toUpperCase() + o.slice(1)}
                </option>
              ))}
            </select>
          </div>
          {channel === "email" && (
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
          )}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            placeholder={
              "Thanks for coming, {firstName}. Variables: {name} {firstName} {company} {event} {eventDate}"
            }
            className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
          <p className="text-[11px] text-zinc-400">
            Variables fill per person when logged: {"{name}"} {"{firstName}"}{" "}
            {"{role}"} {"{company}"} {"{city}"} {"{event}"} {"{eventDate}"}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={alsoSendEmail}
                onChange={(e) => setAlsoSendEmail(e.target.checked)}
                disabled={channel !== "email"}
                className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
              />
              Also send email via Resend
            </label>
            {alsoSendEmail && noEmailSelected > 0 && (
              <span className="text-xs text-amber-600">
                {noEmailSelected} selected without an email address (logged
                only)
              </span>
            )}
            <button
              type="button"
              onClick={onSend}
              disabled={pending || selected.size === 0}
              className="ml-auto rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {pending
                ? "Working…"
                : alsoSendEmail
                  ? `Log + email ${selected.size}`
                  : `Log ${selected.size} follow-up${selected.size === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
