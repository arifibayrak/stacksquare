"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { addCost, deleteCost, setCostActual } from "@/lib/actions/event-plan";
import {
  COST_CATEGORIES,
  COST_CATEGORY_LABELS,
  OWNERS,
  OWNER_LABELS,
  type EventCost,
} from "@/db/schema";

function gbp(pence: number | null): string {
  if (pence === null) return "";
  return (pence / 100).toLocaleString("en-GB", {
    style: "currency",
    currency: "GBP",
  });
}

export function CostsSection({
  eventId,
  costs,
  targetHeadcount,
}: {
  eventId: string;
  costs: EventCost[];
  targetHeadcount: number | null;
}) {
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const totalEst = costs.reduce((s, c) => s + (c.estimatedPence ?? 0), 0);
  const totalActual = costs.reduce((s, c) => s + (c.actualPence ?? 0), 0);

  function onAdd(fd: FormData) {
    start(async () => {
      try {
        await addCost(eventId, fd);
        formRef.current?.reset();
        toast.success("Cost added");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Add failed");
      }
    });
  }

  function onActualBlur(c: EventCost, value: string) {
    const newPence = value.trim() === "" ? null : Math.round(Number(value) * 100);
    if (Number.isNaN(newPence as number)) return;
    if (newPence === c.actualPence) return;
    start(async () => {
      try {
        await setCostActual(c.id, value);
        toast.success("Actual updated");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Update failed");
      }
    });
  }

  function onDelete(id: string) {
    start(async () => {
      try {
        await deleteCost(id);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Delete failed");
      }
    });
  }

  return (
    <section id="costs" className="scroll-mt-20">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-500">
        Costs
      </h2>
      <div className="mt-3 rounded-lg border border-[var(--color-rule)] bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-rule)] text-left text-[10px] uppercase tracking-wide text-zinc-400 dark:border-zinc-800">
              <th className="px-3 py-2 font-medium">Item</th>
              <th className="px-3 py-2 font-medium">Category</th>
              <th className="px-3 py-2 text-right font-medium">Estimated</th>
              <th className="px-3 py-2 text-right font-medium">Actual</th>
              <th className="px-3 py-2 font-medium">Paid by</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {costs.map((c) => (
              <tr
                key={c.id}
                className="border-b border-[var(--color-rule)] last:border-0 dark:border-zinc-800"
              >
                <td className="px-3 py-2">
                  <span className="font-medium">{c.label}</span>
                  {c.note ? (
                    <span className="ml-2 text-xs text-zinc-400">{c.note}</span>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-xs text-zinc-500">
                  {COST_CATEGORY_LABELS[c.category]}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {gbp(c.estimatedPence)}
                </td>
                <td className="px-3 py-2 text-right">
                  <input
                    type="number"
                    step="0.01"
                    defaultValue={
                      c.actualPence === null ? "" : (c.actualPence / 100).toString()
                    }
                    onBlur={(e) => onActualBlur(c, e.target.value)}
                    placeholder="0.00"
                    className="w-24 rounded border border-zinc-200 bg-white px-2 py-1 text-right text-sm tabular-nums dark:border-zinc-700 dark:bg-zinc-950"
                  />
                </td>
                <td className="px-3 py-2 text-xs text-zinc-500">
                  {c.paidBy ? OWNER_LABELS[c.paidBy] : ""}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => onDelete(c.id)}
                    disabled={pending}
                    className="text-xs text-zinc-400 hover:text-red-600 disabled:opacity-50"
                    aria-label={`Delete ${c.label}`}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
            {costs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-5 text-center text-xs text-zinc-400">
                  No cost lines yet.
                </td>
              </tr>
            )}
          </tbody>
          {costs.length > 0 && (
            <tfoot>
              <tr className="border-t border-[var(--color-rule)] text-sm font-medium dark:border-zinc-800">
                <td className="px-3 py-2" colSpan={2}>
                  Total
                  {targetHeadcount ? (
                    <span className="ml-2 text-xs font-normal text-zinc-400">
                      (est {gbp(Math.round(totalEst / targetHeadcount))} per head
                      at {targetHeadcount})
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {gbp(totalEst)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {totalActual > 0 ? gbp(totalActual) : ""}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <form
        ref={formRef}
        action={onAdd}
        className="mt-3 flex flex-wrap items-end gap-2"
      >
        <input
          name="label"
          required
          placeholder="Venue hire"
          className="w-44 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <select
          name="category"
          defaultValue="other"
          className="rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {COST_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {COST_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <input
          name="estimated"
          type="number"
          step="0.01"
          placeholder="Est GBP"
          className="w-28 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <select
          name="paidBy"
          defaultValue=""
          className="rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">Paid by</option>
          {OWNERS.map((o) => (
            <option key={o} value={o}>
              {OWNER_LABELS[o]}
            </option>
          ))}
        </select>
        <input
          name="note"
          placeholder="Note (optional)"
          className="w-44 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Add cost
        </button>
      </form>
    </section>
  );
}
