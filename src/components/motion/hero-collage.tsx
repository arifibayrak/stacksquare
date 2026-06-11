"use client";

import Image from "next/image";
import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { EASE_OUT } from "@/components/motion/reveal";

const cards = [
  {
    src: "/lenses/tech.webp",
    alt: "Closeup of a blue circuit board",
    label: "Stack",
    motion: "animate-[kenburns-a_16s_ease-in-out_infinite_alternate]",
    delay: 0.2,
  },
  {
    src: "/lenses/capital.jpg",
    alt: "Investing newspaper page with a twenty dollar bill",
    label: "Capital",
    motion: "animate-[kenburns-b_19s_ease-in-out_infinite_alternate]",
    delay: 0.35,
  },
  {
    src: "/lenses/strategy.jpg",
    alt: "Dictionary entry for strategy",
    label: "Strategy",
    motion: "animate-[kenburns-c_17s_ease-in-out_infinite_alternate]",
    delay: 0.5,
  },
  {
    src: "/lenses/psychology.webp",
    alt: "Vintage anatomical brain engraving over dictionary print",
    label: "Psychology",
    motion: "animate-[kenburns-d_21s_ease-in-out_infinite_alternate]",
    delay: 0.65,
  },
];

/**
 * The four lenses as a structured 2x2 grid of crisp rectangles, mirroring
 * the logo mark. Each frame runs a slow Ken Burns loop so the stills read
 * like looping video. Staggered entrance, slight drift on scroll.
 */
export function HeroCollage({ className }: { className?: string }) {
  const reduce = useReducedMotion() ?? false;
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const driftY = useTransform(scrollYProgress, [0, 1], [0, 70]);

  return (
    <motion.div
      ref={ref}
      style={reduce ? undefined : { y: driftY }}
      className={className}
      aria-hidden
    >
      <div className="grid grid-cols-2 gap-4">
        {cards.map((card) => (
          <motion.div
            key={card.src}
            initial={reduce ? false : { opacity: 0, y: 44, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, ease: EASE_OUT, delay: card.delay }}
          >
            <div className="group relative h-[265px] w-[225px] overflow-hidden rounded-[4px] border border-[var(--color-rule)] bg-[var(--color-paper-soft)] shadow-[0_36px_70px_-28px_rgba(0,0,0,0.85)]">
              <div className={`absolute inset-0 ${card.motion}`}>
                <Image
                  src={card.src}
                  alt={card.alt}
                  fill
                  sizes="225px"
                  className="object-cover [filter:saturate(0.82)_contrast(1.05)] transition-[filter] duration-500 group-hover:[filter:none]"
                />
              </div>
              <span className="absolute bottom-2.5 left-2.5 rounded-[2px] bg-[rgba(14,13,11,0.8)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-ink)]">
                {card.label}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
