"use client";

import Image from "next/image";
import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { EASE_OUT } from "@/components/motion/reveal";

type Card = {
  src: string;
  alt: string;
  label: string;
  left: string;
  top: string;
  w: number;
  h: number;
  rotate: number;
  depth: number;
  delay: number;
  z: number;
};

const cards: Card[] = [
  {
    src: "/lenses/tech.webp",
    alt: "Closeup of a blue circuit board",
    label: "Stack",
    left: "0%",
    top: "6%",
    w: 220,
    h: 300,
    rotate: -7,
    depth: 26,
    delay: 0.25,
    z: 1,
  },
  {
    src: "/lenses/capital.jpg",
    alt: "Investing newspaper page with a twenty dollar bill",
    label: "Capital",
    left: "46%",
    top: "0%",
    w: 210,
    h: 320,
    rotate: 5,
    depth: 14,
    delay: 0.4,
    z: 2,
  },
  {
    src: "/lenses/strategy.jpg",
    alt: "Dictionary entry for strategy",
    label: "Strategy",
    left: "8%",
    top: "52%",
    w: 240,
    h: 230,
    rotate: 4,
    depth: 20,
    delay: 0.55,
    z: 3,
  },
  {
    src: "/lenses/psychology.webp",
    alt: "Vintage anatomical brain engraving over dictionary print",
    label: "Psychology",
    left: "52%",
    top: "46%",
    w: 220,
    h: 300,
    rotate: -4,
    depth: 32,
    delay: 0.7,
    z: 4,
  },
];

function CollageCard({
  card,
  mx,
  my,
  reduce,
}: {
  card: Card;
  mx: MotionValue<number>;
  my: MotionValue<number>;
  reduce: boolean;
}) {
  const x = useTransform(mx, (v) => v * card.depth);
  const y = useTransform(my, (v) => v * card.depth);

  return (
    <motion.div
      className="absolute"
      style={{ left: card.left, top: card.top, zIndex: card.z }}
      initial={
        reduce
          ? false
          : { opacity: 0, y: 90, rotate: card.rotate + 10, scale: 0.9 }
      }
      animate={{ opacity: 1, y: 0, rotate: card.rotate, scale: 1 }}
      transition={{ duration: 1.1, ease: EASE_OUT, delay: card.delay }}
    >
      <motion.div style={reduce ? undefined : { x, y }}>
        <div
          className="group relative overflow-hidden rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper-soft)] shadow-[0_48px_90px_-30px_rgba(0,0,0,0.85)] transition-transform duration-500 hover:scale-[1.04]"
          style={{ width: card.w, height: card.h }}
        >
          <Image
            src={card.src}
            alt={card.alt}
            fill
            sizes={`${card.w}px`}
            className="object-cover [filter:saturate(0.8)_contrast(1.05)] transition-[filter] duration-500 group-hover:[filter:none]"
          />
          <span className="absolute bottom-2.5 left-2.5 rounded bg-[rgba(14,13,11,0.78)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-ink)]">
            {card.label}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}

/**
 * The four lens artifacts scattered like specimens on a desk. Staggered
 * entrance, gentle mouse parallax (each card at a different depth), and a
 * slow scroll drift. Static grid fallback under prefers-reduced-motion.
 */
export function HeroCollage({ className }: { className?: string }) {
  const reduce = useReducedMotion() ?? false;
  const ref = useRef<HTMLDivElement>(null);

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const mx = useSpring(rawX, { stiffness: 60, damping: 16 });
  const my = useSpring(rawY, { stiffness: 60, damping: 16 });

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const driftY = useTransform(scrollYProgress, [0, 1], [0, 110]);

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (reduce) return;
    const rect = e.currentTarget.getBoundingClientRect();
    rawX.set((e.clientX - rect.left) / rect.width - 0.5);
    rawY.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  return (
    <motion.div
      ref={ref}
      onPointerMove={onPointerMove}
      style={reduce ? undefined : { y: driftY }}
      className={className}
      aria-hidden
    >
      <div className="relative h-[560px] w-[470px]">
        {cards.map((card) => (
          <CollageCard
            key={card.src}
            card={card}
            mx={mx}
            my={my}
            reduce={reduce}
          />
        ))}
      </div>
    </motion.div>
  );
}
