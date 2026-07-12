import { db, aiRuns } from "@/db";
import { desc } from "drizzle-orm";
import { formatDate } from "@/lib/utils";
import {
  runCostUsd,
  formatUsd,
  WEB_SEARCH_USD_PER_SEARCH,
} from "@/lib/ai-pricing";

export const dynamic = "force-dynamic";

const KIND_LABELS: Record<string, string> = {
  discover_prospects: "Discover prospects",
  enrich_prospect: "Enrich prospect",
  find_contact_info: "Find contact info",
  enrich_contact: "Enrich contact",
  draft_outreach: "Draft outreach",
  summarize_transcript: "Summarize transcript",
  clip_suggestions: "Clip suggestions",
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-[var(--color-rule)] bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-lg font-semibold text-[var(--color-ink)]">
        {value}
      </div>
      <div className="font-mono text-[10px] uppercase tracking-wide text-[var(--color-ink-muted)]">
        {label}
      </div>
    </div>
  );
}

type Row = {
  kind: string;
  model: string;
  tokensIn: number | null;
  tokensOut: number | null;
  output: unknown;
  errorMessage: string | null;
  createdAt: Date;
};

function webSearchesOf(output: unknown): number {
  const o = (output ?? {}) as { webSearches?: number };
  return typeof o.webSearches === "number" ? o.webSearches : 0;
}

export default async function AiUsagePage() {
  const runs = (await db
    .select({
      kind: aiRuns.kind,
      model: aiRuns.model,
      tokensIn: aiRuns.tokensIn,
      tokensOut: aiRuns.tokensOut,
      output: aiRuns.output,
      errorMessage: aiRuns.errorMessage,
      createdAt: aiRuns.createdAt,
    })
    .from(aiRuns)
    .orderBy(desc(aiRuns.createdAt))
    .limit(1000)) as Row[];

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let totalCost = 0;
  let monthCost = 0;
  let totalSearches = 0;
  let metered = 0;

  const byKind = new Map<
    string,
    { runs: number; tokensIn: number; tokensOut: number; searches: number; cost: number }
  >();

  for (const r of runs) {
    const searches = webSearchesOf(r.output);
    const cost = runCostUsd({
      model: r.model,
      tokensIn: r.tokensIn,
      tokensOut: r.tokensOut,
      webSearches: searches,
    });
    totalCost += cost;
    totalSearches += searches;
    if (r.createdAt >= monthStart) monthCost += cost;
    if (r.tokensIn != null) metered++;

    const k = byKind.get(r.kind) ?? {
      runs: 0,
      tokensIn: 0,
      tokensOut: 0,
      searches: 0,
      cost: 0,
    };
    k.runs++;
    k.tokensIn += r.tokensIn ?? 0;
    k.tokensOut += r.tokensOut ?? 0;
    k.searches += searches;
    k.cost += cost;
    byKind.set(r.kind, k);
  }

  const kindRows = [...byKind.entries()].sort((a, b) => b[1].cost - a[1].cost);
  const recent = runs.slice(0, 30);
  const fmtInt = (n: number) => n.toLocaleString("en-GB");

  return (
    <div className="px-8 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
        Usage &amp; cost
      </h1>
      <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
        Estimated spend on AI runs (discovery, enrichment, contact-info search).
        Based on {runs.length} logged runs.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total (est.)" value={formatUsd(totalCost)} />
        <Stat label="This month" value={formatUsd(monthCost)} />
        <Stat label="Web searches" value={fmtInt(totalSearches)} />
        <Stat label="Runs" value={fmtInt(runs.length)} />
      </div>

      <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-[var(--color-ink)]">
        By type
      </h2>
      <div className="mt-3 overflow-x-auto rounded-lg border border-[var(--color-rule)] bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--color-rule)] text-left text-xs uppercase tracking-wide text-[var(--color-ink-muted)] dark:border-zinc-800">
            <tr>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Runs</th>
              <th className="px-4 py-3">Tokens in</th>
              <th className="px-4 py-3">Tokens out</th>
              <th className="px-4 py-3">Searches</th>
              <th className="px-4 py-3">Cost (est.)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-rule)] dark:divide-zinc-800">
            {kindRows.map(([kind, k]) => (
              <tr key={kind}>
                <td className="px-4 py-3 text-[var(--color-ink)]">
                  {KIND_LABELS[kind] ?? kind}
                </td>
                <td className="px-4 py-3 text-[var(--color-ink-soft)]">
                  {fmtInt(k.runs)}
                </td>
                <td className="px-4 py-3 text-[var(--color-ink-soft)]">
                  {fmtInt(k.tokensIn)}
                </td>
                <td className="px-4 py-3 text-[var(--color-ink-soft)]">
                  {fmtInt(k.tokensOut)}
                </td>
                <td className="px-4 py-3 text-[var(--color-ink-soft)]">
                  {fmtInt(k.searches)}
                </td>
                <td className="px-4 py-3 font-medium text-[var(--color-ink)]">
                  {formatUsd(k.cost)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-[var(--color-ink)]">
        Recent runs
      </h2>
      <div className="mt-3 overflow-x-auto rounded-lg border border-[var(--color-rule)] bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--color-rule)] text-left text-xs uppercase tracking-wide text-[var(--color-ink-muted)] dark:border-zinc-800">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Model</th>
              <th className="px-4 py-3">Tokens</th>
              <th className="px-4 py-3">Searches</th>
              <th className="px-4 py-3">Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-rule)] dark:divide-zinc-800">
            {recent.map((r, i) => {
              const searches = webSearchesOf(r.output);
              const unmetered = r.tokensIn == null;
              const cost = runCostUsd({
                model: r.model,
                tokensIn: r.tokensIn,
                tokensOut: r.tokensOut,
                webSearches: searches,
              });
              return (
                <tr key={i}>
                  <td className="px-4 py-3 text-[var(--color-ink-soft)]">
                    {formatDate(r.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-ink)]">
                    {KIND_LABELS[r.kind] ?? r.kind}
                    {r.errorMessage && (
                      <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] uppercase text-red-700 dark:bg-red-950 dark:text-red-400">
                        error
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--color-ink-muted)]">
                    {r.model}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-ink-soft)]">
                    {unmetered
                      ? "·"
                      : `${fmtInt(r.tokensIn ?? 0)} / ${fmtInt(r.tokensOut ?? 0)}`}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-ink-soft)]">
                    {searches || "·"}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-ink-soft)]">
                    {unmetered ? "not metered" : formatUsd(cost)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-6 max-w-2xl text-xs text-[var(--color-ink-muted)]">
        Estimates. Token prices per the Claude pricing reference (Sonnet 4.6:
        $3/$15 per million in/out). Web search billed at $
        {WEB_SEARCH_USD_PER_SEARCH.toFixed(2)}/search (override with
        WEB_SEARCH_USD_PER_SEARCH). Runs logged before cost tracking show as
        &ldquo;not metered&rdquo; and count as $0. {metered} of {runs.length}{" "}
        runs are metered.
      </p>
    </div>
  );
}
