import Image from "next/image";
import { type EventItem } from "@/db/schema";
import { formatDate } from "@/lib/utils";

export function EventCard({
  event,
  variant,
  index,
}: {
  event: EventItem;
  variant: "upcoming" | "past";
  index?: number;
}) {
  return (
    <article className="group grid gap-4 border-t border-[var(--color-rule)] pt-6 transition-colors duration-300 hover:border-[var(--color-ink)] sm:grid-cols-[9rem_1fr] sm:gap-8">
      <div className="font-mono text-xs text-[var(--color-ink-muted)]">
        {typeof index === "number" && (
          <p className="tabular-nums text-[var(--color-rule)] transition-colors duration-300 group-hover:text-[var(--color-brand-500)]">
            0{index + 1}
          </p>
        )}
        <p className={typeof index === "number" ? "mt-3" : ""}>
          {event.startAt ? (
            <span className="tabular-nums">{formatDate(event.startAt)}</span>
          ) : (
            <span>Date to be announced</span>
          )}
        </p>
        {event.location ? <p className="mt-1">{event.location}</p> : null}
        {event.featured ? (
          <p className="mt-3">
            <span className="rounded bg-[var(--color-brand-50)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--color-brand-700)]">
              Featured
            </span>
          </p>
        ) : null}
      </div>

      <div>
        {event.gallery && event.gallery.length > 0 ? (
          // All event photos in a continuously scrolling reel (content is
          // rendered twice for a seamless loop). Pauses on hover.
          <div className="marquee photo-reel mb-7 py-2">
            <div
              className="marquee-track"
              style={{ animationDuration: `${event.gallery.length * 7}s` }}
            >
              {[false, true].map((clone) => (
                <div
                  key={clone ? "clone" : "reel"}
                  aria-hidden={clone}
                  className="flex shrink-0 gap-5 pr-5"
                >
                  {event.gallery!.map((src, i) => (
                    <div
                      key={src}
                      className={`relative shrink-0 overflow-hidden rounded-[4px] border border-[var(--color-rule)] bg-[var(--color-paper-soft)] shadow-[0_24px_48px_-20px_rgba(0,0,0,0.8)] transition-transform duration-500 hover:scale-[1.03] ${
                        i === 0
                          ? "aspect-[4/3] h-56 sm:h-64"
                          : "aspect-[3/4] h-56 sm:h-64"
                      }`}
                    >
                      <Image
                        src={src}
                        alt={clone ? "" : `${event.title} photo ${i + 1}`}
                        fill
                        quality={85}
                        sizes="(min-width: 640px) 360px, 300px"
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : event.coverImage ? (
          <div className="relative mb-6 aspect-[16/9] overflow-hidden rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper-soft)]">
            <Image
              src={event.coverImage}
              alt={event.title}
              fill
              sizes="(min-width: 1024px) 760px, 92vw"
              className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
          </div>
        ) : null}
        <h3 className="font-display text-2xl font-medium leading-snug text-[var(--color-ink)] sm:text-3xl">
          {event.title}
        </h3>

        {event.summary ? (
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--color-ink-soft)]">
            {event.summary}
          </p>
        ) : null}

        {variant === "upcoming" && event.lumaEventId ? (
          // Luma checkout button: opens the in-page register popup once
          // checkout-button.js has loaded; falls back to the event page on click.
          <a
            href={event.lumaUrl ?? `https://luma.com/event/${event.lumaEventId}`}
            className="luma-checkout--button mt-6 inline-flex w-fit items-center gap-2 rounded-none bg-[var(--color-ink)] px-5 py-2.5 text-base font-medium text-[var(--color-paper)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-12px_rgba(26,26,26,0.5)]"
            data-luma-action="checkout"
            data-luma-event-id={event.lumaEventId}
          >
            Register for Event
          </a>
        ) : event.lumaUrl ? (
          <a
            href={event.lumaUrl}
            target="_blank"
            rel="noreferrer"
            className="draw-link mt-5 inline-flex w-fit items-center text-base text-[var(--color-brand-600)]"
          >
            {variant === "upcoming" ? "Register on Luma ↗" : "View on Luma ↗"}
          </a>
        ) : null}
      </div>
    </article>
  );
}
