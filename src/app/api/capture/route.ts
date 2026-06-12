import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { db, captures } from "@/db";

// Receives profile snapshots from the Stacksquare Scout extension.
// Auth: per-person API keys (X-API-Key header) so every capture is
// attributed to whoever was browsing. Keys live only in Vercel env.

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
};

const Payload = z.object({
  linkedinUrl: z.string().url().max(500),
  name: z.string().min(1).max(300),
  role: z.string().max(300).optional().nullable(),
  company: z.string().max(300).optional().nullable(),
  city: z.string().max(300).optional().nullable(),
  headline: z.string().max(500).optional().nullable(),
  relationship: z.enum(["warm_1st", "warm_2nd", "cold"]).optional().nullable(),
  email: z.string().email().max(320).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  seniority: z.enum(["peer", "mid", "senior", "c_suite"]).optional().nullable(),
  // Raw snapshot: positions, education, links, parser metadata.
  payload: z.record(z.string(), z.unknown()).default({}),
});

function ownerForKey(key: string | null): "arif" | "kerem" | null {
  if (!key) return null;
  if (process.env.EXTENSION_KEY_ARIF && key === process.env.EXTENSION_KEY_ARIF)
    return "arif";
  if (
    process.env.EXTENSION_KEY_KEREM &&
    key === process.env.EXTENSION_KEY_KEREM
  )
    return "kerem";
  return null;
}

// Best-effort per-instance rate limit; a fresh serverless instance resets it,
// which is fine for a two-person tool.
const hits = new Map<string, { count: number; windowStart: number }>();
function rateLimited(owner: string): boolean {
  const now = Date.now();
  const h = hits.get(owner);
  if (!h || now - h.windowStart > 60_000) {
    hits.set(owner, { count: 1, windowStart: now });
    return false;
  }
  h.count += 1;
  return h.count > 30;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: Request) {
  const owner = ownerForKey(request.headers.get("x-api-key"));
  if (!owner) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: CORS_HEADERS },
    );
  }
  if (rateLimited(owner)) {
    return NextResponse.json(
      { error: "Slow down" },
      { status: 429, headers: CORS_HEADERS },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const parsed = Payload.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const p = parsed.data;
  const linkedinUrl = p.linkedinUrl.split("?")[0].replace(/\/$/, "");

  // One row per profile: re-capturing refreshes the snapshot. Status is
  // preserved so dismissed people stay dismissed and promoted stay promoted.
  const [row] = await db
    .insert(captures)
    .values({
      linkedinUrl,
      name: p.name,
      role: p.role ?? null,
      company: p.company ?? null,
      city: p.city ?? null,
      headline: p.headline ?? null,
      relationship: p.relationship ?? null,
      email: p.email ?? null,
      phone: p.phone ?? null,
      seniority: p.seniority ?? null,
      payload: p.payload,
      capturedBy: owner,
    })
    .onConflictDoUpdate({
      target: captures.linkedinUrl,
      set: {
        name: p.name,
        role: p.role ?? null,
        company: p.company ?? null,
        city: p.city ?? null,
        headline: p.headline ?? null,
        relationship: p.relationship ?? null,
        // Manual fields only overwrite when provided, so a later silent
        // auto-capture does not wipe an email typed into the panel.
        email: sql`coalesce(${p.email ?? null}, ${captures.email})`,
        phone: sql`coalesce(${p.phone ?? null}, ${captures.phone})`,
        seniority: sql`coalesce(${p.seniority ?? null}, ${captures.seniority})`,
        payload: p.payload,
        capturedBy: owner,
        capturedAt: sql`now()`,
      },
    })
    .returning({ id: captures.id, status: captures.status });

  return NextResponse.json(
    { id: row.id, status: row.status },
    { status: 201, headers: CORS_HEADERS },
  );
}
