import { and, eq, isNotNull, ne } from "drizzle-orm";
import { db, tasks, contacts, eventTasks, events } from "@/db";

// The two founders. "both" (shared) and null (unassigned) also occur on rows.
export type Founder = "arif" | "kerem";
type OwnerVal = "arif" | "kerem" | "both" | null;
type PriorityVal = "p1" | "p2" | "p3" | null;

// One time-sensitive thing to do, drawn from any surface. This is the single
// currency the "Today" dashboard pane and the email digest both speak, so
// nothing hides on a page nobody opened.
export type AgendaItem = {
  id: string;
  kind: "task" | "contact" | "event";
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

  const agenda: Agenda = { overdue: [], today: [], soon: [], noDeadline: [] };
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
