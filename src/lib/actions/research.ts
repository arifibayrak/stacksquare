"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, ilike } from "drizzle-orm";
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
 * Canonicalise a LinkedIn URL so the same profile always produces the same
 * string (drives the unique index on prospects.linkedin_url). Strips
 * protocol/www/query/hash/trailing slash, lowercases, then re-prefixes https.
 */
function canonicalLinkedin(url: string | null | undefined): string | null {
  if (!url) return null;
  let u = url.trim();
  if (!u) return null;
  u = u
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("?")[0]
    .split("#")[0]
    .replace(/\/+$/, "")
    .toLowerCase();
  if (!u) return null;
  return `https://${u}`;
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
    let prospectId: string | null = null;

    if (canonical) {
      const [ex] = await db
        .select({ id: prospects.id })
        .from(prospects)
        .where(eq(prospects.linkedinUrl, canonical));
      prospectId = ex?.id ?? null;
    } else if (line.company) {
      const [ex] = await db
        .select({ id: prospects.id })
        .from(prospects)
        .where(
          and(
            ilike(prospects.name, line.name),
            ilike(prospects.company, line.company),
          ),
        );
      prospectId = ex?.id ?? null;
    }

    if (!prospectId) {
      const [row] = await db
        .insert(prospects)
        .values({
          name: line.name,
          company: line.company,
          linkedinUrl: canonical,
          links: line.otherLink ? [line.otherLink] : [],
          discoveredVia: "seed",
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
  turkishSignal: z.enum(SIGNAL_CONFIDENCES).nullable(),
  londonSignal: z.enum(SIGNAL_CONFIDENCES).nullable(),
  sourceUrl: z.string().nullable(),
  suggestedRoles: z.array(z.enum(PROSPECT_ROLES)).nullable(),
  suggestedTier: z.enum(PROSPECT_TIERS).nullable(),
});

const DiscoverOut = z.object({ candidates: z.array(DiscoverCandidate) });

// Phase 1: web research (tools, free-form text). Phase 2 extracts structure.
// Anthropic's server-side web_search tool and forced structured output do not
// mix reliably in a single call ("No object generated"), so we split them.
const DISCOVER_RESEARCH_SYSTEM =
  "You are a market-intelligence research assistant for StackSquare, an events " +
  "organisation, building a curated map of a specific group of people. Use web " +
  "search over public sources (Crunchbase, Dealroom, Sifted, company team/about " +
  "pages, accelerator cohort pages, conference speaker lists, reputable news) to " +
  "find REAL, currently-active people who fit the brief. For each person, write " +
  "their name, title, company, city, LinkedIn URL if found, a public SOURCE URL " +
  "that verifies them, a one-line bio, evidence of Turkish origin/heritage, and " +
  "evidence they are based in London. Never invent people or emails. Only give a " +
  "business email if it is publicly published. Prefer PRECISION over recall: a " +
  "shorter list of well-sourced people beats plausible guesses. Aim for up to " +
  "~15 people. Write your findings as a clear, structured list.";

const DISCOVER_EXTRACT_SYSTEM =
  "Extract structured candidates from the research notes. Return one entry per " +
  "real person the notes describe. Only include a person if the notes give a " +
  "public source URL for them. Use null for any field the notes do not support; " +
  "never invent data (especially emails). turkishSignal / londonSignal reflect " +
  "how strong the notes' evidence is. suggestedTier: a = clear high-signal " +
  "founder actively building in London, b = solid fit, c = adjacent / ecosystem.";

export async function discoverProspects(
  segmentId: string,
  briefOverride?: string,
) {
  await requireUser();
  const [seg] = await db
    .select()
    .from(segments)
    .where(eq(segments.id, segmentId));
  if (!seg) throw new Error("Segment not found");

  const brief = (briefOverride?.trim() || seg.brief || "").trim();
  const promptBrief = [
    `Database: ${seg.name}`,
    seg.description && `Description: ${seg.description}`,
    brief && `Brief: ${brief}`,
  ]
    .filter(Boolean)
    .join("\n");

  const model = env.modelFast();

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
      prompt: `Research the public web and compile a list of real people who fit this market-map brief:\n${promptBrief}`,
    });
    notes = research.text?.trim() ?? "";
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
      prompt: `Research notes:\n\n${notes}\n\nReturn every real person from these notes as a structured candidate.`,
    });
    candidates = extracted.object.candidates;
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

  // Precision gate: keep only people with a name and a public source URL.
  const usable = candidates.filter((c) => c.name && c.sourceUrl);
  const dropped = candidates.length - usable.length;

  let added = 0;
  let linked = 0;

  for (const cand of usable) {
    const canonical = canonicalLinkedin(cand.linkedinUrl);
    let prospectId: string | null = null;

    if (canonical) {
      const [ex] = await db
        .select({ id: prospects.id })
        .from(prospects)
        .where(eq(prospects.linkedinUrl, canonical));
      prospectId = ex?.id ?? null;
    } else if (cand.company) {
      const [ex] = await db
        .select({ id: prospects.id })
        .from(prospects)
        .where(
          and(
            ilike(prospects.name, cand.name),
            ilike(prospects.company, cand.company),
          ),
        );
      prospectId = ex?.id ?? null;
    }

    if (!prospectId) {
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
          turkishSignal: cand.turkishSignal,
          londonSignal: cand.londonSignal,
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
    output: { count: candidates.length, usable: usable.length, dropped, added, linked },
    model,
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
  turkishSignal: z.enum(SIGNAL_CONFIDENCES).nullable(),
  londonSignal: z.enum(SIGNAL_CONFIDENCES).nullable(),
  summary: z.string().nullable(),
});

const ENRICH_RESEARCH_SYSTEM =
  "You are a research assistant enriching ONE person in a market map. Use public " +
  "web search to verify and report their current title, company, city, a 1-2 " +
  "sentence public professional bio, public links, and (only if publicly " +
  "published by them or their company) a business email. Note evidence of " +
  "Turkish origin/heritage and of being based in London. Cross-check that results " +
  "refer to the SAME person (match name + company/role). Never invent data. " +
  "Write your findings as clear notes, citing where each fact came from.";

const ENRICH_EXTRACT_SYSTEM =
  "Extract structured fields for this one person from the research notes. Use " +
  "null for anything the notes do not support; never invent data. Include an " +
  "email ONLY if the notes show it was publicly published. summary: 2-3 sentences " +
  "on what was found and from where.";

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
      turkishSignal: p.turkishSignal ?? out.turkishSignal ?? null,
      londonSignal: p.londonSignal ?? out.londonSignal ?? null,
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
    output: out,
    model,
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

  let existing = null;
  if (p.linkedinUrl) {
    const [ex] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.linkedinUrl, p.linkedinUrl));
    existing = ex ?? null;
  }

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
        email: existing.email ?? p.email,
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
        linkedinUrl: p.linkedinUrl,
        email: p.email,
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
