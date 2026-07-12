import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  db,
  captures,
  segments,
  prospects,
  segmentMembers,
} from "@/db";
import { env } from "@/lib/env";
import { CORS_HEADERS, ownerForKey, type CaptureOwner } from "@/lib/extension-auth";
import { canonicalLinkedin, findContactByIdentity } from "@/lib/contacts-dedup";
import { findProspectByIdentity } from "@/lib/research-dedup";

// Receives profile snapshots from the Stacksquare Scout extension.
// Auth: per-person API keys (X-API-Key header) so every capture is
// attributed to whoever was browsing. Keys live only in Vercel env.
//
// Two destinations, chosen by the extension's List picker:
//   - No list  -> the generic Scout queue (`captures`), triaged in /admin/scout.
//   - A list   -> that Research segment (a "database list", e.g. "Turkish
//     founders in London"): the person is upserted as a prospect and added as a
//     `discovered` member, landing in the segment's Research page for review.

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
  // Target Research list (segment) id. Null / omitted -> generic Scout queue.
  segmentId: z.string().uuid().optional().nullable(),
  // Raw snapshot: positions, education, links, parser metadata.
  payload: z.record(z.string(), z.unknown()).default({}),
  // Visible page text; the server extracts missing fields from it with AI,
  // which survives any LinkedIn DOM reshuffle.
  pageText: z.string().max(40000).optional().nullable(),
});

const Extracted = z.object({
  name: z.string().nullable(),
  role: z.string().nullable(),
  company: z.string().nullable(),
  city: z.string().nullable(),
  headline: z.string().nullable(),
});

async function aiExtract(pageText: string) {
  const { output } = await generateText({
    model: anthropic(env.modelFast()),
    output: Output.object({ schema: Extracted }),
    system:
      "You extract CRM fields from the visible text of a LinkedIn profile page. " +
      "Return the profile owner's full name, their current primary role title, " +
      "the company of that role, and their city/location (short form, e.g. 'London'). " +
      "headline is the short tagline under their name. " +
      "Prefer the most recent position marked Present. Ignore navigation text, " +
      "ads, 'people also viewed', and any profiles other than the page owner. " +
      "Use null when a field is genuinely absent.",
    prompt: pageText,
  });
  return output;
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

type CaptureFields = {
  linkedinUrl: string;
  name: string;
  role: string | null;
  company: string | null;
  city: string | null;
  headline: string | null;
  email: string | null;
  phone: string | null;
};

/**
 * File a scouted profile into a Research segment: upsert the person as a
 * prospect (deduped by canonical LinkedIn or name + company, mirroring
 * `addSeedProspects`), then add them as a `discovered` member of the segment.
 * Re-scouting fills any blanks and is a no-op on the membership.
 */
async function queueToSegment(
  segmentId: string,
  f: CaptureFields,
  owner: CaptureOwner,
) {
  const [seg] = await db
    .select({ id: segments.id, name: segments.name })
    .from(segments)
    .where(eq(segments.id, segmentId));
  if (!seg) return null;

  const canonical = canonicalLinkedin(f.linkedinUrl);
  const today = new Date().toISOString().slice(0, 10);
  const who = owner === "arif" ? "Arif" : "Kerem";
  const scoutNote = `Scouted by ${who} on ${today}`;
  const notes = [scoutNote, f.phone ? `Phone: ${f.phone}` : ""]
    .filter(Boolean)
    .join("\n");

  const existing = await findProspectByIdentity({
    linkedinUrl: f.linkedinUrl,
    name: f.name,
    company: f.company,
  });

  let prospectId: string;
  let added = false;
  if (existing) {
    prospectId = existing.id;
    // Fill blanks from this sighting without clobbering existing values.
    await db
      .update(prospects)
      .set({
        title: existing.title ?? f.role,
        company: existing.company ?? f.company,
        city: existing.city ?? f.city,
        email: existing.email ?? f.email,
        bio: existing.bio ?? f.headline,
        updatedAt: new Date(),
      })
      .where(eq(prospects.id, existing.id));
    // Backfill a missing LinkedIn only if no other prospect already holds that
    // canonical URL (the unique index would otherwise reject the write).
    if (!existing.linkedinUrl && canonical) {
      const [clash] = await db
        .select({ id: prospects.id })
        .from(prospects)
        .where(eq(prospects.linkedinUrl, canonical));
      if (!clash) {
        await db
          .update(prospects)
          .set({ linkedinUrl: canonical, updatedAt: new Date() })
          .where(eq(prospects.id, existing.id));
      }
    }
  } else {
    const linkedContact = await findContactByIdentity({
      linkedinUrl: canonical,
      email: f.email,
    });
    const [row] = await db
      .insert(prospects)
      .values({
        name: f.name,
        title: f.role,
        company: f.company,
        city: f.city,
        linkedinUrl: canonical,
        email: f.email,
        bio: f.headline,
        discoveredVia: "scout",
        contactId: linkedContact?.id ?? null,
        notes,
      })
      .returning({ id: prospects.id });
    prospectId = row.id;
    added = true;
  }

  const [member] = await db
    .insert(segmentMembers)
    .values({ segmentId, prospectId, status: "discovered", note: scoutNote })
    .onConflictDoNothing({
      target: [segmentMembers.segmentId, segmentMembers.prospectId],
    })
    .returning({ id: segmentMembers.id });

  return {
    segment: seg,
    prospectId,
    added,
    linked: Boolean(member), // false when already a member of this list
  };
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

  // Client parser comes first; AI fills whatever it missed.
  let aiUsed = false;
  if (p.pageText && (!p.role || !p.company || !p.city)) {
    try {
      const x = await aiExtract(p.pageText);
      p.name = p.name || x.name || p.name;
      p.role = p.role ?? x.role;
      p.company = p.company ?? x.company;
      p.city = p.city ?? x.city;
      p.headline = p.headline ?? x.headline;
      aiUsed = true;
    } catch (err) {
      console.error("[capture] ai extract failed", err);
    }
  }

  // A list was chosen: file straight into that Research segment.
  if (p.segmentId) {
    const routed = await queueToSegment(
      p.segmentId,
      {
        linkedinUrl,
        name: p.name,
        role: p.role ?? null,
        company: p.company ?? null,
        city: p.city ?? null,
        headline: p.headline ?? null,
        email: p.email ?? null,
        phone: p.phone ?? null,
      },
      owner,
    );
    if (routed) {
      return NextResponse.json(
        {
          destination: "segment",
          segment: routed.segment,
          prospectId: routed.prospectId,
          added: routed.added,
          linked: routed.linked,
        },
        { status: 201, headers: CORS_HEADERS },
      );
    }
    // Unknown segment id: fall through to the generic queue so nothing is lost.
  }

  const payload = { ...p.payload, aiExtracted: aiUsed };

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
      payload,
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
        payload,
        capturedBy: owner,
        capturedAt: sql`now()`,
      },
    })
    .returning({ id: captures.id, status: captures.status });

  return NextResponse.json(
    { destination: "queue", id: row.id, status: row.status },
    { status: 201, headers: CORS_HEADERS },
  );
}
