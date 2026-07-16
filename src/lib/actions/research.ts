"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, max } from "drizzle-orm";
import { z } from "zod";
import { generateText, generateObject, stepCountIs } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { auth } from "@clerk/nextjs/server";
import {
  db,
  segments,
  prospects,
  segmentMembers,
  discoveryRuns,
  contacts,
  aiRuns,
  PROSPECT_ROLES,
  PROSPECT_ROLE_LABELS,
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

type DiscoverP = z.infer<typeof DiscoverParams>;

// Human label for a run, built from its params, e.g. "Founder, CTO in London
// (Turkish)". Falls back to a broad label when nothing narrowing is set.
function discoveryLabel(p: DiscoverP): string {
  const who =
    p.roles?.map((r) => PROSPECT_ROLE_LABELS[r]).join(", ") ||
    p.keywords ||
    "People";
  const parts = [who];
  if (p.location) parts.push(`in ${p.location}`);
  if (p.origin) parts.push(`(${p.origin})`);
  return parts.join(" ").trim() || "Broad search";
}

// Count candidates by a signal field for the qualitative post-search summary.
function signalBreakdown(
  items: { originSignal: string | null; locationSignal: string | null }[],
) {
  const tally = (key: "originSignal" | "locationSignal") => {
    const out = { high: 0, medium: 0, low: 0 };
    for (const it of items) {
      const v = it[key];
      if (v === "high" || v === "medium" || v === "low") out[v]++;
    }
    return out;
  };
  return { byOrigin: tally("originSignal"), byLocation: tally("locationSignal") };
}

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
  "email if publicly published. Be thorough AND precise: every person MUST have a " +
  "public source URL (and, if a location is given, verified current location " +
  "there), but keep searching VARIED sources (accelerator cohort pages, " +
  "Crunchbase/Dealroom, news, conference speaker lists, LinkedIn) until you reach " +
  "the requested number or genuinely run out. Never pad the list with " +
  "unverifiable names. Write findings as a clear list.";

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

  // Number this search within the segment ("Search #N") and label it. Kept as a
  // first-class run so many searches stay separable and reviewable. Uses max+1
  // (not count) so a backfilled Search #0 yields #1 next, and deleting a run
  // never reissues a number that would collide with a survivor.
  const [{ maxSeq } = { maxSeq: null }] = await db
    .select({ maxSeq: max(discoveryRuns.seq) })
    .from(discoveryRuns)
    .where(eq(discoveryRuns.segmentId, segmentId));
  const seq = (maxSeq ?? 0) + 1;
  const label = discoveryLabel(p);
  const paramsJson = {
    location: p.location ?? null,
    origin: p.origin ?? null,
    roles: p.roles ?? [],
    keywords: p.keywords ?? null,
    count,
  };

  // Exclusion set: everyone already in this list (any status), so the search
  // spends its budget on NEW people and repeat searches don't re-surface them.
  const existingMembers = await db
    .select({
      name: prospects.name,
      company: prospects.company,
      linkedinUrl: prospects.linkedinUrl,
    })
    .from(segmentMembers)
    .innerJoin(prospects, eq(segmentMembers.prospectId, prospects.id))
    .where(eq(segmentMembers.segmentId, segmentId));

  const normText = (t: string | null | undefined) =>
    (t ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  const keysOf = (c: {
    name: string | null;
    company: string | null;
    linkedinUrl: string | null;
  }): string[] => {
    const ks: string[] = [];
    const li = canonicalLinkedin(c.linkedinUrl);
    if (li) ks.push(`li:${li}`);
    if (c.name && c.company)
      ks.push(`nc:${normText(c.name)}|${normText(c.company)}`);
    if (ks.length === 0 && c.name) ks.push(`n:${normText(c.name)}`);
    return ks;
  };
  const label2 = (c: { name: string | null; company: string | null }) =>
    c.company ? `${c.name} @ ${c.company}` : (c.name ?? "");

  const memberKeys = new Set<string>();
  const baseExclude: string[] = [];
  for (const m of existingMembers) {
    keysOf(m).forEach((k) => memberKeys.add(k));
    baseExclude.push(label2(m));
  }

  // Loop: research (excluding known people) -> extract -> precision-gate, adding
  // unique NEW people until we reach the count, exhaust the web, or hit the caps.
  const MAX_ROUNDS = 5;
  const MAX_WEBSEARCHES = 40;
  const locationRequired = Boolean(p.location);
  const passesGate = (c: z.infer<typeof DiscoverCandidate>) =>
    Boolean(
      c.name &&
        c.sourceUrl &&
        (!locationRequired ||
          c.locationSignal === "high" ||
          c.locationSignal === "medium"),
    );

  const usable: z.infer<typeof DiscoverCandidate>[] = [];
  const seenKeys = new Set<string>();
  const notesParts: string[] = [];
  let rounds = 0;
  let dropped = 0;

  while (
    usable.length < count &&
    rounds < MAX_ROUNDS &&
    webSearches < MAX_WEBSEARCHES
  ) {
    rounds++;
    const need = count - usable.length;
    const exclude = [...baseExclude.slice(0, 150), ...usable.map(label2)];
    const excludeBlock = exclude.length
      ? `\n\nALREADY FOUND — do NOT return any of these; find DIFFERENT people:\n${exclude.join("\n")}`
      : "";
    const roundPrompt = `Research the public web and compile a list of real people who match this target:\n${promptBrief}\n\nFind ${need} more people not already listed.${excludeBlock}`;

    let roundNotes = "";
    try {
      const research = await generateText({
        model: anthropic(model),
        tools: {
          web_search: anthropic.tools.webSearch_20250305({
            maxUses: Math.min(12, need + 3),
          }),
        },
        stopWhen: stepCountIs(Math.min(16, need + 6)),
        system: DISCOVER_RESEARCH_SYSTEM,
        prompt: roundPrompt,
      });
      roundNotes = research.text?.trim() ?? "";
      const u = usageTokens(research.totalUsage);
      tokensIn += u.inputTokens;
      tokensOut += u.outputTokens;
      webSearches += countWebSearches(research.steps);
      if (!roundNotes) throw new Error("web search returned no usable text");

      const extracted = await generateObject({
        model: anthropic(model),
        schema: DiscoverOut,
        system: DISCOVER_EXTRACT_SYSTEM,
        prompt: `Target criteria:\n${promptBrief}\n\nResearch notes:\n\n${roundNotes}\n\nReturn every real person from these notes as a structured candidate.`,
      });
      const eu = usageTokens(extracted.usage);
      tokensIn += eu.inputTokens;
      tokensOut += eu.outputTokens;

      const roundUsable = extracted.object.candidates.filter(passesGate);
      dropped += extracted.object.candidates.length - roundUsable.length;

      let addedThisRound = 0;
      for (const c of roundUsable) {
        const ks = keysOf(c);
        if (ks.some((k) => memberKeys.has(k) || seenKeys.has(k))) continue;
        ks.forEach((k) => seenKeys.add(k));
        usable.push(c);
        addedThisRound++;
      }
      notesParts.push(roundNotes);
      if (addedThisRound === 0) break; // web exhausted — nothing new this round
    } catch (err) {
      // A hard failure on the very first round with nothing collected is a real
      // error; a later-round failure just ends the loop with what we have.
      if (rounds === 1 && usable.length === 0) {
        const message = err instanceof Error ? err.message : "unknown";
        await db.insert(discoveryRuns).values({
          segmentId,
          seq,
          label,
          params: paramsJson,
          notes: roundNotes || null,
          status: "error",
          errorMessage: `Search failed: ${message}`,
          model,
        });
        await db.insert(aiRuns).values({
          kind: "discover_prospects",
          input: { segmentId, brief: promptBrief, phase: "research" },
          model,
          errorMessage: message,
        });
        revalidatePath(`/admin/research/${segmentId}`);
        throw new Error(`Discovery search failed: ${message}`);
      }
      break;
    }
  }

  const notes = notesParts.join("\n\n---\n\n");
  const exhausted = usable.length < count;

  // Record the run up front so each member can be stamped with it.
  const [run] = await db
    .insert(discoveryRuns)
    .values({
      segmentId,
      seq,
      label,
      params: paramsJson,
      notes,
      status: "ok",
      model,
    })
    .returning({ id: discoveryRuns.id });

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
        discoveryRunId: run.id,
        status: "discovered",
        tier: cand.suggestedTier,
      })
      .onConflictDoNothing({
        target: [segmentMembers.segmentId, segmentMembers.prospectId],
      })
      .returning({ id: segmentMembers.id });
    if (res.length) linked++;
  }

  const breakdown = signalBreakdown(usable);
  const summary = {
    requested: count,
    found: usable.length,
    added,
    linked,
    dropped,
    rounds,
    webSearches,
    exhausted,
    ...breakdown,
  };
  await db
    .update(discoveryRuns)
    .set({ summary })
    .where(eq(discoveryRuns.id, run.id));

  await db.insert(aiRuns).values({
    kind: "discover_prospects",
    input: { segmentId, brief: promptBrief, discoveryRunId: run.id },
    output: {
      requested: count,
      usable: usable.length,
      dropped,
      added,
      linked,
      rounds,
      webSearches,
      exhausted,
    },
    model,
    tokensIn,
    tokensOut,
  });

  revalidatePath(`/admin/research/${segmentId}`);
  return {
    runId: run.id,
    seq,
    label,
    requested: count,
    found: usable.length,
    dropped,
    added,
    linked,
    rounds,
    exhausted,
    ...breakdown,
  };
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
 * Mark a Discover prospect as "Verified" (status `qualified`) so it joins the
 * list's Checked view, or un-verify it back to enriched/discovered. Never
 * downgrades an already promoted or dismissed membership.
 */
export async function setChecked(memberId: string, checked: boolean) {
  await requireUser();
  const [m] = await db
    .select({
      status: segmentMembers.status,
      enrichedAt: prospects.enrichedAt,
    })
    .from(segmentMembers)
    .innerJoin(prospects, eq(segmentMembers.prospectId, prospects.id))
    .where(eq(segmentMembers.id, memberId));
  if (!m) return;
  if (m.status === "promoted" || m.status === "dismissed") return;

  const next = checked ? "qualified" : m.enrichedAt ? "enriched" : "discovered";
  await db
    .update(segmentMembers)
    .set({ status: next })
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
// Hard delete — remove people / whole searches (distinct from soft "dismiss")
// ---------------------------------------------------------------------------

/**
 * Hard-delete one membership. Removes the person from this segment; if the
 * prospect is now orphaned (in no other segment) and was never promoted to a
 * contact, delete the prospect row too so it does not linger globally.
 */
export async function deleteMember(memberId: string) {
  await requireUser();
  const [m] = await db
    .select()
    .from(segmentMembers)
    .where(eq(segmentMembers.id, memberId));
  if (!m) return;

  await db.delete(segmentMembers).where(eq(segmentMembers.id, memberId));
  await maybeDeleteOrphanProspect(m.prospectId);
  revalidatePath(`/admin/research/${m.segmentId}`);
}

/** Delete a prospect only if nothing else references it and it is not promoted. */
async function maybeDeleteOrphanProspect(prospectId: string) {
  const others = await db
    .select({ id: segmentMembers.id })
    .from(segmentMembers)
    .where(eq(segmentMembers.prospectId, prospectId));
  if (others.length > 0) return;
  const [p] = await db
    .select({ promotedAt: prospects.promotedAt, contactId: prospects.contactId })
    .from(prospects)
    .where(eq(prospects.id, prospectId));
  if (p && !p.promotedAt && !p.contactId) {
    await db.delete(prospects).where(eq(prospects.id, prospectId));
  }
}

/**
 * Delete a whole discovery run. Surviving members keep their people but lose the
 * run tag (FK set null). When alsoDeleteProspects is true, also remove the
 * not-yet-promoted people this run surfaced (and orphaned prospects), so a bad
 * or noisy search can be wiped in one action.
 */
export async function deleteDiscoveryRun(
  runId: string,
  alsoDeleteProspects = false,
) {
  await requireUser();
  const [run] = await db
    .select()
    .from(discoveryRuns)
    .where(eq(discoveryRuns.id, runId));
  if (!run) return;

  if (alsoDeleteProspects) {
    const mems = await db
      .select()
      .from(segmentMembers)
      .where(eq(segmentMembers.discoveryRunId, runId));
    for (const m of mems) {
      if (m.status === "promoted") continue; // never delete promoted people
      await db.delete(segmentMembers).where(eq(segmentMembers.id, m.id));
      await maybeDeleteOrphanProspect(m.prospectId);
    }
  }

  await db.delete(discoveryRuns).where(eq(discoveryRuns.id, runId));
  revalidatePath(`/admin/research/${run.segmentId}`);
}

/**
 * Hard-delete a whole discover list (segment). Cascades remove its
 * segment_members and discovery_runs. Prospects are GLOBAL, so they survive the
 * cascade; afterwards we sweep the people this list held and delete only those
 * now orphaned (in no other list) AND never promoted. Promoted people and
 * anyone still in another list are always kept.
 */
export async function deleteSegment(segmentId: string) {
  await requireUser();

  // Collect prospectIds BEFORE the cascade wipes segment_members.
  const mems = await db
    .select({ prospectId: segmentMembers.prospectId })
    .from(segmentMembers)
    .where(eq(segmentMembers.segmentId, segmentId));

  // Cascade removes this segment's members + discovery_runs; prospects untouched.
  await db.delete(segments).where(eq(segments.id, segmentId));

  // Sweep now-orphaned, non-promoted prospects (reuses existing helper).
  for (const m of mems) {
    await maybeDeleteOrphanProspect(m.prospectId);
  }

  revalidatePath("/admin/research");
  redirect("/admin/research");
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

  // Resolve the target contact: an already-linked one (discovery auto-link)
  // first, else dedupe by canonical LinkedIn or email so promoting never
  // creates a second contact for someone already in the CRM.
  const email = normalizeEmail(p.email);
  let existing = null;
  if (p.contactId) {
    const [c] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, p.contactId));
    existing = c ?? null;
  }
  if (!existing) {
    existing = await findContactByIdentity({
      linkedinUrl: p.linkedinUrl,
      email,
    });
  }

  const source = `research:${seg?.slug ?? "segment"}`;
  const today = new Date().toISOString().slice(0, 10);
  // Full context for a brand-new contact.
  const notes =
    [
      p.bio ?? "",
      p.sourceUrl ? `Source: ${p.sourceUrl}` : "",
      p.notes ?? "",
      `Promoted from Research: ${seg?.name ?? ""} (${today})`,
    ]
      .filter(Boolean)
      .join("\n") || null;
  // Concise provenance appended to an EXISTING contact (never overwrites).
  const provenance = [
    `Source: ${source}`,
    p.sourceUrl ? `Ref: ${p.sourceUrl}` : "",
    `Promoted from Research: ${seg?.name ?? ""} (${today})`,
  ]
    .filter(Boolean)
    .join("\n");

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
        // Always keep provenance traceable: stamp source if missing, and append
        // (never drop) the promotion note. Do NOT touch `parked` — an existing
        // contact may already be actively worked.
        source: existing.source ?? source,
        notes: existing.notes ? `${existing.notes}\n\n${provenance}` : provenance,
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
        // Held off the Pipeline kanban until the team actually engages.
        parked: true,
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
