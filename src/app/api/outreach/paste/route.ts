import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, contacts } from "@/db";
import { CHANNELS } from "@/db/schema";
import { CORS_HEADERS, ownerForKey } from "@/lib/extension-auth";
import {
  canonicalLinkedin,
  normalizeEmail,
  findContactByIdentity,
} from "@/lib/contacts-dedup";
import { recordPastedConversation } from "@/lib/outreach-paste";

// Log a conversation pasted from anywhere (WhatsApp, Gmail, any platform) via
// the Stacksquare Scout extension. Auth: per-founder X-API-Key. The paste is
// structured + summarized server-side and only the summary is stored (same
// privacy posture as LinkedIn DM logging). The chat can be filed against an
// existing contact or a brand-new one created here (deduped by LinkedIn/email).

const NewContact = z.object({
  name: z.string().min(1).max(300),
  company: z.string().max(300).optional().nullable(),
  role: z.string().max(300).optional().nullable(),
  linkedinUrl: z.string().url().max(500).optional().nullable(),
  email: z.string().email().max(320).optional().nullable(),
});

const Payload = z
  .object({
    contactId: z.string().uuid().optional().nullable(),
    newContact: NewContact.optional().nullable(),
    channel: z.enum(CHANNELS).optional().nullable(),
    subject: z.string().max(300).optional().nullable(),
    text: z.string().min(1).max(500_000),
  })
  .refine((v) => Boolean(v.contactId) || Boolean(v.newContact), {
    message: "contactId or newContact is required",
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
  return h.count > 20;
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
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400, headers: CORS_HEADERS },
    );
  }
  const p = parsed.data;

  // Resolve the target contact: an explicit id, or create/dedupe a new one.
  let contactId: string;
  let contactName: string;
  let created = false;
  if (p.contactId) {
    const [c] = await db
      .select({ id: contacts.id, name: contacts.name })
      .from(contacts)
      .where(eq(contacts.id, p.contactId))
      .limit(1);
    if (!c) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404, headers: CORS_HEADERS },
      );
    }
    contactId = c.id;
    contactName = c.name;
  } else {
    const nc = p.newContact!;
    const linkedinUrl = canonicalLinkedin(nc.linkedinUrl);
    const email = normalizeEmail(nc.email);
    // Never create a duplicate: link to an existing person if the LinkedIn or
    // email already maps to one.
    const existing = await findContactByIdentity({ linkedinUrl, email });
    if (existing) {
      contactId = existing.id;
      contactName = existing.name;
    } else {
      const [row] = await db
        .insert(contacts)
        .values({
          name: nc.name,
          company: nc.company ?? null,
          role: nc.role ?? null,
          linkedinUrl,
          email,
          owner,
          source: "scout-log",
        })
        .returning({ id: contacts.id, name: contacts.name });
      contactId = row.id;
      contactName = row.name;
      created = true;
    }
  }

  try {
    const { messageCount } = await recordPastedConversation({
      contactId,
      owner,
      channel: p.channel ?? null,
      subject: p.subject ?? null,
      text: p.text,
    });
    return NextResponse.json(
      { ok: true, contactId, contactName, created, messageCount },
      { status: 201, headers: CORS_HEADERS },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to log";
    return NextResponse.json(
      { error: msg },
      { status: 400, headers: CORS_HEADERS },
    );
  }
}
