import { Resend } from "resend";
import { env } from "@/lib/env";
import type { Agenda, AgendaItem, Founder } from "@/lib/agenda";
import { formatDate } from "@/lib/utils";

export const OWNER_EMAILS: Record<Founder, string> = {
  arif: "arif@stacksquare.ai",
  kerem: "kerem@stacksquare.ai",
};

const NAME: Record<Founder, string> = { arif: "Arif", kerem: "Kerem" };

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"]/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string,
  );
}

// Every founder-facing email flows through here. Mirrors the codebase's inline
// Resend pattern: no-op (not an error) when the key is absent, and a failed
// send is logged, never thrown, so it can never break the calling action.
async function send(
  to: string,
  subject: string,
  html: string,
): Promise<boolean> {
  const apiKey = env.resendKey();
  if (!apiKey) {
    console.warn("[notify] RESEND_API_KEY missing; not sending:", subject);
    return false;
  }
  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({ from: env.resendFrom(), to, subject, html });
    return true;
  } catch (err) {
    console.error("[notify] send failed:", subject, err);
    return false;
  }
}

const MUTED = "#8c897e";

// Real-time email when one founder puts a task on the other (or on "both").
export async function sendTaskAssignedEmail(opts: {
  to: Founder;
  assignedBy: Founder;
  title: string;
  due: string | null;
}): Promise<boolean> {
  const url = `${env.siteUrl()}/admin/tasks`;
  const when = opts.due ? ` · due ${formatDate(opts.due)}` : "";
  const html = `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;color:#1a1a1a">
    <p>${NAME[opts.assignedBy]} assigned you a task.</p>
    <p style="font-size:16px;font-weight:600;margin:12px 0">${escapeHtml(opts.title)}<span style="font-weight:400;color:${MUTED}">${when}</span></p>
    <p style="margin-top:16px"><a href="${url}" style="color:#5f43e6">Open your tasks</a></p>
  </div>`;
  return send(
    OWNER_EMAILS[opts.to],
    `New task from ${NAME[opts.assignedBy]} · StackSquare`,
    html,
  );
}

function itemLine(it: AgendaItem): string {
  const due = it.due ? formatDate(it.due) : "no date";
  const ctx = it.context
    ? ` <span style="color:${MUTED}">${escapeHtml(it.context)}</span>`
    : "";
  return `<li style="margin:5px 0">${escapeHtml(it.title)}${ctx} <span style="color:${MUTED}">· ${due}</span></li>`;
}

function digestSection(title: string, items: AgendaItem[]): string {
  if (items.length === 0) return "";
  return `<p style="margin:18px 0 6px;font-weight:600">${title} (${items.length})</p>
    <ul style="margin:0;padding-left:18px">${items.map(itemLine).join("")}</ul>`;
}

// The twice-daily summary. `slot` only changes the greeting; the caller decides
// whether the afternoon run is worth sending.
export async function sendDigestEmail(
  owner: Founder,
  agenda: Agenda,
  slot: "am" | "pm",
): Promise<boolean> {
  const url = `${env.siteUrl()}/admin`;
  const greeting =
    slot === "pm"
      ? `Afternoon check for ${NAME[owner]}.`
      : `Morning summary for ${NAME[owner]}.`;
  const body = [
    digestSection("Overdue", agenda.overdue),
    digestSection("Due today", agenda.today),
    digestSection("From conversations", agenda.fromConversations),
    digestSection("Going cold", agenda.goingCold),
    digestSection("Needs a deadline", agenda.noDeadline),
  ]
    .filter(Boolean)
    .join("");
  const soon =
    agenda.soon.length > 0
      ? `<p style="color:${MUTED};margin-top:14px">${agenda.soon.length} more coming up this week.</p>`
      : "";
  const unmatched =
    agenda.unmatchedThreads > 0
      ? `<p style="color:${MUTED};margin-top:6px">${agenda.unmatchedThreads} unmatched conversations to triage.</p>`
      : "";
  const html = `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;color:#1a1a1a">
    <p>${greeting}</p>
    ${body}${soon}${unmatched}
    <p style="margin-top:18px"><a href="${url}" style="color:#5f43e6">Open the dashboard</a></p>
  </div>`;
  const due = agenda.overdue.length + agenda.today.length;
  const subject = `${due} due · ${agenda.noDeadline.length} to schedule · StackSquare`;
  return send(OWNER_EMAILS[owner], subject, html);
}
