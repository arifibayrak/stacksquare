"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/**
 * Scroll-triggered reveal: fades and rises once when the element enters the
 * viewport. Renders static when the user prefers reduced motion.
 */
export function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-64px 0px" }}
      transition={{ duration: 0.7, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Mount-time fade for above-the-fold content (eyebrow, lede, CTAs). */
export function FadeIn({
  children,
  delay = 0,
  y = 16,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  );
}

/**
 * One headline line that rises out of an overflow mask on mount.
 * Use one per visual line of a display heading.
 */
export function MaskedLine({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) {
    return <span className={`block ${className ?? ""}`}>{children}</span>;
  }
  return (
    <span className="block overflow-hidden pb-[0.12em] -mb-[0.12em]">
      <motion.span
        className={`block ${className ?? ""}`}
        initial={{ y: "112%" }}
        animate={{ y: 0 }}
        transition={{ duration: 0.9, ease: EASE_OUT, delay }}
      >
        {children}
      </motion.span>
    </span>
  );
}

/** Container that staggers its StaggerItem children as they scroll in. */
export function Stagger({
  children,
  className,
  step = 0.09,
}: {
  children: ReactNode;
  className?: string;
  step?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : "hidden"}
      whileInView="show"
      viewport={{ once: true, margin: "-64px 0px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: step } } }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 24 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.6, ease: EASE_OUT },
        },
      }}
    >
      {children}
    </motion.div>
  );
}
