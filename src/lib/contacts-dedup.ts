import { eq, or } from "drizzle-orm";
import { db, contacts } from "@/db";

/**
 * Contact identity + dedupe. There is deliberately no "find duplicates" page:
 * duplicates are prevented at write time. Every path that creates a contact
 * (manual form, submission convert, Scout capture promote, Research promote)
 * canonicalises its identity keys and routes through {@link findContactByIdentity}
 * first, and the DB backs this with unique indexes on `email` + `linkedin_url`
 * (see schema). NULLs stay distinct, so contacts with neither key coexist.
 */

/**
 * Canonicalise a LinkedIn URL so the same profile always produces the same
 * string. Strips protocol/www/country-subdomain/query/hash/trailing slash,
 * lowercases, then re-prefixes https. Country subdomains matter: LinkedIn
 * serves the same profile from `uk.linkedin.com`, `tr.linkedin.com`, etc., so
 * without folding them the same person forks into duplicate rows. Mirrors the
 * canonicalisation used for prospects, so a prospect and a contact for the same
 * person collapse to one key.
 */
export function canonicalLinkedin(url: string | null | undefined): string | null {
  if (!url) return null;
  let u = url.trim();
  if (!u) return null;
  u = u
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    // Fold any 2-letter country/mobile subdomain of linkedin.com to the root.
    .replace(/^[a-z]{2}\.linkedin\.com/i, "linkedin.com")
    .split("?")[0]
    .split("#")[0]
    .replace(/\/+$/, "")
    .toLowerCase();
  if (!u) return null;
  return `https://${u}`;
}

/** Normalise an email to its canonical identity form (trim + lowercase). */
export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const e = email.trim().toLowerCase();
  return e || null;
}

export type ContactRow = typeof contacts.$inferSelect;

/**
 * Find an existing contact that is the same person as the given identity, by
 * canonical LinkedIn URL or normalised email. Returns null when neither key is
 * present or nothing matches. This is the single lookup every contact-creating
 * path uses before inserting, so the same person is never stored twice.
 */
export async function findContactByIdentity(identity: {
  linkedinUrl?: string | null;
  email?: string | null;
}): Promise<ContactRow | null> {
  const linkedinUrl = canonicalLinkedin(identity.linkedinUrl);
  const email = normalizeEmail(identity.email);

  const clauses = [];
  if (linkedinUrl) clauses.push(eq(contacts.linkedinUrl, linkedinUrl));
  if (email) clauses.push(eq(contacts.email, email));
  if (clauses.length === 0) return null;

  const [row] = await db
    .select()
    .from(contacts)
    .where(clauses.length === 1 ? clauses[0] : or(...clauses))
    .limit(1);
  return row ?? null;
}
