import { and, eq, ilike, or } from "drizzle-orm";
import { db, prospects } from "@/db";
import { canonicalLinkedin } from "@/lib/contacts-dedup";

/**
 * Prospect identity + dedupe for the research layer. A person is researched
 * once: discovery and seed imports both route through {@link findProspectByIdentity}
 * before inserting, so slightly different LinkedIn slugs, a missing LinkedIn, or
 * a country-subdomain variant of the same profile all collapse to one prospect.
 * The unique index on prospects.linkedin_url backs the LinkedIn key.
 */

export type ProspectRow = typeof prospects.$inferSelect;

/**
 * Find an existing prospect that is the same person as the given identity, by
 * canonical LinkedIn URL OR by name + company (case-insensitive). Both keys are
 * always checked (a candidate with a guessed/variant LinkedIn slug still matches
 * an existing row on name + company), so the discovery model returning a
 * different URL for someone it already found does not fork a duplicate.
 */
export async function findProspectByIdentity(identity: {
  linkedinUrl?: string | null;
  name?: string | null;
  company?: string | null;
}): Promise<ProspectRow | null> {
  const linkedinUrl = canonicalLinkedin(identity.linkedinUrl);
  const name = identity.name?.trim() || null;
  const company = identity.company?.trim() || null;

  const clauses = [];
  if (linkedinUrl) clauses.push(eq(prospects.linkedinUrl, linkedinUrl));
  if (name && company)
    clauses.push(and(ilike(prospects.name, name), ilike(prospects.company, company)));
  if (clauses.length === 0) return null;

  const [row] = await db
    .select()
    .from(prospects)
    .where(clauses.length === 1 ? clauses[0] : or(...clauses))
    .limit(1);
  return row ?? null;
}
