import Image from "next/image";

export function InitialsAvatar({
  initials,
  src,
  size = 96,
  alt,
}: {
  initials: string;
  src?: string;
  size?: number;
  alt?: string;
}) {
  if (src) {
    return (
      <div
        style={{ width: size, height: size }}
        className="relative shrink-0 overflow-hidden rounded-full bg-[var(--color-paper-soft)]"
      >
        <Image
          src={src}
          alt={alt ?? initials}
          fill
          sizes={`${size}px`}
          quality={90}
          priority
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      aria-label={alt ?? initials}
      role="img"
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-full bg-[var(--color-ink)] text-[var(--color-paper)]"
    >
      <span
        className="font-mono font-semibold tracking-tight"
        style={{ fontSize: size * 0.36 }}
      >
        {initials}
      </span>
    </div>
  );
}
