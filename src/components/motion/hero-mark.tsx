"use client";

import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { EASE_OUT } from "@/components/motion/reveal";

/**
 * The 2x2 StackSquare mark, blown up and brought to life. Three ink squares
 * settle onto the grid from offset positions; the brand square arrives last,
 * snapping into a dashed outline that was waiting for it ("we meet in the
 * square"). The whole group then drifts gently and parallaxes on scroll.
 */
export function HeroMark({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const parallaxY = useTransform(scrollYProgress, [0, 1], [0, 90]);

  const square =
    "size-24 rounded-[20px] sm:size-28 lg:size-32 shadow-[0_24px_48px_-20px_rgba(26,26,26,0.35)]";

  const ink = [
    { initial: { opacity: 0, y: -56, rotate: -8 }, delay: 0.15 },
    { initial: { opacity: 0, x: 56, rotate: 6 }, delay: 0.3 },
    { initial: { opacity: 0, x: -56, rotate: 6 }, delay: 0.45 },
  ];

  return (
    <motion.div
      ref={ref}
      style={reduce ? undefined : { y: parallaxY }}
      className={className}
      aria-hidden
    >
      <div className="animate-[float-soft_7s_ease-in-out_infinite]">
        <div className="grid grid-cols-2 gap-4 sm:gap-5">
          {ink.map((s, i) => (
            <motion.div
              key={i}
              initial={reduce ? false : s.initial}
              animate={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
              transition={{ duration: 0.9, ease: EASE_OUT, delay: s.delay }}
              className={`${square} bg-[var(--color-ink)]`}
            />
          ))}
          <div className="relative">
            {/* The empty seat: a dashed outline waiting on the grid. */}
            <motion.div
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.55 }}
              className="absolute inset-0 rounded-[20px] border-2 border-dashed border-[var(--color-ink-muted)] opacity-60"
            />
            <motion.div
              initial={reduce ? false : { opacity: 0, scale: 0.5, y: 64 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                type: "spring",
                stiffness: 220,
                damping: 20,
                delay: 1.0,
              }}
              className={`${square} relative bg-[var(--color-brand-500)]`}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
