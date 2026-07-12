// USD pricing for the AI runs we log to `ai_runs`, used by the admin
// Usage & cost page. Token prices are per 1,000,000 tokens.
//
// Source: the claude-api reference (cached 2026-06). If Anthropic changes
// pricing, update MODEL_PRICES or override the web-search rate via env.

type Price = { inputPerM: number; outputPerM: number };

const MODEL_PRICES: Record<string, Price> = {
  "claude-sonnet-4-6": { inputPerM: 3, outputPerM: 15 },
  "claude-opus-4-7": { inputPerM: 5, outputPerM: 25 },
  "claude-opus-4-8": { inputPerM: 5, outputPerM: 25 },
  "claude-haiku-4-5": { inputPerM: 1, outputPerM: 5 },
};

// Fallback when a run's model id isn't in the table (matches modelFast).
const DEFAULT_PRICE: Price = { inputPerM: 3, outputPerM: 15 };

// Anthropic's web_search server tool bills ~$10 per 1,000 searches
// ($0.01/search). Override with WEB_SEARCH_USD_PER_SEARCH if it changes.
export const WEB_SEARCH_USD_PER_SEARCH = process.env.WEB_SEARCH_USD_PER_SEARCH
  ? Number(process.env.WEB_SEARCH_USD_PER_SEARCH)
  : 0.01;

export function priceFor(model: string): Price {
  return MODEL_PRICES[model] ?? DEFAULT_PRICE;
}

/** Cost of a single logged run in USD. Missing tokens count as 0 (unmetered). */
export function runCostUsd(opts: {
  model: string;
  tokensIn: number | null | undefined;
  tokensOut: number | null | undefined;
  webSearches: number | null | undefined;
}): number {
  const p = priceFor(opts.model);
  const inCost = ((opts.tokensIn ?? 0) / 1_000_000) * p.inputPerM;
  const outCost = ((opts.tokensOut ?? 0) / 1_000_000) * p.outputPerM;
  const searchCost = (opts.webSearches ?? 0) * WEB_SEARCH_USD_PER_SEARCH;
  return inCost + outCost + searchCost;
}

export function formatUsd(n: number): string {
  if (n <= 0) return "$0.00";
  if (n < 0.01) return "<$0.01";
  return "$" + n.toFixed(2);
}
