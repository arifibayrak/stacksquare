"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { generateText, generateObject, stepCountIs } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { auth } from "@clerk/nextjs/server";
import {
  db,
  segments,
  prospects,
  segmentMembers,
  contacts,
  aiRuns,
  PROSPECT_ROLES,
  PROSPECT_TIERS,
  PROSPECT_STATUSES,
  SIGNAL_CONFIDENCES,
} from "@/db";
import { env } from "@/lib/env";
import { slugify } from "@/lib/utils";
import {
  canonicalLinkedin,
  normalizeEmail,
  findContactByIdentity,
} from "@/lib/contacts-dedup";
import { findProspectByIdentity } from "@/lib/research-dedup";

async function requireUser() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
}

function str(v: FormDataEntryValue | null): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

/**
 * Fill a prospect's blank LinkedIn from a later sighting. Guarded: if another
 * prospect already holds that canonical URL (the unique index would reject it),
 * leave the row as-is rather than throw.
 */
async function upgradeProspectLinkedin(prospectId: string, canonical: string) {
  const [clash] = await db
    .select({ id: prospects.id })
    .from(prospects)
    .where(eq(prospects.linkedinUrl, canonical));
  if (clash) return;
  await db
    .update(prospects)
    .set({ linkedinUrl: canonical, updatedAt: new Date() })
    .where(eq(prospects.id, prospectId));
}

// Best-effort usage capture for the Usage & cost page. Defensive: unknown
// shapes yield zeros rather than throwing.
function usageTokens(u: unknown): { inputTokens: number; outputTokens: number } {
  const uu = (u ?? {}) as { inputTokens?: number; outputTokens?: number };
  return { inputTokens: uu.inputTokens ?? 0, outputTokens: uu.outputTokens ?? 0 };
}

function countWebSearches(steps: unknown): number {
  if (!Array.isArray(steps)) return 0;
  let n = 0;
  for (const s of steps) {
    const calls = (s as { toolCalls?: unknown[] }).toolCalls;
    if (Array.isArray(calls)) {
      for (const c of calls) {
        if ((c as { toolName?: string }).toolName === "web_search") n++;
      }
    }
  }
  return n;
}

// ---------------------------------------------------------------------------
// Segments
// ---------------------------------------------------------------------------

const SegmentInput = z.object({
  name: z.string().min(1),
  description: z.string().nullable(),
  brief: z.string().nullable(),
});

export async function createSegment(formData: FormData) {
  await requireUser();
  const parsed = SegmentInput.parse({
    name: str(formData.get("name")) ?? "",
    description: str(formData.get("description")),
    brief: str(formData.get("brief")),
  });

  const slug = `${slugify(parsed.name) || "segment"}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;

  const [row] = await db
    .insert(segments)
    .values({
      name: parsed.name,
      slug,
      description: parsed.description,
      brief: parsed.brief,
    })
    .returning({ id: segments.id });

  revalidatePath("/admin/research");
  redirect(`/admin/research/${row.id}`);
}

// ---------------------------------------------------------------------------
// Seeds (no AI): paste names / companies / LinkedIn URLs, one per line
// ---------------------------------------------------------------------------

type ParsedSeed = {
  name: string;
  company: string | null;
  linkedinUrl: string | null;
  otherLink: string | null;
};

function parseSeedLine(line: string): ParsedSeed | null {
  const raw = line.trim();
  if (!raw) return null;

  const urlMatch = raw.match(/https?:\/\/\S+/i);
  const url = urlMatch ? urlMatch[0] : null;
  let rest = url ? raw.replace(url, "").trim() : raw;
  rest = rest.replace(/[|,·–—-]+$/, "").trim();

  let name = rest;
  let company: string | null = null;
  const sep = rest.match(/\s+(?:@|at|-|·|\|)\s+/i);
  if (sep && sep.index !== undefined) {
    name = rest.slice(0, sep.index).trim();
    company = rest.slice(sep.index + sep[0].length).trim() || null;
  }

  const linkedinUrl = url && /linkedin\.com/i.test(url) ? url : null;
  const otherLink = url && !linkedinUrl ? url : null;

  if (!name && linkedinUrl) {
    name =
      linkedinUrl
        .replace(/\/+$/, "")
        .split("/")
        .pop()
        ?.replace(/-/g, " ")
        .trim() || "Unknown";
  }
  if (!name) return null;
  return { name, company, linkedinUrl, otherLink };
}

export async function addSeedProspects(segmentId: string, raw: string) {
  await requireUser();
  const [seg] = await db
    .select({ id: segments.id })
    .from(segments)
    .where(eq(segments.id, segmentId));
  if (!seg) throw new Error("Segment not found");

  const lines = raw
    .split("\n")
    .map(parseSeedLine)
    .filter((l): l is ParsedSeed => l !== null);

  let added = 0;
  let linked = 0;

  for (const line of lines) {
    const canonical = canonicalLinkedin(line.linkedinUrl);

    // Dedupe by canonical LinkedIn or name + company so the same person is
    // never seeded twice.
    const existing = await findProspectByIdentity({
      linkedinUrl: line.linkedinUrl,
      name: line.name,
      company: line.company,
    });
    let prospectId: string;

    if (existing) {
      prospectId = existing.id;
      if (!existing.linkedinUrl && canonical) {
        await upgradeProspectLinkedin(existing.id, canonical);
      }
    } else {
      const [row] = await db
        .insert(prospects)
        .values({
          name: line.name,
          company: line.company,
          linkedinUrl: canonical,
          links: line.otherLink ? [line.otherLink] : [],
          discoveredVia: "seed",
          contactId: (await findContactByIdentity({ linkedinUrl: canonical }))?.id ?? null,
        })
        .returning({ id: prospects.id });
      prospectId = row.id;
      added++;
    }

    const res = await db
      .insert(segmentMembers)
      .values({ segmentId, prospectId, status: "discovered" })
      .onConflictDoNothing({
        target: [segmentMembers.segmentId, segmentMembers.prospectId],
      })
      .returning({ id: segmentMembers.id });
    if (res.length) linked++;
  }

  revalidatePath(`/admin/research/${segmentId}`);
  return { added, linked };
}

function blankToNull(v: string | undefined): string | null {
  const t = (v ?? "").trim();
  return t === "" ? null : t;
}

const ProspectEdit = z.object({
  name: z.string().min(1),
  title: z.string().nullable(),
  company: z.string().nullable(),
  city: z.string().nullable(),
  linkedinUrl: z.string().nullable(),
  email: z.string().nullable(),
  bio: z.string().nullable(),
  notes: z.string().nullable(),
  roles: z.array(z.enum(PROSPECT_ROLES)),
});

/** Manually correct a prospect's fields from the detail page. */
export async function updateProspect(
  prospectId: string,
  raw: Record<string, string>,
) {
  await requireUser();
  const roles = (raw.roles ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((r) => (PROSPECT_ROLES as readonly string[]).includes(r));

  const parsed = ProspectEdit.parse({
    name: (raw.name ?? "").trim(),
    title: blankToNull(raw.title),
    company: blankToNull(raw.company),
    city: blankToNull(raw.city),
    linkedinUrl: blankToNull(raw.linkedinUrl),
    email: blankToNull(raw.email),
    bio: blankToNull(raw.bio),
    notes: blankToNull(raw.notes),
    roles,
  });

  await db
    .update(prospects)
    .set({
      name: parsed.name,
      title: parsed.title,
      company: parsed.company,
      city: parsed.city,
      linkedinUrl: canonicalLinkedin(parsed.linkedinUrl),
      email: parsed.email,
      bio: parsed.bio,
      notes: parsed.notes,
      roles: parsed.roles,
      updatedAt: new Date(),
    })
    .where(eq(prospects.id, prospectId));

  const mems = await db
    .select({ segmentId: segmentMembers.segmentId })
    .from(segmentMembers)
    .where(eq(segmentMembers.prospectId, prospectId));
  for (const m of mems) revalidatePath(`/admin/research/${m.segmentId}`);
  revalidatePath("/admin/research");
}

// ---------------------------------------------------------------------------
// Discovery agent (web_search) — precision-first, human-review gate
// ---------------------------------------------------------------------------

// Structured-output fields are all nullable: the extraction pass fills what the
// research found and leaves the rest null, so one thin candidate can't fail the
// whole parse. The precision gate (require a sourceUrl) is enforced in code.
const DiscoverCandidate = z.object({
  name: z.string(),
  title: z.string().nullable(),
  company: z.string().nullable(),
  city: z.string().nullable(),
  linkedinUrl: z.string().nullable(),
  links: z.array(z.string()).nullable(),
  email: z.string().nullable(),
  emailConfidence: z.enum(SIGNAL_CONFIDENCES).nullable(),
  bio: z.string().nullable(),
  originSignal: z.enum(SIGNAL_CONFIDENCES).nullable(),
  locationSignal: z.enum(SIGNAL_CONFIDENCES).nullable(),
  sourceUrl: z.string().nullable(),
  suggestedRoles: z.array(z.enum(PROSPECT_ROLES)).nullable(),
  suggestedTier: z.enum(PROSPECT_TIERS).nullable(),
});

const DiscoverOut = z.object({ candidates: z.array(DiscoverCandidate) });

// Selectable, per-run search criteria. Everything is optional; whatever is set
// sharpens the search, and the segment's brief fills the rest.
const DiscoverParams = z.object({
  location: z.string().trim().nullish(),
  origin: z.string().trim().nullish(),
  roles: z.array(z.enum(PROSPECT_ROLES)).nullish(),
  keywords: z.string().trim().nullish(),
  count: z.coerce.number().int().min(1).max(30).nullish(),
});
export type DiscoverParamsInput = z.input<typeof DiscoverParams>;

// Phase 1: web research (tools, free-form text). Phase 2 extracts structure.
// Anthropic's server-side web_search tool and forced structured output do not
// mix reliably in a single call ("No object generated"), so we split them.
const DISCOVER_RESEARCH_SYSTEM =
  "You are a market-intelligence research assistant for StackSquare, an events " +
  "organisation, building a curated map of a specific group of people. Use web " +
  "search over public sources (Crunchbase, Dealroom, Sifted, company team/about " +
  "pages, accelerator cohort pages, conference speaker lists, reputable news) to " +
  "find REAL, currently-active people who match the target below. For each " +
  "person, write their name, title, company, LinkedIn URL, a public SOURCE URL " +
  "that verifies them, a one-line bio, evidence about their origin/heritage, and " +
  "their CURRENT city. VERIFY the current city primarily from their LinkedIn " +
  "profile location, which is the single most reliable signal; corroborate with " +
  "company HQ and recent public activity. If a target location is given, only " +
  "include people whose LinkedIn (or equally strong public evidence) places them " +
  "living/working there NOW; exclude people who merely have past ties, a company " +
  "office there, or are based in another city. State each person's location " +
  "evidence explicitly. Never invent people or emails; only give a business " +
  "email if publicly published. Prefer PRECISION over recall: a shorter, " +
  "correctly-located list beats plausible guesses. Write findings as a clear list.";

const DISCOVER_EXTRACT_SYSTEM =
  "Extract structured candidates from the research notes. Return one entry per " +
  "real person the notes describe. Only include a person if the notes give a " +
  "public source URL for them. Use null for any field the notes do not support; " +
  "never invent data (especially emails). originSignal = how strongly the notes " +
  "match the target origin/heritage. locationSignal = how strongly the notes " +
  "place the person CURRENTLY in the target location: set it to high or medium " +
  "ONLY when the person's LinkedIn profile location (or equally strong public " +
  "evidence) shows they are based there now; set it to low if their current city " +
  "is elsewhere or unclear, even if they have past ties or a company office " +
  "there. Judge both signals honestly. suggestedTier: a = clear high-signal " +
  "match, b = solid fit, c = adjacent / peripheral.";

export async function discoverProspects(
  segmentId: string,
  params?: DiscoverParamsInput,
) {
  await requireUser();
  const [seg] = await db
    .select()
    .from(segments)
    .where(eq(segments.id, segmentId));
  if (!seg) throw new Error("Segment not found");

  const p = DiscoverParams.parse(params ?? {});
  const count = p.count ?? 12;
  const promptBrief = [
    `Database: ${seg.name}`,
    seg.description && `Description: ${seg.description}`,
    seg.brief && `Brief: ${seg.brief}`,
    p.roles?.length && `Who (roles): ${p.roles.join(", ")}`,
    p.keywords && `Who (titles/keywords): ${p.keywords}`,
    p.origin && `Origin / heritage: ${p.origin}`,
    p.location && `Location: they should currently be based in ${p.location}`,
    `Return up to ${count} people.`,
  ]
    .filter(Boolean)
    .join("\n");

  const model = env.modelFast();
  let tokensIn = 0;
  let tokensOut = 0;
  let webSearches = 0;

  // Phase 1: research the open web, free-form.
  let notes = "";
  try {
    const research = await generateText({
      model: anthropic(model),
      tools: {
        web_search: anthropic.tools.webSearch_20250305({ maxUses: 8 }),
      },
      stopWhen: stepCountIs(12),
      system: DISCOVER_RESEARCH_SYSTEM,
      prompt: `Research the public web and compile a list of real people who match this target:\n${promptBrief}`,
    });
    notes = research.text?.trim() ?? "";
    const u = usageTokens(research.totalUsage);
    tokensIn += u.inputTokens;
    tokensOut += u.outputTokens;
    webSearches += countWebSearches(research.steps);
    if (!notes) throw new Error("web search returned no usable text");
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    await db.insert(aiRuns).values({
      kind: "discover_prospects",
      input: { segmentId, brief: promptBrief, phase: "research" },
      model,
      errorMessage: message,
    });
    throw new Error(`Discovery search failed: ${message}`);
  }

  // Phase 2: extract structured candidates from the research notes (no tools).
  let candidates: z.infer<typeof DiscoverCandidate>[];
  try {
    const extracted = await generateObject({
      model: anthropic(model),
      schema: DiscoverOut,
      system: DISCOVER_EXTRACT_SYSTEM,
      prompt: `Target criteria:\n${promptBrief}\n\nResearch notes:\n\n${notes}\n\nReturn every real person from these notes as a structured candidate.`,
    });
    candidates = extracted.object.candidates;
    const u = usageTokens(extracted.usage);
    tokensIn += u.inputTokens;
    tokensOut += u.outputTokens;
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    await db.insert(aiRuns).values({
      kind: "discover_prospects",
      input: { segmentId, brief: promptBrief, phase: "extract", notes },
      model,
      errorMessage: message,
    });
    throw new Error(`Discovery parse failed: ${message}`);
  }

  // Precision gate. Always require a name + verifiable public source URL. When a
  // target location was specified, also require a medium+ location signal, so we
  // only keep people who can actually be placed there (LinkedIn-verified) rather
  // than people with mere ties. With no location set, keep all and surface the
  // signal for manual review.
  const locationRequired = Boolean(p.location);
  const usable = candidates.filter(
    (c) =>
      c.name &&
      c.sourceUrl &&
      (!locationRequired ||
        c.locationSignal === "high" ||
        c.locationSignal === "medium"),
  );
  const dropped = candidates.length - usable.length;

  let added = 0;
  let linked = 0;

  for (const cand of usable) {
    const canonical = canonicalLinkedin(cand.linkedinUrl);

    // Dedupe by canonical LinkedIn or name + company. Both keys are checked
    // even when the candidate has a LinkedIn, so a guessed/variant slug for a
    // person we already found collapses onto the existing prospect.
    const existing = await findProspectByIdentity({
      linkedinUrl: cand.linkedinUrl,
      name: cand.name,
      company: cand.company,
    });
    let prospectId: string;

    if (existing) {
      prospectId = existing.id;
      if (!existing.linkedinUrl && canonical) {
        await upgradeProspectLinkedin(existing.id, canonical);
      }
    } else {
      // Cross-reference the CRM: someone already a contact is linked, never
      // re-created as a fresh unlinked research entry.
      const contact = await findContactByIdentity({
        linkedinUrl: canonical,
        email: cand.email,
      });
      const [row] = await db
        .insert(prospects)
        .values({
          name: cand.name,
          title: cand.title,
          company: cand.company,
          city: cand.city,
          linkedinUrl: canonical,
          links: cand.links ?? [],
          email: cand.email,
          emailConfidence: cand.emailConfidence,
          roles: cand.suggestedRoles ?? [],
          bio: cand.bio,
          discoveredVia: "web_search",
          sourceUrl: cand.sourceUrl,
          originSignal: cand.originSignal,
          locationSignal: cand.locationSignal,
          contactId: contact?.id ?? null,
        })
        .returning({ id: prospects.id });
      prospectId = row.id;
      added++;
    }

    const res = await db
      .insert(segmentMembers)
      .values({
        segmentId,
        prospectId,
        status: "discovered",
        tier: cand.suggestedTier,
      })
      .onConflictDoNothing({
        target: [segmentMembers.segmentId, segmentMembers.prospectId],
      })
      .returning({ id: segmentMembers.id });
    if (res.length) linked++;
  }

  await db.insert(aiRuns).values({
    kind: "discover_prospects",
    input: { segmentId, brief: promptBrief },
    output: {
      count: candidates.length,
      usable: usable.length,
      dropped,
      added,
      linked,
      webSearches,
    },
    model,
    tokensIn,
    tokensOut,
  });

  revalidatePath(`/admin/research/${segmentId}`);
  return { found: usable.length, dropped, added, linked };
}

// ---------------------------------------------------------------------------
// Enrich one prospect (web_search) — fill only blanks, append sourced note
// ---------------------------------------------------------------------------

const EnrichOut = z.object({
  email: z.string().nullable(),
  emailConfidence: z.enum(SIGNAL_CONFIDENCES).nullable(),
  title: z.string().nullable(),
  company: z.string().nullable(),
  city: z.string().nullable(),
  links: z.array(z.string()).nullable(),
  bio: z.string().nullable(),
  originSignal: z.enum(SIGNAL_CONFIDENCES).nullable(),
  locationSignal: z.enum(SIGNAL_CONFIDENCES).nullable(),
  summary: z.string().nullable(),
});

const ENRICH_RESEARCH_SYSTEM =
  "You are a research assistant enriching ONE person in a market map. Use public " +
  "web search to verify and report their current title, company, city, a 1-2 " +
  "sentence public professional bio, public links, and (only if publicly " +
  "published by them or their company) a business email. Note any evidence about " +
  "their origin/heritage and where they are currently based. Cross-check that " +
  "results refer to the SAME person (match name + company/role). Never invent " +
  "data. Write your findings as clear notes, citing where each fact came from.";

const ENRICH_EXTRACT_SYSTEM =
  "Extract structured fields for this one person from the research notes. Use " +
  "null for anything the notes do not support; never invent data. Include an " +
  "email ONLY if the notes show it was publicly published. originSignal / " +
  "locationSignal reflect how strongly the notes support the person's " +
  "origin/heritage and current location. summary: 2-3 sentences on what was " +
  "found and from where.";

export async function enrichProspect(prospectId: string) {
  await requireUser();
  const [p] = await db
    .select()
    .from(prospects)
    .where(eq(prospects.id, prospectId));
  if (!p) throw new Error("Prospect not found");

  const profile = [
    `Name: ${p.name}`,
    p.title && `Title: ${p.title}`,
    p.company && `Company: ${p.company}`,
    p.city && `Location: ${p.city}`,
    p.linkedinUrl && `LinkedIn: ${p.linkedinUrl}`,
    p.sourceUrl && `Source: ${p.sourceUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  const model = env.modelFast();
  let tokensIn = 0;
  let tokensOut = 0;
  let webSearches = 0;

  // Phase 1: research the open web, free-form.
  let notes = "";
  try {
    const research = await generateText({
      model: anthropic(model),
      tools: {
        web_search: anthropic.tools.webSearch_20250305({ maxUses: 5 }),
      },
      stopWhen: stepCountIs(8),
      system: ENRICH_RESEARCH_SYSTEM,
      prompt: `Research this person for a market map and report what you find:\n${profile}`,
    });
    notes = research.text?.trim() ?? "";
    const u = usageTokens(research.totalUsage);
    tokensIn += u.inputTokens;
    tokensOut += u.outputTokens;
    webSearches += countWebSearches(research.steps);
    if (!notes) throw new Error("web search returned no usable text");
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    await db.insert(aiRuns).values({
      kind: "enrich_prospect",
      contactId: p.contactId ?? null,
      input: { prospectId, profile, phase: "research" },
      model,
      errorMessage: message,
    });
    throw new Error(`Enrichment search failed: ${message}`);
  }

  // Phase 2: extract structured fields from the research notes (no tools).
  let out: z.infer<typeof EnrichOut>;
  try {
    const extracted = await generateObject({
      model: anthropic(model),
      schema: EnrichOut,
      system: ENRICH_EXTRACT_SYSTEM,
      prompt: `Person:\n${profile}\n\nResearch notes:\n${notes}\n\nExtract the structured fields.`,
    });
    out = extracted.object;
    const u = usageTokens(extracted.usage);
    tokensIn += u.inputTokens;
    tokensOut += u.outputTokens;
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    await db.insert(aiRuns).values({
      kind: "enrich_prospect",
      contactId: p.contactId ?? null,
      input: { prospectId, profile, phase: "extract", notes },
      model,
      errorMessage: message,
    });
    throw new Error(`Enrichment parse failed: ${message}`);
  }

  const outLinks = out.links ?? [];
  const links = Array.from(new Set([...(p.links ?? []), ...outLinks]));
  const summary = out.summary ?? notes.slice(0, 280);
  const noteLine = `Enrichment (${new Date().toISOString().slice(0, 10)}): ${summary}${
    outLinks.length ? `\nLinks: ${outLinks.join(", ")}` : ""
  }`;

  await db
    .update(prospects)
    .set({
      title: p.title ?? out.title ?? null,
      company: p.company ?? out.company ?? null,
      city: p.city ?? out.city ?? null,
      email: p.email ?? out.email ?? null,
      emailConfidence: p.emailConfidence ?? out.emailConfidence ?? null,
      originSignal: p.originSignal ?? out.originSignal ?? null,
      locationSignal: p.locationSignal ?? out.locationSignal ?? null,
      bio: p.bio ?? out.bio ?? null,
      links,
      notes: p.notes ? `${p.notes}\n\n${noteLine}` : noteLine,
      enrichedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(prospects.id, prospectId));

  // Bump this person's still-"discovered" memberships to "enriched".
  await db
    .update(segmentMembers)
    .set({ status: "enriched" })
    .where(
      and(
        eq(segmentMembers.prospectId, prospectId),
        eq(segmentMembers.status, "discovered"),
      ),
    );

  await db.insert(aiRuns).values({
    kind: "enrich_prospect",
    contactId: p.contactId ?? null,
    input: { prospectId, profile },
    output: { ...out, webSearches },
    model,
    tokensIn,
    tokensOut,
  });

  const mems = await db
    .select({ segmentId: segmentMembers.segmentId })
    .from(segmentMembers)
    .where(eq(segmentMembers.prospectId, prospectId));
  for (const m of mems) revalidatePath(`/admin/research/${m.segmentId}`);
  revalidatePath("/admin/research");
  return out;
}

// ---------------------------------------------------------------------------
// Per-map judgments (tier / status) — live on segment_members
// ---------------------------------------------------------------------------

async function revalidateMemberSegment(memberId: string) {
  const [m] = await db
    .select({ segmentId: segmentMembers.segmentId })
    .from(segmentMembers)
    .where(eq(segmentMembers.id, memberId));
  if (m) revalidatePath(`/admin/research/${m.segmentId}`);
}

export async function setProspectTier(memberId: string, tier: string) {
  await requireUser();
  const parsed = z
    .enum(PROSPECT_TIERS)
    .nullable()
    .parse(tier === "" ? null : tier);
  await db
    .update(segmentMembers)
    .set({ tier: parsed })
    .where(eq(segmentMembers.id, memberId));
  await revalidateMemberSegment(memberId);
}

export async function setSegmentMemberStatus(memberId: string, status: string) {
  await requireUser();
  const parsed = z.enum(PROSPECT_STATUSES).parse(status);
  await db
    .update(segmentMembers)
    .set({ status: parsed })
    .where(eq(segmentMembers.id, memberId));
  await revalidateMemberSegment(memberId);
}

export async function dismissProspect(memberId: string) {
  await requireUser();
  await db
    .update(segmentMembers)
    .set({ status: "dismissed" })
    .where(eq(segmentMembers.id, memberId));
  await revalidateMemberSegment(memberId);
}

/**
 * Global do-not-contact: mark every membership dismissed and record the reason
 * on the prospect. Use for GDPR objections / bad data across all maps.
 */
export async function dismissProspectGlobal(prospectId: string, reason?: string) {
  await requireUser();
  const [p] = await db
    .select({ notes: prospects.notes })
    .from(prospects)
    .where(eq(prospects.id, prospectId));
  if (!p) throw new Error("Prospect not found");

  const noteLine = `Do-not-contact (${new Date()
    .toISOString()
    .slice(0, 10)})${reason ? `: ${reason}` : ""}`;

  await db
    .update(prospects)
    .set({
      notes: p.notes ? `${p.notes}\n\n${noteLine}` : noteLine,
      updatedAt: new Date(),
    })
    .where(eq(prospects.id, prospectId));

  const mems = await db
    .select({ segmentId: segmentMembers.segmentId })
    .from(segmentMembers)
    .where(eq(segmentMembers.prospectId, prospectId));
  await db
    .update(segmentMembers)
    .set({ status: "dismissed" })
    .where(eq(segmentMembers.prospectId, prospectId));
  for (const m of mems) revalidatePath(`/admin/research/${m.segmentId}`);
}

// ---------------------------------------------------------------------------
// Promotion — the ONLY path a prospect becomes a warm contact
// ---------------------------------------------------------------------------

/**
 * Promote a prospect into the CRM. If a contact already exists for the same
 * LinkedIn URL we link to it (filling blank fields) instead of duplicating.
 * Stamps source = "research:<slug>" so promoted contacts are always traceable.
 */
export async function promoteProspect(memberId: string) {
  await requireUser();
  const [m] = await db
    .select()
    .from(segmentMembers)
    .where(eq(segmentMembers.id, memberId));
  if (!m) throw new Error("Membership not found");
  const [p] = await db
    .select()
    .from(prospects)
    .where(eq(prospects.id, m.prospectId));
  if (!p) throw new Error("Prospect not found");
  const [seg] = await db
    .select()
    .from(segments)
    .where(eq(segments.id, m.segmentId));

  // Dedupe by canonical LinkedIn or email so promoting never creates a second
  // contact for someone already in the CRM.
  const email = normalizeEmail(p.email);
  const existing = await findContactByIdentity({
    linkedinUrl: p.linkedinUrl,
    email,
  });

  const source = `research:${seg?.slug ?? "segment"}`;
  const noteParts = [
    p.bio ?? "",
    p.sourceUrl ? `Source: ${p.sourceUrl}` : "",
    p.notes ?? "",
    `Promoted from Research: ${seg?.name ?? ""} (${new Date()
      .toISOString()
      .slice(0, 10)})`,
  ].filter(Boolean);
  const notes = noteParts.join("\n") || null;

  let contactId: string;
  if (existing) {
    await db
      .update(contacts)
      .set({
        role: existing.role ?? p.title,
        company: existing.company ?? p.company,
        city: existing.city ?? p.city,
        linkedinUrl: existing.linkedinUrl ?? canonicalLinkedin(p.linkedinUrl),
        email: existing.email ?? email,
        expertise: existing.expertise?.length ? existing.expertise : p.roles,
        notes: existing.notes ?? notes,
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, existing.id));
    contactId = existing.id;
  } else {
    const [row] = await db
      .insert(contacts)
      .values({
        name: p.name,
        role: p.title,
        company: p.company,
        city: p.city,
        linkedinUrl: canonicalLinkedin(p.linkedinUrl),
        email,
        expertise: p.roles,
        circle: "reach",
        stage: "identified",
        source,
        notes,
      })
      .returning({ id: contacts.id });
    contactId = row.id;
  }

  await db
    .update(prospects)
    .set({ contactId, promotedAt: new Date(), updatedAt: new Date() })
    .where(eq(prospects.id, p.id));
  await db
    .update(segmentMembers)
    .set({ status: "promoted" })
    .where(eq(segmentMembers.id, memberId));

  revalidatePath(`/admin/research/${m.segmentId}`);
  revalidatePath(`/admin/research/${m.segmentId}/${memberId}`);
  revalidatePath("/admin/contacts");
  revalidatePath("/admin/pipeline");
  return { contactId, linked: Boolean(existing) };
}
