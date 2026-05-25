/**
 * Renders a Luma calendar embed. Accepts either a raw Luma calendar id
 * (e.g. "cal-xxxxxxxx") or a full embed/calendar URL and normalizes it to the
 * calendar embed iframe. When no id is configured it renders a calm placeholder
 * so the page never shows a broken frame.
 *
 * Luma embed reference: https://lu.ma/embed/calendar/<calendar-id>/events
 */
export function LumaEmbed({
  source,
  minHeight = 720,
  className = "",
}: {
  source?: string | null;
  minHeight?: number;
  className?: string;
}) {
  const src = resolveLumaSrc(source);

  if (!src) {
    return (
      <div
        className={`flex flex-col items-start gap-3 rounded-xl border border-dashed border-[var(--color-rule)] bg-[var(--color-paper-soft)] p-8 ${className}`}
      >
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
          Events calendar
        </p>
        <p className="max-w-md text-base leading-relaxed text-[var(--color-ink-soft)]">
          The Luma calendar is not connected yet. Set its id in the admin or via
          the NEXT_PUBLIC_LUMA_CALENDAR_ID environment variable and upcoming
          events will appear here.
        </p>
        <a
          href="https://lu.ma"
          target="_blank"
          rel="noreferrer"
          className="text-base text-[var(--color-brand-600)] underline decoration-[var(--color-rule)] underline-offset-4 transition-colors hover:decoration-[var(--color-brand-600)]"
        >
          Open Luma ↗
        </a>
      </div>
    );
  }

  return (
    <iframe
      src={src}
      title="StackSquare events on Luma"
      loading="lazy"
      style={{ minHeight, border: "1px solid var(--color-rule)" }}
      className={`w-full rounded-xl bg-[var(--color-paper-soft)] ${className}`}
      allow="fullscreen"
      aria-label="StackSquare events calendar"
    />
  );
}

function resolveLumaSrc(source?: string | null): string | null {
  const raw = source?.trim();
  if (!raw) return null;
  // Full URL already (embed or share link): trust it.
  if (raw.startsWith("http")) return raw;
  // Bare calendar id like "cal-xxxxxxxx".
  return `https://luma.com/embed/calendar/${raw}/events`;
}
