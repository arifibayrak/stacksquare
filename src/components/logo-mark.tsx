export function LogoMark({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="3" width="11" height="11" rx="1.5" className="fill-[var(--color-ink)]" />
      <rect x="18" y="3" width="11" height="11" rx="1.5" className="fill-[var(--color-ink)]" />
      <rect x="3" y="18" width="11" height="11" rx="1.5" className="fill-[var(--color-ink)]" />
      <rect x="18" y="18" width="11" height="11" rx="1.5" className="fill-[var(--color-brand-500)]" />
    </svg>
  );
}
