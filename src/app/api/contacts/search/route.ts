import { NextResponse } from "next/server";
import { or, ilike } from "drizzle-orm";
import { db, contacts } from "@/db";
import { CORS_HEADERS, ownerForKey } from "@/lib/extension-auth";

// Contact typeahead for the Stacksquare Scout extension's "Log a conversation"
// picker. Auth: per-founder X-API-Key (same as /api/capture). Returns only the
// fields the picker shows; no CRM internals (fit scores, notes, stage).

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: Request) {
  const owner = ownerForKey(request.headers.get("x-api-key"));
  if (!owner) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: CORS_HEADERS },
    );
  }

  const q = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ contacts: [] }, { headers: CORS_HEADERS });
  }

  const like = `%${q}%`;
  const rows = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      company: contacts.company,
      role: contacts.role,
    })
    .from(contacts)
    .where(
      or(
        ilike(contacts.name, like),
        ilike(contacts.company, like),
        ilike(contacts.email, like),
        ilike(contacts.linkedinUrl, like),
      ),
    )
    .orderBy(contacts.name)
    .limit(10);

  return NextResponse.json({ contacts: rows }, { headers: CORS_HEADERS });
}
