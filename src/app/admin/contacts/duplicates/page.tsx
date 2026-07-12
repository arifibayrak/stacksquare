import Link from "next/link";
import { db, contacts } from "@/db";
import { desc } from "drizzle-orm";
import { DuplicatesClient, type Cluster, type DupContact } from "./client";

export const dynamic = "force-dynamic";

function normEmail(e: string | null): string | null {
  const s = (e ?? "").trim().toLowerCase();
  return s || null;
}
function normLinkedin(u: string | null): string | null {
  if (!u) return null;
  const s = u
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("?")[0]
    .split("#")[0]
    .replace(/\/+$/, "")
    .toLowerCase();
  return s || null;
}
function normText(t: string | null): string {
  return (t ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export default async function DuplicatesPage() {
  const rows = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      email: contacts.email,
      linkedinUrl: contacts.linkedinUrl,
      company: contacts.company,
      city: contacts.city,
      role: contacts.role,
      stage: contacts.stage,
      createdAt: contacts.createdAt,
    })
    .from(contacts)
    .orderBy(desc(contacts.createdAt))
    .limit(2000);

  // Union-find over contacts linked by a shared email, LinkedIn URL, or
  // name+company. Each connected component with >1 member is a duplicate group.
  const parent = new Map<string, string>();
  rows.forEach((r) => parent.set(r.id, r.id));
  const find = (x: string): string => {
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root)!;
    while (parent.get(x) !== root) {
      const next = parent.get(x)!;
      parent.set(x, root);
      x = next;
    }
    return root;
  };
  const union = (a: string, b: string) => parent.set(find(a), find(b));

  const linkBy = (keyOf: (r: (typeof rows)[number]) => string | null) => {
    const groups = new Map<string, string[]>();
    for (const r of rows) {
      const k = keyOf(r);
      if (!k) continue;
      (groups.get(k) ?? groups.set(k, []).get(k)!).push(r.id);
    }
    for (const g of groups.values())
      for (let i = 1; i < g.length; i++) union(g[0], g[i]);
    return groups;
  };

  const emailGroups = linkBy((r) => normEmail(r.email));
  const linkedinGroups = linkBy((r) => normLinkedin(r.linkedinUrl));
  const nameGroups = linkBy((r) =>
    r.company ? `${normText(r.name)}|${normText(r.company)}` : null,
  );

  const dupKeys = (groups: Map<string, string[]>) =>
    new Set(
      [...groups.values()].filter((g) => g.length > 1).flatMap((g) => g),
    );
  const emailDupIds = dupKeys(emailGroups);
  const linkedinDupIds = dupKeys(linkedinGroups);
  const nameDupIds = dupKeys(nameGroups);

  const byRoot = new Map<string, DupContact[]>();
  for (const r of rows) {
    const root = find(r.id);
    const item: DupContact = {
      id: r.id,
      name: r.name,
      email: r.email,
      linkedinUrl: r.linkedinUrl,
      company: r.company,
      city: r.city,
      role: r.role,
      stage: r.stage,
      createdAt: r.createdAt.toISOString(),
    };
    (byRoot.get(root) ?? byRoot.set(root, []).get(root)!).push(item);
  }

  const clusters: Cluster[] = [];
  for (const [root, members] of byRoot) {
    if (members.length < 2) continue;
    const reasons: string[] = [];
    if (members.some((m) => emailDupIds.has(m.id))) reasons.push("email");
    if (members.some((m) => linkedinDupIds.has(m.id))) reasons.push("LinkedIn");
    if (members.some((m) => nameDupIds.has(m.id)))
      reasons.push("name + company");
    clusters.push({ id: root, reasons, contacts: members });
  }
  // Biggest / most-confident first.
  clusters.sort((a, b) => b.contacts.length - a.contacts.length);

  const dupTotal = clusters.reduce((n, c) => n + c.contacts.length, 0);

  return (
    <div className="px-8 py-10">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/contacts"
            className="text-sm text-[var(--color-ink-muted)] hover:text-brand-600"
          >
            ← Contacts
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
            Duplicate contacts
          </h1>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            Likely duplicates, matched by email, LinkedIn URL, or name + company.
            Pick the record to keep and merge the rest into it.
          </p>
        </div>
      </div>

      {clusters.length === 0 ? (
        <div className="mt-8 rounded-lg border border-[var(--color-rule)] bg-white px-4 py-16 text-center text-sm text-[var(--color-ink-muted)] dark:border-zinc-800 dark:bg-zinc-900">
          No duplicates found. {rows.length} contacts scanned.
        </div>
      ) : (
        <>
          <p className="mt-6 text-sm text-[var(--color-ink-muted)]">
            {clusters.length} groups · {dupTotal} contacts involved.
          </p>
          <DuplicatesClient clusters={clusters} />
        </>
      )}
    </div>
  );
}
