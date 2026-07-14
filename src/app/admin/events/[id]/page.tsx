import { notFound } from "next/navigation";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import {
  db,
  contacts,
  events,
  eventCosts,
  eventSpeakers,
  eventTargets,
  eventTasks,
  eventAttendees,
  outreachTemplates,
  venues,
  EVENT_STATUS_LABELS,
} from "@/db";
import { EventForm } from "@/components/admin/event-form";
import { CostsSection } from "@/components/admin/event-plan/costs-section";
import { SpeakersSection } from "@/components/admin/event-plan/speakers-section";
import { TargetsSection } from "@/components/admin/event-plan/targets-section";
import { TasksSection } from "@/components/admin/event-plan/tasks-section";
import { AttendeesSection } from "@/components/admin/event-plan/attendees-section";
import { FollowUpSection } from "@/components/admin/event-plan/followup-section";
import { DeleteEventButton } from "./client";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "#details", label: "Details" },
  { href: "#venue", label: "Venue" },
  { href: "#costs", label: "Costs" },
  { href: "#speakers", label: "Speakers" },
  { href: "#targets", label: "Targets" },
  { href: "#tasks", label: "Tasks" },
  { href: "#attendees", label: "Attendees" },
  { href: "#followup", label: "Follow-up" },
];

export default async function EventDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, id))
    .limit(1);
  if (!event) notFound();

  const [
    venueList,
    contactOptions,
    costs,
    speakerRows,
    targetRows,
    taskRows,
    templates,
    attendeeRows,
  ] = await Promise.all([
    db
      .select({ id: venues.id, name: venues.name, capacity: venues.capacity })
      .from(venues)
      .orderBy(asc(venues.name)),
    db
      .select({
        id: contacts.id,
        name: contacts.name,
        company: contacts.company,
      })
      .from(contacts)
      .orderBy(asc(contacts.name)),
    db
      .select()
      .from(eventCosts)
      .where(eq(eventCosts.eventId, id))
      .orderBy(asc(eventCosts.createdAt)),
    db
      .select({
        id: eventSpeakers.id,
        contactId: eventSpeakers.contactId,
        name: contacts.name,
        company: contacts.company,
        role: eventSpeakers.role,
        status: eventSpeakers.status,
      })
      .from(eventSpeakers)
      .innerJoin(contacts, eq(eventSpeakers.contactId, contacts.id))
      .where(eq(eventSpeakers.eventId, id))
      .orderBy(asc(eventSpeakers.createdAt)),
    db
      .select({
        id: eventTargets.id,
        contactId: eventTargets.contactId,
        name: contacts.name,
        company: contacts.company,
        email: contacts.email,
        status: eventTargets.status,
        followedUpAt: eventTargets.followedUpAt,
      })
      .from(eventTargets)
      .innerJoin(contacts, eq(eventTargets.contactId, contacts.id))
      .where(eq(eventTargets.eventId, id))
      .orderBy(asc(contacts.name)),
    db
      .select()
      .from(eventTasks)
      .where(eq(eventTasks.eventId, id))
      .orderBy(asc(eventTasks.sortOrder), asc(eventTasks.createdAt)),
    db
      .select({
        id: outreachTemplates.id,
        name: outreachTemplates.name,
        channel: outreachTemplates.channel,
        subject: outreachTemplates.subject,
        body: outreachTemplates.body,
      })
      .from(outreachTemplates)
      .orderBy(asc(outreachTemplates.name)),
    db
      .select({
        id: eventAttendees.id,
        name: eventAttendees.name,
        email: eventAttendees.email,
        phone: eventAttendees.phone,
        status: eventAttendees.status,
        followUp: eventAttendees.followUp,
        contactId: eventAttendees.contactId,
      })
      .from(eventAttendees)
      .where(eq(eventAttendees.eventId, id))
      .orderBy(asc(eventAttendees.name)),
  ]);

  const linkedVenue = event.venueId
    ? await db
        .select()
        .from(venues)
        .where(eq(venues.id, event.venueId))
        .limit(1)
        .then((r) => r[0])
    : undefined;

  const targets = targetRows.map((t) => ({
    id: t.id,
    contactId: t.contactId,
    name: t.name,
    company: t.company,
    status: t.status,
    followedUp: !!t.followedUpAt,
  }));

  const attendees = targetRows
    .filter((t) => t.status === "attended")
    .map((t) => ({
      targetId: t.id,
      name: t.name,
      hasEmail: !!t.email,
      followedUp: !!t.followedUpAt,
    }));

  const overCapacity =
    linkedVenue?.capacity &&
    event.targetHeadcount &&
    event.targetHeadcount > linkedVenue.capacity;

  return (
    <div className="px-8 py-10">
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/admin/events"
            className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            ← Events
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            {event.title}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">
              {EVENT_STATUS_LABELS[event.status]}
            </span>
            {event.lumaUrl ? (
              <>
                {" "}
                ·{" "}
                <a
                  href={event.lumaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  Luma page ↗
                </a>
              </>
            ) : null}
          </p>
        </div>
        <DeleteEventButton id={event.id} />
      </div>

      <nav className="sticky top-0 z-20 -mx-8 mt-6 border-b border-[var(--color-rule)] bg-[var(--color-paper)]/95 px-8 py-2 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="flex flex-wrap gap-1">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="rounded-md px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
            >
              {n.label}
            </a>
          ))}
        </div>
      </nav>

      <div id="details" className="mt-10 max-w-4xl scroll-mt-20">
        <EventForm event={event} venues={venueList} />
      </div>

      {linkedVenue && (
        <div className="mt-6 max-w-4xl rounded-lg border border-[var(--color-rule)] bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Link
              href={`/admin/venues/${linkedVenue.id}`}
              className="font-medium hover:text-brand-600"
            >
              {linkedVenue.name} ↗
            </Link>
            {linkedVenue.area && (
              <span className="text-zinc-500">{linkedVenue.area}</span>
            )}
            {linkedVenue.capacity && (
              <span className="text-zinc-500">
                capacity {linkedVenue.capacity}
              </span>
            )}
            {linkedVenue.typicalCost && (
              <span className="text-zinc-500">{linkedVenue.typicalCost}</span>
            )}
            {overCapacity ? (
              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                Target headcount {event.targetHeadcount} exceeds capacity
              </span>
            ) : null}
          </div>
        </div>
      )}

      <div className="mt-12 max-w-4xl space-y-12 pb-24">
        <CostsSection
          eventId={event.id}
          costs={costs}
          targetHeadcount={event.targetHeadcount}
        />
        <SpeakersSection
          eventId={event.id}
          speakers={speakerRows}
          contacts={contactOptions}
        />
        <TargetsSection
          eventId={event.id}
          targets={targets}
          contacts={contactOptions}
        />
        <TasksSection eventId={event.id} tasks={taskRows} />
        <AttendeesSection eventId={event.id} attendees={attendeeRows} />
        <FollowUpSection
          eventId={event.id}
          attendees={attendees}
          templates={templates}
        />
      </div>
    </div>
  );
}
