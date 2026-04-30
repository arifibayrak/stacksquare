"use client";

import { useTransition } from "react";
import { markTriaged, convertToContact } from "@/lib/actions/submissions";

export function TriageActions({
  id,
  payload,
  kind,
}: {
  id: string;
  payload: Record<string, unknown>;
  kind: string;
}) {
  const [pending, start] = useTransition();

  function onConvert() {
    const name =
      String(payload.name ?? payload.guest_name ?? payload.your_name ?? "")
        .trim() || "Unnamed";
    const email = String(
      payload.email ?? payload.your_email ?? "",
    ).trim();
    const linkedin = String(
      payload.linkedin ?? payload.guest_linkedin ?? "",
    ).trim();
    start(() =>
      convertToContact({
        submissionId: id,
        name,
        email: email || null,
        linkedinUrl: linkedin || null,
        source: `website /${kind} form`,
        notes: JSON.stringify(payload, null, 2),
      }),
    );
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={onConvert}
        disabled={pending}
        className="rounded-md bg-zinc-900 px-3 py-1 text-xs text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        Convert → contact
      </button>
      <button
        onClick={() => start(() => markTriaged(id))}
        disabled={pending}
        className="rounded-md border border-zinc-300 px-3 py-1 text-xs hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        Mark handled
      </button>
    </div>
  );
}
