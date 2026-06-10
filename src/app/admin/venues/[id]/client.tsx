"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { deleteVenue } from "@/lib/actions/venues";

export function DeleteVenueButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  function onClick() {
    if (!confirm("Delete this venue? Events linked to it keep running; the link is just cleared.")) return;
    start(async () => {
      try {
        await deleteVenue(id);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Delete failed");
      }
    });
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
