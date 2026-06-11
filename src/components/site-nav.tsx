export { SiteHeader as SiteNav } from "@/components/site-header";

export function SiteFooter() {
  return (
    <footer className="relative mt-32 overflow-hidden border-t border-[var(--color-rule)]">
      <div className="mx-auto max-w-6xl space-y-10 px-6 py-14 text-base text-[var(--color-ink-muted)]">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-ink)]">
            stacksquare
          </p>
          <p className="mt-3 max-w-md leading-relaxed">
            An events organization. Fireside chats, expert sessions, and peer
            gatherings in London for founders, investors, and operators.
          </p>
        </div>
        <div className="grid gap-10 sm:grid-cols-2">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em]">
              Arif İsmail Bayrak
            </p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
              <a
                href="mailto:arif@stacksquare.ai"
                className="draw-link text-[var(--color-ink)]"
              >
                arif@stacksquare.ai
              </a>
              <a
                href="https://www.linkedin.com/in/arifismailbayrak"
                target="_blank"
                rel="noreferrer"
                className="draw-link hover:text-[var(--color-ink)]"
              >
                LinkedIn ↗
              </a>
            </div>
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em]">
              Kerem Ozkefeli
            </p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
              <a
                href="mailto:kerem@stacksquare.ai"
                className="draw-link text-[var(--color-ink)]"
              >
                kerem@stacksquare.ai
              </a>
              <a
                href="https://www.linkedin.com/in/keremozkefeli"
                target="_blank"
                rel="noreferrer"
                className="draw-link hover:text-[var(--color-ink)]"
              >
                LinkedIn ↗
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Oversized wordmark, clipped at the bottom edge of the page. */}
      <div aria-hidden className="pointer-events-none select-none">
        <p className="translate-y-[22%] whitespace-nowrap px-4 text-center font-display text-[clamp(4.5rem,15.5vw,13rem)] lowercase italic leading-none tracking-tight text-[var(--color-ink)] opacity-[0.05]">
          stacksquare
        </p>
      </div>
    </footer>
  );
}
