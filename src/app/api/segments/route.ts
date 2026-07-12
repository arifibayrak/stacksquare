import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db, segments } from "@/db";
import { CORS_HEADERS, ownerForKey } from "@/lib/extension-auth";

// Lists the Scout extension can file captures into. These are the Research
// "database lists" (segments), e.g. "Turkish founders in London". Read-only,
// authed by the same per-person API key as /api/capture. Only non-archived
// segments are offered so the extension picker stays current.

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

  const rows = await db
    .select({ id: segments.id, name: segments.name, slug: segments.slug })
    .from(segments)
    .where(eq(segments.archived, false))
    .orderBy(asc(segments.name));

  return NextResponse.json({ lists: rows }, { headers: CORS_HEADERS });
}
