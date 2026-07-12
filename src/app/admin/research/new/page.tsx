import Link from "next/link";
import { createSegment } from "@/lib/actions/research";

export const dynamic = "force-dynamic";

const inputCls =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-zinc-700 dark:bg-zinc-900";

export default function NewSegmentPage() {
  return (
    <div className="px-8 py-10">
      <Link
        href="/admin/research"
        className="text-sm text-[var(--color-ink-muted)] hover:text-brand-600"
      >
        ← Research
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        New database
      </h1>
      <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
        A targeted people-map. The brief guides the web-search discovery agent.
      </p>

      <form action={createSegment} className="mt-8 max-w-2xl space-y-5">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Name
          </span>
          <input
            name="name"
            required
            placeholder="Turkish founders in London"
            className={inputCls}
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Description
          </span>
          <input
            name="description"
            placeholder="Founders and builders of Turkish origin, based in London."
            className={inputCls}
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Discovery brief
          </span>
          <textarea
            name="brief"
            rows={5}
            placeholder="People of Turkish origin/heritage, currently based in London, who founded or are building a startup. Prefer venture-backed or notable builders. Include the company and a public source for each."
            className={inputCls}
          />
          <span className="mt-1 block text-xs text-[var(--color-ink-muted)]">
            Handed verbatim to the web-search agent. Be specific about who
            qualifies and who does not.
          </span>
        </label>

        <div className="flex gap-3">
          <button className="rounded-md bg-[var(--color-ink)] px-4 py-2 text-sm font-medium text-[var(--color-paper)] hover:opacity-80">
            Create database
          </button>
          <Link
            href="/admin/research"
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
