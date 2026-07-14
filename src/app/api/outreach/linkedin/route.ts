import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, outreachThreads, outreachTimeline, contacts } from "@/db";
import { env } from "@/lib/env";
import { CORS_HEADERS, ownerForKey } from "@/lib/extension-auth";
import { canonicalLinkedin } from "@/lib/contacts-dedup";
import { resolveContact, upsertIdentity } from "@/lib/outreach-identity";
import {
  lastMessageKey,
  triageThread,
  summarizeThreadDelta,
  type OutreachMessage,
} from "@/lib/outreach-summarize";

// Ingest LinkedIn DM conversations captured passively by the Stacksquare Scout
// extension (the founder's own browser, pages LinkedIn already served, no
// automated LinkedIn calls; see docs/adr/0002 + 0004). Raw transcript is
// summarized in-memory and never persisted: only summaries + metadata land in
// the DB. Auth: per-founder X-API-Key (same as /api/capture).

const Message = z.object({
  from: z.enum(["me", "them"]),
  at: z.string().max(64).optional().nullable(),
  text: z.string().max(8000),
});

const Payload = z.object({
  conversationId: z.string().min(1).max(300),
  counterpart: z.object({
    name: z.string().max(300).optional().nullable(),
    linkedinUrl: z.string().url().max(500).optional().nullable(),
    headline: z.string().max(500).optional().nullable(),
  }),
  transcript: z.array(Message).min(1).max(500),
  parser: z.string().max(40).optional().nullable(),
});

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

/** Best-effort parse of a LinkedIn timestamp (epoch ms/s or ISO) to a Date. */
function parseAt(at: string | null | undefined): Date | null {
  if (!at) return null;
  const n = Number(at);
  if (Number.isFinite(n) && n > 0) {
    if (n > 1e12) return new Date(n); // ms
    if (n > 1e9) return new Date(n * 1000); // s
  }
  const d = new Date(at);
  return Number.isNaN(d.getTime()) ? null : d;
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
  const messages: OutreachMessage[] = p.transcript;
  const counterpartLinkedin = canonicalLinkedin(p.counterpart.linkedinUrl);
  const newKey = lastMessageKey(messages);

  // Existing thread for this founder + conversation?
  const [existing] = await db
    .select()
    .from(outreachThreads)
    .where(
      and(
        eq(outreachThreads.source, "linkedin"),
        eq(outreachThreads.owner, owner),
        eq(outreachThreads.externalThreadId, p.conversationId),
      ),
    )
    .limit(1);

  // Nothing new since last capture: cheap no-op.
  if (existing && newKey && existing.lastMessageKey === newKey) {
    return NextResponse.json(
      { ok: true, unchanged: true, matched: Boolean(existing.contactId) },
      { status: 200, headers: CORS_HEADERS },
    );
  }

  // Attribute to a contact (may be null -> lands in the unmatched queue).
  const contact = counterpartLinkedin
    ? await resolveContact({ linkedinUrl: counterpartLinkedin })
    : null;

  const lastAt =
    parseAt(messages[messages.length - 1]?.at) ?? new Date();
  const firstAt = parseAt(messages[0]?.at);

  // Fast triage: skip logging automated / content-free threads, but still
  // advance the cursor so we do not re-triage the same content next time.
  const triage = await triageThread({
    counterpartName: p.counterpart.name,
    messages,
  });

  if (!triage.worthLogging) {
    if (existing) {
      await db
        .update(outreachThreads)
        .set({ lastMessageKey: newKey, lastMessageAt: lastAt, updatedAt: new Date() })
        .where(eq(outreachThreads.id, existing.id));
    } else {
      // Junk thread: keep it out of the review queue and every timeline.
      await db.insert(outreachThreads).values({
        source: "linkedin",
        owner,
        externalThreadId: p.conversationId,
        contactId: contact?.id ?? null,
        counterpartName: p.counterpart.name ?? null,
        counterpartLinkedin,
        lastMessageKey: newKey,
        lastMessageAt: lastAt,
        messageCount: messages.length,
        reviewStatus: "dismissed",
      });
    }
    return NextResponse.json(
      { ok: true, skipped: true, reason: triage.reason ?? "not worth logging" },
      { status: 200, headers: CORS_HEADERS },
    );
  }

  const summary = await summarizeThreadDelta({
    source: "linkedin",
    contactId: contact?.id ?? null,
    threadId: existing?.id ?? null,
    counterpartName: p.counterpart.name,
    previousSummary: existing?.summary ?? null,
    messages,
  });

  // Upsert the thread's rolling state.
  let threadId: string;
  if (existing) {
    await db
      .update(outreachThreads)
      .set({
        contactId: contact?.id ?? existing.contactId,
        counterpartName: p.counterpart.name ?? existing.counterpartName,
        counterpartLinkedin: counterpartLinkedin ?? existing.counterpartLinkedin,
        summary: summary.rollingSummary,
        commitments: summary.commitments,
        nextSteps: summary.nextSteps,
        lastMessageKey: newKey,
        lastMessageAt: lastAt,
        messageCount: messages.length,
        updatedAt: new Date(),
      })
      .where(eq(outreachThreads.id, existing.id));
    threadId = existing.id;
  } else {
    const [row] = await db
      .insert(outreachThreads)
      .values({
        source: "linkedin",
        owner,
        externalThreadId: p.conversationId,
        contactId: contact?.id ?? null,
        counterpartName: p.counterpart.name ?? null,
        counterpartLinkedin,
        summary: summary.rollingSummary,
        commitments: summary.commitments,
        nextSteps: summary.nextSteps,
        lastMessageKey: newKey,
        lastMessageAt: lastAt,
        messageCount: messages.length,
        // New logs wait in the review queue before touching a timeline.
        reviewStatus: "pending",
      })
      .returning({ id: outreachThreads.id });
    threadId = row.id;
  }

  // Append the delta to the timeline.
  await db.insert(outreachTimeline).values({
    threadId,
    contactId: contact?.id ?? null,
    source: "linkedin",
    owner,
    direction: summary.direction,
    summary: summary.deltaSummary,
    commitments: summary.commitments,
    nextSteps: summary.nextSteps,
    coversFrom: firstAt,
    coversTo: lastAt,
    messageCount: messages.length,
    model: env.modelOutreach(),
  });

  // Remember the identity so future threads auto-match. Last-touch only moves
  // once the thread is accepted, so a pending capture does not bump the CRM.
  const pending = existing ? existing.reviewStatus === "pending" : true;
  if (contact) {
    if (counterpartLinkedin)
      await upsertIdentity(contact.id, "linkedin", counterpartLinkedin);
    if (!pending)
      await db
        .update(contacts)
        .set({ lastTouchAt: lastAt })
        .where(eq(contacts.id, contact.id));
  }

  return NextResponse.json(
    {
      ok: true,
      new: !existing,
      matched: Boolean(contact),
      contactName: contact?.name ?? null,
      pending,
    },
    { status: 201, headers: CORS_HEADERS },
  );
}
