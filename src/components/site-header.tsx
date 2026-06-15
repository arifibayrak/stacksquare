"use client";

import { useState } from "react";
import Link from "next/link";
import { useMotionValueEvent, useScroll } from "motion/react";
import { LogoMark } from "@/components/logo-mark";

const links = [
  { href: "/manifesto", label: "Manifesto" },
  { href: "/events", label: "Events" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 16));

  return (
    <header
      className={`sticky top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-300 ${
        scrolled
          ? "border-b border-[var(--color-rule)] bg-[color-mix(in_srgb,var(--color-paper)_86%,transparent)] backdrop-blur-md"
          : "border-b border-transparent"
      }`}
    >
      <div
        className={`mx-auto flex max-w-6xl items-center justify-between px-6 transition-[padding] duration-300 ${
          scrolled ? "py-4" : "py-7 sm:py-9"
        }`}
      >
        <Link
          href="/"
          className="group flex items-center gap-3 text-[var(--color-ink)]"
          aria-label="StackSquare home"
        >
          <LogoMark
            size={32}
            className="transition-transform duration-300 group-hover:rotate-[8deg] group-hover:scale-105"
          />
          <span className="font-mono text-lg font-semibold tracking-tight sm:text-xl">
            Stacksquare
          </span>
        </Link>
        <nav className="flex items-center gap-7 text-base">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="draw-link text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)]"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
