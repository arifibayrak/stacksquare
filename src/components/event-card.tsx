import { type EventItem } from "@/db/schema";
import { formatDate } from "@/lib/utils";

export function EventCard({
  event,
  variant,
}: {
  event: EventItem;
  variant: "upcoming" | "past";
}) {
  return (
    <article className="flex flex-col border-t border-[var(--color-rule)] pt-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-[var(--color-ink-muted)]">
        {event.startAt ? (
          <span className="tabular-nums">{formatDate(event.startAt)}</span>
        ) : (
          <span>Date to be announced</span>
        )}
        {event.location ? (
          <>
            <span aria-hidden>·</span>
            <span>{event.location}</span>
          </>
        ) : null}
        {event.featured ? (
          <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-brand-700">
            Featured
          </span>
        ) : null}
      </div>

      <h3 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-3xl">
        {event.title}
      </h3>

      {event.summary ? (
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--color-ink-soft)]">
          {event.summary}
        </p>
      ) : null}

      {event.lumaUrl ? (
        <a
          href={event.lumaUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex w-fit items-center text-base text-[var(--color-brand-600)] underline decoration-[var(--color-rule)] underline-offset-4 transition-colors hover:decoration-[var(--color-brand-600)]"
        >
          {variant === "upcoming" ? "Register on Luma ↗" : "View on Luma ↗"}
        </a>
      ) : null}
    </article>
  );
}
