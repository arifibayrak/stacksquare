"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { promoteCapture, dismissCapture } from "@/lib/actions/captures";

export function CaptureActions({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();

  return (
    <div className="flex shrink-0 gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            try {
              const res = await promoteCapture(id);
              toast.success(
                res.linked
                  ? `${name} linked to existing contact`
                  : `${name} added to contacts`,
              );
            } catch {
              toast.error("Promote failed");
            }
          })
        }
        className="rounded-md bg-[var(--color-ink)] px-3 py-1.5 text-xs font-medium text-[var(--color-paper)] hover:opacity-80 disabled:opacity-50"
      >
        {pending ? "…" : "Promote"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            try {
              await dismissCapture(id);
            } catch {
              toast.error("Dismiss failed");
            }
          })
        }
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        Dismiss
      </button>
    </div>
  );
}
