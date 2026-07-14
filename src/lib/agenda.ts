import {
  and,
  eq,
  isNotNull,
  isNull,
  ne,
  or,
  lt,
  gte,
  asc,
  desc,
  inArray,
  sql,
} from "drizzle-orm";
import { db, tasks, contacts, eventTasks, events, outreachThreads } from "@/db";

// The two founders. "both" (shared) and null (unassigned) also occur on rows.
export type Founder = "arif" | "kerem";
type OwnerVal = "arif" | "kerem" | "both" | null;
type PriorityVal = "p1" | "p2" | "p3" | null;

// One time-sensitive thing to do, drawn from any surface. This is the single
// currency the "Today" dashboard pane and the email digest both speak, so
// nothing hides on a page nobody opened.
export type AgendaItem = {
  id: string;
  kind: "task" | "contact" | "event" | "conversation";
  title: string;
  context: string | null;
  owner: OwnerVal;
  due: string | null; // YYYY-MM-DD, or null for "needs a deadline"
  priority: PriorityVal;
  href: string;
};

export type Agenda = {
  overdue: AgendaItem[];
  today: AgendaItem[];
  soon: AgendaItem[]; // due within the next 7 days
  noDeadline: AgendaItem[]; // open tasks with no due date
  // Outreach-timeline signals. These have no due date, so they get their own
  // buckets instead of the calendar ones.
  fromConversations: AgendaItem[]; // AI next-steps from DMs/Gmail (last 24h)
  goingCold: AgendaItem[]; // reached-out/replying, no due, no touch in 5 days
  unmatchedThreads: number; // captured conversations awaiting a contact link
};

function ownerAllowed(owner: OwnerVal, filter?: Founder): boolean {
  // No filter (dashboard) shows everything. A per-founder digest includes that
  // founder's items, shared "both" items, and unassigned items so nothing slips.
  if (!filter) return true;
  return owner === filter || owner === "both" || owner === null;
}

const byDueThenPriority = (a: AgendaItem, b: AgendaItem): number =>
  (a.due ?? "9999-99-99").localeCompare(b.due ?? "9999-99-99") ||
  (a.priority ?? "p2").localeCompare(b.priority ?? "p2");

// Aggregate everything time-sensitive: open general tasks, contact next-actions
// (same "due" definition the pipeline uses), and undone event checklist tasks.
// Dates are compared as UTC-day strings, matching the dashboard's existing
// getCounts() so the two never disagree.
export async function getAgenda(filter?: Founder): Promise<Agenda> {
  const today = new Date().toISOString().slice(0, 10);
  const in7 = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);

  const items: AgendaItem[] = [];

  const taskRows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      owner: tasks.owner,
      due: tasks.dueDate,
      priority: tasks.priority,
    })
    .from(tasks)
    .where(eq(tasks.status, "open"));
  for (const t of taskRows) {
    items.push({
      id: t.id,
      kind: "task",
      title: t.title,
      context: null,
      owner: t.owner,
      due: t.due,
      priority: t.priority,
      href: "/admin/tasks",
    });
  }

  const contactRows = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      company: contacts.company,
      owner: contacts.owner,
      nextAction: contacts.nextAction,
      due: contacts.nextActionDue,
      priority: contacts.priority,
    })
    .from(contacts)
    .where(
      and(
        eq(contacts.parked, false),
        isNotNull(contacts.nextActionDue),
        ne(contacts.stage, "long_term"),
        ne(contacts.stage, "dormant"),
      ),
    );
  for (const c of contactRows) {
    items.push({
      id: c.id,
      kind: "contact",
      title: c.nextAction || "Follow up",
      context: c.company ? `${c.name} · ${c.company}` : c.name,
      owner: c.owner,
      due: c.due,
      priority: c.priority,
      href: `/admin/contacts/${c.id}`,
    });
  }

  const eventTaskRows = await db
    .select({
      id: eventTasks.id,
      title: eventTasks.title,
      owner: eventTasks.owner,
      due: eventTasks.dueDate,
      eventId: eventTasks.eventId,
      eventTitle: events.title,
    })
    .from(eventTasks)
    .innerJoin(events, eq(eventTasks.eventId, events.id))
    .where(and(eq(eventTasks.done, false), isNotNull(eventTasks.dueDate)));
  for (const e of eventTaskRows) {
    items.push({
      id: e.id,
      kind: "event",
      title: e.title,
      context: e.eventTitle,
      owner: e.owner,
      due: e.due,
      priority: null,
      href: `/admin/events/${e.eventId}`,
    });
  }

  // Fresh AI next-steps the outreach summarizer pulled from DMs / Gmail in the
  // last 24h. The payoff of the outreach timeline feeding the daily plan.
  const since = new Date(Date.now() - 24 * 3_600_000);
  const convItems: AgendaItem[] = (
    await db
      .select({
        id: outreachThreads.id,
        contactId: outreachThreads.contactId,
        name: contacts.name,
        owner: outreachThreads.owner,
        nextSteps: outreachThreads.nextSteps,
      })
      .from(outreachThreads)
      .leftJoin(contacts, eq(outreachThreads.contactId, contacts.id))
      .where(
        and(
          isNotNull(outreachThreads.nextSteps),
          gte(outreachThreads.updatedAt, since),
        ),
      )
      .orderBy(desc(outreachThreads.updatedAt))
      .limit(25)
  ).map((r) => ({
    id: r.id,
    kind: "conversation" as const,
    title: r.nextSteps ?? "Follow up",
    context: r.name,
    owner: r.owner,
    due: null,
    priority: null,
    href: r.contactId ? `/admin/contacts/${r.contactId}` : "/admin/outreach",
  }));

  // Reached-out / replying with no scheduled next action and no touch in 5 days:
  // exactly the in-flight relationships the due-date buckets never surface.
  const staleCutoff = new Date(Date.now() - 5 * 86_400_000);
  const coldItems: AgendaItem[] = (
    await db
      .select({
        id: contacts.id,
        name: contacts.name,
        company: contacts.company,
        owner: contacts.owner,
        priority: contacts.priority,
      })
      .from(contacts)
      .where(
        and(
          eq(contacts.parked, false),
          inArray(contacts.stage, ["reached_out", "replying"]),
          isNull(contacts.nextActionDue),
          or(
            isNull(contacts.lastTouchAt),
            lt(contacts.lastTouchAt, staleCutoff),
          ),
        ),
      )
      .orderBy(asc(contacts.lastTouchAt))
      .limit(25)
  ).map((c) => ({
    id: c.id,
    kind: "contact" as const,
    title: "Going cold, no reply",
    context: c.company ? `${c.name} · ${c.company}` : c.name,
    owner: c.owner,
    due: null,
    priority: c.priority,
    href: `/admin/contacts/${c.id}`,
  }));

  // Captured conversations we could not match to a contact (a nudge, not a list).
  const unmatchedWhere = filter
    ? and(
        isNull(outreachThreads.contactId),
        inArray(outreachThreads.owner, [filter, "both"]),
      )
    : isNull(outreachThreads.contactId);
  const [unmatchedRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(outreachThreads)
    .where(unmatchedWhere);
  const unmatchedThreads = unmatchedRow?.count ?? 0;

  const agenda: Agenda = {
    overdue: [],
    today: [],
    soon: [],
    noDeadline: [],
    fromConversations: convItems.filter((it) => ownerAllowed(it.owner, filter)),
    goingCold: coldItems.filter((it) => ownerAllowed(it.owner, filter)),
    unmatchedThreads,
  };
  for (const it of items) {
    if (!ownerAllowed(it.owner, filter)) continue;
    if (it.due === null) {
      if (it.kind === "task") agenda.noDeadline.push(it);
      continue;
    }
    if (it.due < today) agenda.overdue.push(it);
    else if (it.due === today) agenda.today.push(it);
    else if (it.due <= in7) agenda.soon.push(it);
    // Beyond 7 days out is not urgent enough for the agenda.
  }
  agenda.overdue.sort(byDueThenPriority);
  agenda.today.sort(byDueThenPriority);
  agenda.soon.sort(byDueThenPriority);
  return agenda;
}
