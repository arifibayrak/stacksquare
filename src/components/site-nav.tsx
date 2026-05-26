import Link from "next/link";
import { LogoMark } from "@/components/logo-mark";

const links = [
  { href: "/events", label: "Events" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function SiteNav() {
  return (
    <header>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-7 sm:py-9">
        <Link
          href="/"
          className="group flex items-center gap-3 text-[var(--color-ink)]"
          aria-label="StackSquare home"
        >
          <LogoMark
            size={32}
            className="transition-transform group-hover:rotate-[8deg]"
          />
          <span className="font-mono text-lg font-semibold tracking-tight sm:text-xl">
            stack<span className="text-[var(--color-brand-500)]">square</span>
          </span>
        </Link>
        <nav className="flex items-center gap-7 text-base">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)]"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-32 border-t border-[var(--color-rule)]">
      <div className="mx-auto max-w-6xl space-y-10 px-6 py-14 text-base text-[var(--color-ink-muted)]">
        <div className="grid gap-10 sm:grid-cols-2">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em]">
              Arif İsmail Bayrak
            </p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
              <a
                href="mailto:arif@stacksquare.ai"
                className="text-[var(--color-ink)] hover:opacity-70"
              >
                arif@stacksquare.ai
              </a>
              <a
                href="https://www.linkedin.com/in/arifismailbayrak"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[var(--color-ink)]"
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
                className="text-[var(--color-ink)] hover:opacity-70"
              >
                kerem@stacksquare.ai
              </a>
              <a
                href="https://www.linkedin.com/in/keremozkefeli"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[var(--color-ink)]"
              >
                LinkedIn ↗
              </a>
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
}
