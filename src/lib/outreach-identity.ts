import { and, eq, or } from "drizzle-orm";
import { db, contacts, contactIdentities } from "@/db";
import type { ContactRow } from "@/lib/contacts-dedup";
import { canonicalLinkedin, normalizeEmail } from "@/lib/contacts-dedup";

/**
 * Cross-channel contact matching for the outreach timeline. A LinkedIn DM gives
 * us a profile URL, a Gmail thread gives an email, a pasted WhatsApp chat gives
 * a phone. This resolves any of those to an existing contact.
 *
 * Order: check `contact_identities` (the full identity map) first, then fall
 * back to the primary `contacts.linkedin_url` / `contacts.email` columns. The
 * `contacts` columns stay authoritative; `contact_identities` extends them with
 * secondary emails / phones that a person also uses.
 */

export type IdentityKind = "linkedin" | "email" | "phone";

/** Normalise a phone number to a canonical identity: leading + kept, digits only. */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const raw = phone.trim();
  if (!raw) return null;
  const hasPlus = raw.startsWith("+");
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  return hasPlus ? `+${digits}` : digits;
}

/** Canonicalise a value for the given identity kind. */
export function canonicalIdentity(
  kind: IdentityKind,
  value: string | null | undefined,
): string | null {
  if (kind === "linkedin") return canonicalLinkedin(value);
  if (kind === "email") return normalizeEmail(value);
  return normalizePhone(value);
}

type Identity = {
  linkedinUrl?: string | null;
  email?: string | null;
  phone?: string | null;
};

/**
 * Resolve any combination of identities to a single contact, or null. Returns
 * the full contact row so callers can stamp lastTouchAt etc.
 */
export async function resolveContact(
  identity: Identity,
): Promise<ContactRow | null> {
  const linkedinUrl = canonicalLinkedin(identity.linkedinUrl);
  const email = normalizeEmail(identity.email);
  const phone = normalizePhone(identity.phone);

  // 1) The identity map (covers secondary emails / phones / linkedin urls).
  const idClauses = [];
  if (linkedinUrl)
    idClauses.push(
      and(
        eq(contactIdentities.kind, "linkedin"),
        eq(contactIdentities.value, linkedinUrl),
      ),
    );
  if (email)
    idClauses.push(
      and(
        eq(contactIdentities.kind, "email"),
        eq(contactIdentities.value, email),
      ),
    );
  if (phone)
    idClauses.push(
      and(
        eq(contactIdentities.kind, "phone"),
        eq(contactIdentities.value, phone),
      ),
    );

  if (idClauses.length > 0) {
    const [hit] = await db
      .select({ contactId: contactIdentities.contactId })
      .from(contactIdentities)
      .where(idClauses.length === 1 ? idClauses[0] : or(...idClauses))
      .limit(1);
    if (hit) {
      const [c] = await db
        .select()
        .from(contacts)
        .where(eq(contacts.id, hit.contactId))
        .limit(1);
      if (c) return c;
    }
  }

  // 2) Fall back to the primary columns on contacts.
  const primaryClauses = [];
  if (linkedinUrl) primaryClauses.push(eq(contacts.linkedinUrl, linkedinUrl));
  if (email) primaryClauses.push(eq(contacts.email, email));
  if (primaryClauses.length === 0) return null;

  const [row] = await db
    .select()
    .from(contacts)
    .where(primaryClauses.length === 1 ? primaryClauses[0] : or(...primaryClauses))
    .limit(1);
  return row ?? null;
}

/**
 * Record an identity for a contact. Canonicalises first and no-ops if the
 * (kind, value) already exists (whoever it points at). We never reassign an
 * identity that already belongs to someone else.
 */
export async function upsertIdentity(
  contactId: string,
  kind: IdentityKind,
  value: string | null | undefined,
): Promise<void> {
  const canonical = canonicalIdentity(kind, value);
  if (!canonical) return;
  await db
    .insert(contactIdentities)
    .values({ contactId, kind, value: canonical })
    .onConflictDoNothing({
      target: [contactIdentities.kind, contactIdentities.value],
    });
}
