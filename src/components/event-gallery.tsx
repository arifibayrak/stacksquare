"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

/**
 * Event photos as a continuously scrolling reel (content is rendered twice for
 * a seamless loop; pauses on hover). Clicking any photo opens a full-screen
 * lightbox with prev/next controls, keyboard arrows, and Esc/backdrop to close,
 * so visitors can flick through every shot at their own pace.
 */
export function EventGallery({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const count = images.length;

  const go = useCallback(
    (dir: number) => {
      setOpenIndex((v) => (v === null ? v : (v + dir + count) % count));
    },
    [count],
  );

  // While the lightbox is open: lock body scroll and wire up keyboard nav.
  useEffect(() => {
    if (openIndex === null) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenIndex(null);
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [openIndex, go]);

  if (count === 0) return null;

  return (
    <>
      <div className="marquee photo-reel mb-7 py-2">
        <div
          className="marquee-track"
          style={{ animationDuration: `${count * 5}s` }}
        >
          {[false, true].map((clone) => (
            <div
              key={clone ? "clone" : "reel"}
              aria-hidden={clone}
              className="flex shrink-0 gap-5 pr-5"
            >
              {images.map((src, i) => (
                <button
                  key={`${clone ? "c" : "r"}-${src}`}
                  type="button"
                  tabIndex={clone ? -1 : 0}
                  onClick={() => setOpenIndex(i)}
                  aria-label={`View ${title} photo ${i + 1} of ${count}`}
                  className={`group/photo relative shrink-0 cursor-zoom-in overflow-hidden rounded-[4px] border border-[var(--color-rule)] bg-[var(--color-paper-soft)] shadow-[0_24px_48px_-20px_rgba(0,0,0,0.8)] transition-transform duration-500 hover:scale-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-500)] ${
                    i === 0
                      ? "aspect-[4/3] h-56 sm:h-64"
                      : "aspect-[3/4] h-56 sm:h-64"
                  }`}
                >
                  <Image
                    src={src}
                    alt={clone ? "" : `${title} photo ${i + 1}`}
                    fill
                    quality={85}
                    sizes="(min-width: 640px) 360px, 300px"
                    className="object-cover"
                  />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-[rgba(14,13,11,0)] transition-colors duration-300 group-hover/photo:bg-[rgba(14,13,11,0.28)]"
                  />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute bottom-2 right-2 flex size-8 items-center justify-center rounded-full bg-[rgba(14,13,11,0.55)] text-[var(--color-paper)] opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover/photo:opacity-100"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M15 3h6v6" />
                      <path d="M9 21H3v-6" />
                      <path d="M21 3l-7 7" />
                      <path d="M3 21l7-7" />
                    </svg>
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {openIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${title} photos`}
          onClick={() => setOpenIndex(null)}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[rgba(8,7,6,0.94)] px-4 py-16 backdrop-blur-sm sm:px-16"
        >
          {/* Close */}
          <button
            type="button"
            onClick={() => setOpenIndex(null)}
            aria-label="Close"
            className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-full border border-[rgba(240,235,223,0.2)] text-[var(--color-paper)] transition-colors duration-200 hover:bg-[rgba(240,235,223,0.12)] sm:right-6 sm:top-6"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>

          {/* Prev */}
          {count > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                go(-1);
              }}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full border border-[rgba(240,235,223,0.2)] text-[var(--color-paper)] transition-colors duration-200 hover:bg-[rgba(240,235,223,0.12)] sm:left-6 sm:size-14"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
          )}

          {/* Image */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex h-[78vh] w-full max-w-5xl items-center justify-center"
          >
            <Image
              key={images[openIndex]}
              src={images[openIndex]}
              alt={`${title} photo ${openIndex + 1}`}
              fill
              quality={90}
              sizes="100vw"
              priority
              className="object-contain"
            />
          </div>

          {/* Next */}
          {count > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                go(1);
              }}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full border border-[rgba(240,235,223,0.2)] text-[var(--color-paper)] transition-colors duration-200 hover:bg-[rgba(240,235,223,0.12)] sm:right-6 sm:size-14"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          )}

          {/* Counter */}
          <p
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-6 font-mono text-xs uppercase tracking-[0.18em] text-[rgba(240,235,223,0.7)]"
          >
            {openIndex + 1} / {count}
          </p>
        </div>
      )}
    </>
  );
}
