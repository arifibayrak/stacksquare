"use client";

import { useTransition } from "react";
import { toast } from "sonner";

type Option = { value: string; label: string };

export function QuickPill({
  label,
  current,
  options,
  onChange,
  emptyValue = "",
}: {
  label: string;
  current: string;
  options: Option[];
  onChange: (next: string) => Promise<void>;
  emptyValue?: string;
}) {
  const [pending, start] = useTransition();
  const currentLabel =
    options.find((o) => o.value === current)?.label ?? "Set";

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value === "__empty__" ? emptyValue : e.target.value;
    if (next === current) return;
    start(async () => {
      try {
        await onChange(next);
        toast.success(`${label}: ${optionLabel(options, next) || "cleared"}`);
      } catch (err) {
        toast.error(`Could not change ${label.toLowerCase()}`, {
          description: err instanceof Error ? err.message : "Unknown error",
        });
      }
    });
  }

  return (
    <span className="relative inline-flex items-center">
      <span
        className={
          "rounded-full border px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide transition-colors " +
          (pending
            ? "border-zinc-300 bg-zinc-100 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800"
            : "border-[var(--color-rule)] bg-white text-[var(--color-ink)] hover:border-[var(--color-ink)] dark:border-zinc-700 dark:bg-zinc-900")
        }
      >
        <span className="text-[var(--color-ink-muted)]">{label}: </span>
        <span className="font-semibold">{currentLabel}</span>
      </span>
      <select
        aria-label={`Change ${label}`}
        value={current === "" ? "__empty__" : current}
        onChange={handleChange}
        disabled={pending}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {options.map((o) => (
          <option key={o.value || "__empty__"} value={o.value || "__empty__"}>
            {o.label}
          </option>
        ))}
      </select>
    </span>
  );
}

function optionLabel(options: Option[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? "";
}
