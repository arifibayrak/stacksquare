"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

const sections = [
  {
    label: "Pipeline",
    links: [
      { href: "/admin", label: "Dashboard" },
      { href: "/admin/pipeline", label: "Pipeline" },
      { href: "/admin/contacts", label: "Contacts" },
    ],
  },
  {
    label: "Outreach",
    links: [
      { href: "/admin/outreach", label: "Queue" },
      { href: "/admin/outreach/templates", label: "Templates" },
    ],
  },
  {
    label: "Events",
    links: [
      { href: "/admin/events", label: "Events" },
      { href: "/admin/venues", label: "Venues" },
    ],
  },
  {
    label: "Research",
    links: [{ href: "/admin/research", label: "Databases" }],
  },
  {
    label: "Inbox",
    links: [
      { href: "/admin/submissions", label: "Submissions" },
      { href: "/admin/scout", label: "Scout queue" },
    ],
  },
  {
    label: "The Quadrant",
    links: [
      { href: "/admin/quadrant", label: "Subscribers" },
      { href: "/admin/quadrant/messages", label: "Messages" },
    ],
  },
  {
    label: "AI",
    links: [
      { href: "/admin/ai/enrich", label: "Enrich contact" },
      { href: "/admin/ai/draft", label: "Draft outreach" },
      { href: "/admin/ai/usage", label: "Usage & cost" },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="border-b border-zinc-200 px-6 py-5 dark:border-zinc-800">
        <Link href="/admin" className="font-mono text-sm font-semibold">
          stack<span className="text-brand-500">square</span>
          <span className="ml-1 text-[10px] uppercase tracking-widest text-zinc-500">
            admin
          </span>
        </Link>
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-6 text-sm">
        {sections.map((s) => (
          <div key={s.label}>
            <p className="px-2 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
              {s.label}
            </p>
            <ul className="mt-2 space-y-1">
              {s.links.map((l) => {
                const active =
                  pathname === l.href ||
                  (l.href !== "/admin" && pathname.startsWith(l.href));
                return (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className={cn(
                        "block rounded-md px-2 py-1.5 transition-colors",
                        active
                          ? "bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
                          : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100",
                      )}
                    >
                      {l.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-zinc-200 px-4 py-4 dark:border-zinc-800">
        <UserButton />
      </div>
    </aside>
  );
}
