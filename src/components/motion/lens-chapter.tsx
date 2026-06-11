"use client";

import Image from "next/image";
import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { EASE_OUT, Reveal } from "@/components/motion/reveal";

/**
 * One full-width chapter per lens: the artifact photograph opens with a
 * clip reveal and drifts on scroll; the text column rises beside it.
 * Chapters alternate sides via `flip`.
 */
export function LensChapter({
  index,
  title,
  kicker,
  body,
  src,
  alt,
  flip = false,
}: {
  index: string;
  title: string;
  kicker: string;
  body: string;
  src: string;
  alt: string;
  flip?: boolean;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const parallaxY = useTransform(scrollYProgress, [0, 1], ["-9%", "9%"]);

  return (
    <section ref={ref} className="border-t border-[var(--color-rule)]">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 sm:py-28 lg:grid-cols-2 lg:gap-20">
        <motion.div
          className={flip ? "lg:order-2" : undefined}
          initial={
            reduce
              ? false
              : { clipPath: "inset(14% 10% 14% 10% round 20px)", opacity: 0.4 }
          }
          whileInView={{
            clipPath: "inset(0% 0% 0% 0% round 20px)",
            opacity: 1,
          }}
          viewport={{ once: true, margin: "-12% 0px" }}
          transition={{ duration: 1.1, ease: EASE_OUT }}
        >
          <div className="relative aspect-[4/5] overflow-hidden rounded-[20px] border border-[var(--color-rule)] bg-[var(--color-paper-soft)] shadow-[0_48px_90px_-30px_rgba(0,0,0,0.85)]">
            <motion.div
              style={reduce ? undefined : { y: parallaxY }}
              className="absolute inset-x-0 -inset-y-[10%]"
            >
              <Image
                src={src}
                alt={alt}
                fill
                sizes="(min-width: 1024px) 44vw, 92vw"
                className="object-cover [filter:saturate(0.85)_contrast(1.05)]"
              />
            </motion.div>
            <span className="absolute left-4 top-4 rounded bg-[rgba(14,13,11,0.78)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-ink)]">
              Lens {index}
            </span>
          </div>
        </motion.div>

        <div className={flip ? "lg:order-1" : undefined}>
          <Reveal>
            <div className="flex items-center gap-4">
              <span className="font-display text-5xl italic leading-none text-[var(--color-rule)] sm:text-6xl">
                {index}
              </span>
              <span
                aria-hidden
                className="size-2.5 rounded-[3px] bg-[var(--color-brand-500)]"
              />
            </div>
            <p className="mt-6 font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
              {kicker}
            </p>
            <h2 className="mt-4 font-display text-4xl font-medium leading-[1.08] text-[var(--color-ink)] sm:text-5xl">
              {title}
            </h2>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-[var(--color-ink-soft)]">
              {body}
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
