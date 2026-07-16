import { NextResponse } from "next/server";
import { and, asc, eq, or } from "drizzle-orm";
import {
  db,
  captures,
  contacts,
  prospects,
  segments,
  segmentMembers,
} from "@/db";
import { CORS_HEADERS, ownerForKey } from "@/lib/extension-auth";
import {
  canonicalLinkedin,
  findContactByIdentity,
  normalizeEmail,
} from "@/lib/contacts-dedup";
import { findProspectByIdentity } from "@/lib/research-dedup";

// Proactive CRM-presence check for the Stacksquare Scout extension. Given the
// LinkedIn profile on screen, tells the panel whether we already know this
// person BEFORE they file them, so the founder never re-adds a duplicate. Auth
// is the same per-founder X-API-Key as /api/capture and /api/segments.
//
// Read-only. Returns a strict whitelist: contact {id,name,stage}, prospect
// {id,name,matchedBy}, the non-archived lists they belong to, and their Scout
// queue status. Unlike /api/contacts/search this DOES surface `stage`, on
// purpose: showing pipeline stage is the point of the presence badge, and this
// is the founders' own key. No fit scores, notes, email, phone, or tier leak.

const RESPONSE_HEADERS = { ...CORS_HEADERS, "Cache-Control": "no-store" };

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: Request) {
  const owner = ownerForKey(request.headers.get("x-api-key"));
  if (!owner) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: RESPONSE_HEADERS },
    );
  }

  const params = new URL(request.url).searchParams;
  const rawUrl = params.get("linkedinUrl") ?? "";
  const name = params.get("name") ?? null;
  const company = params.get("company") ?? null;
  const email = normalizeEmail(params.get("email"));
  const canonical = canonicalLinkedin(rawUrl);

  const empty = {
    contact: null as null | { id: string; name: string; stage: string },
    prospect: null as
      | null
      | { id: string; name: string; matchedBy: "linkedin" | "name_company" },
    lists: [] as { id: string; name: string; status: string }[],
    capture: null as null | { status: string },
  };

  // Nothing to match on: render "New" without any client branching.
  if (!canonical && !(name && company) && !email) {
    return NextResponse.json(empty, { headers: RESPONSE_HEADERS });
  }

  // The person, at the research (prospect) layer. Matches canonical LinkedIn OR
  // name + company, mirroring exactly what a Send would hit.
  const prospect = await findProspectByIdentity({
    linkedinUrl: rawUrl,
    name,
    company,
  });

  // The contact, by identity, with the prospect -> contact promotion bridge so
  // a promoted person shows as a contact even when the contact row lacks a
  // LinkedIn URL of its own.
  let contact = await findContactByIdentity({ linkedinUrl: rawUrl, email });
  if (!contact && prospect?.contactId) {
    const [row] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, prospect.contactId))
      .limit(1);
    contact = row ?? null;
  }

  // The non-archived lists (segments) this prospect belongs to.
  const lists = prospect
    ? await db
        .select({
          id: segments.id,
          name: segments.name,
          status: segmentMembers.status,
        })
        .from(segmentMembers)
        .innerJoin(segments, eq(segmentMembers.segmentId, segments.id))
        .where(
          and(
            eq(segmentMembers.prospectId, prospect.id),
            eq(segments.archived, false),
          ),
        )
        .orderBy(asc(segments.name))
    : [];

  // Scout queue status. captures.linkedin_url is stored non-canonically (keeps
  // `www.`, see /api/capture), so check both the cleaned form the extension
  // sends and the canonical form, or we would silently never match the queue.
  const cleaned = rawUrl.split("?")[0].split("#")[0].replace(/\/$/, "");
  let capture: { status: string } | null = null;
  if (cleaned || canonical) {
    const clauses = [];
    if (cleaned) clauses.push(eq(captures.linkedinUrl, cleaned));
    if (canonical && canonical !== cleaned)
      clauses.push(eq(captures.linkedinUrl, canonical));
    if (clauses.length) {
      const [row] = await db
        .select({ status: captures.status })
        .from(captures)
        .where(clauses.length === 1 ? clauses[0] : or(...clauses))
        .limit(1);
      capture = row ?? null;
    }
  }

  return NextResponse.json(
    {
      contact: contact
        ? { id: contact.id, name: contact.name, stage: contact.stage }
        : null,
      prospect: prospect
        ? {
            id: prospect.id,
            name: prospect.name,
            matchedBy:
              canonical && prospect.linkedinUrl === canonical
                ? "linkedin"
                : "name_company",
          }
        : null,
      lists,
      capture,
    },
    { headers: RESPONSE_HEADERS },
  );
}
