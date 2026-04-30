import Link from "next/link";

const links = [
  { href: "/episodes", label: "Episodes" },
  { href: "/guests", label: "Guests" },
  { href: "/fireside", label: "Fireside" },
  { href: "/about", label: "About" },
];

export function SiteNav() {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link
          href="/"
          className="font-mono text-sm font-semibold tracking-tight"
        >
          stack<span className="text-brand-500">square</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/apply"
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Apply
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto max-w-6xl px-6 py-10 text-sm text-zinc-500">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} StackSquare</p>
          <div className="flex gap-4">
            <Link href="/contact" className="hover:text-zinc-900 dark:hover:text-zinc-100">
              Contact
            </Link>
            <Link href="/guest" className="hover:text-zinc-900 dark:hover:text-zinc-100">
              Pitch a guest
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
