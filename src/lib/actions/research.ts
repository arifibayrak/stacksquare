"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, ilike } from "drizzle-orm";
import { z } from "zod";
import { generateText, stepCountIs, Output } from "ai";
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

const DiscoverCandidate = z.object({
  name: z.string(),
  title: z.string().nullable(),
  company: z.string().nullable(),
  city: z.string().nullable(),
  linkedinUrl: z.string().nullable(),
  links: z.array(z.string()),
  email: z
    .string()
    .nullable()
    .describe("Only if the person/company has published it publicly"),
  emailConfidence: z.enum(SIGNAL_CONFIDENCES).nullable(),
  bio: z.string().describe("1-2 sentence public professional summary"),
  turkishSignal: z
    .enum(SIGNAL_CONFIDENCES)
    .describe("Confidence the person is of Turkish origin/heritage"),
  londonSignal: z
    .enum(SIGNAL_CONFIDENCES)
    .describe("Confidence the person is based in London"),
  sourceUrl: z.string().describe("A public URL that verifies this person"),
  suggestedRoles: z.array(z.enum(PROSPECT_ROLES)),
  suggestedTier: z.enum(PROSPECT_TIERS),
});

const DiscoverOut = z.object({ candidates: z.array(DiscoverCandidate) });

const DISCOVER_SYSTEM =
  "You are a market-intelligence research assistant for StackSquare, an events " +
  "organisation. You are building a curated map of a specific group of people. " +
  "Enumerate REAL, currently-active people who fit the brief, using public web " +
  "sources (Crunchbase, Dealroom, Sifted, company team/about pages, accelerator " +
  "cohort pages, conference speaker lists, reputable news). For EACH candidate " +
  "you MUST have a verifiable public sourceUrl; never invent people and never " +
  "invent an email. Include a business email ONLY if the person or their company " +
  "has published it publicly; otherwise null. Set turkishSignal (Turkish " +
  "origin/heritage) and londonSignal (based in London) honestly by how strong " +
  "the public evidence is, and drop anyone you cannot place in London. " +
  "Cross-check name + company across sources so each candidate is one real " +
  "person. Prefer PRECISION over recall: return fewer, well-sourced people " +
  "rather than plausible guesses. suggestedTier: a = clear high-signal founder " +
  "actively building in London, b = solid fit, c = adjacent / ecosystem. Return " +
  "at most ~15 candidates per run.";

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
  let result;
  try {
    result = await generateText({
      model: anthropic(model),
      tools: {
        web_search: anthropic.tools.webSearch_20250305({ maxUses: 8 }),
      },
      stopWhen: stepCountIs(12),
      output: Output.object({ schema: DiscoverOut }),
      system: DISCOVER_SYSTEM,
      prompt: `Find real people who fit this market-map brief:\n${promptBrief}`,
    });
  } catch (err) {
    await db.insert(aiRuns).values({
      kind: "discover_prospects",
      input: { segmentId, brief: promptBrief },
      model,
      errorMessage: err instanceof Error ? err.message : "unknown",
    });
    throw new Error("Discovery failed");
  }

  const out = result.output;
  let added = 0;
  let linked = 0;

  for (const cand of out.candidates) {
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
    output: { count: out.candidates.length, added, linked },
    model,
  });

  revalidatePath(`/admin/research/${segmentId}`);
  return { found: out.candidates.length, added, linked };
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
  links: z.array(z.string()),
  bio: z.string(),
  turkishSignal: z.enum(SIGNAL_CONFIDENCES).nullable(),
  londonSignal: z.enum(SIGNAL_CONFIDENCES).nullable(),
  summary: z.string().describe("2-3 sentences on what was found and from where"),
});

const ENRICH_SYSTEM =
  "You are a research assistant enriching ONE person in a market map. Using " +
  "public web search, verify and fill in their current title, company, city, a " +
  "1-2 sentence public professional bio, and public links. Include an email " +
  "ONLY if publicly published by them or their company; set emailConfidence " +
  "accordingly. Assess turkishSignal (Turkish origin/heritage) and londonSignal " +
  "(based in London) from public evidence. Cross-check that results refer to the " +
  "SAME person (match name + company/role). Never invent data; return null when " +
  "nothing reliable is found.";

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
  let result;
  try {
    result = await generateText({
      model: anthropic(model),
      tools: {
        web_search: anthropic.tools.webSearch_20250305({ maxUses: 5 }),
      },
      stopWhen: stepCountIs(8),
      output: Output.object({ schema: EnrichOut }),
      system: ENRICH_SYSTEM,
      prompt: `Enrich this person for a market map:\n${profile}`,
    });
  } catch (err) {
    await db.insert(aiRuns).values({
      kind: "enrich_prospect",
      contactId: p.contactId ?? null,
      input: { prospectId, profile },
      model,
      errorMessage: err instanceof Error ? err.message : "unknown",
    });
    throw new Error("Enrichment failed");
  }

  const out = result.output;
  const links = Array.from(new Set([...(p.links ?? []), ...(out.links ?? [])]));
  const noteLine = `Enrichment (${new Date().toISOString().slice(0, 10)}): ${
    out.summary
  }${out.links.length ? `\nLinks: ${out.links.join(", ")}` : ""}`;

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
