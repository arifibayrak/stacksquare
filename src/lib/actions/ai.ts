"use server";

import { z } from "zod";
import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { db, contacts, aiRuns } from "@/db";
import { env } from "@/lib/env";

// Model IDs come from env (see src/lib/env.ts). Defaults match the
// @ai-sdk/anthropic AnthropicMessagesModelId union format.
const MODEL_FAST = () => env.modelFast();

async function requireUser() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  return userId;
}

const EnrichOut = z.object({
  name: z.string(),
  role: z.string().nullable(),
  company: z.string().nullable(),
  city: z.string().nullable(),
  expertise: z.array(z.string()),
  seniority: z.enum(["peer", "mid", "senior", "c_suite"]).nullable(),
  fitScore: z.number().int().min(1).max(10),
  fitReason: z.string(),
  suggestedAngles: z.array(z.string()),
});

export async function enrichFromText(rawText: string) {
  await requireUser();
  if (!rawText.trim()) throw new Error("Empty input");

  const start = Date.now();
  const { output } = await generateText({
    model: anthropic(MODEL_FAST()),
    output: Output.object({ schema: EnrichOut }),
    system:
      "You are a research assistant for StackSquare, an events organization at the intersection of strategy and capital (consulting/PE/VC/startups/AI). " +
      "Given a LinkedIn profile or pasted bio, extract structured fields and assess fit as an event speaker. " +
      "Be concise. expertise should be 3-6 short tags like 'vc', 'fintech', 'b2b-saas'. " +
      "fitScore is 1-10 (10 = perfect speaker). " +
      "suggestedAngles: 2-3 specific angles for a live session.",
    prompt: rawText,
  });

  await db.insert(aiRuns).values({
    kind: "enrich_contact",
    input: { rawText: rawText.slice(0, 4000) },
    output,
    model: MODEL_FAST(),
  });

  return { ok: true as const, data: output, elapsedMs: Date.now() - start };
}

export async function draftOutreach(opts: {
  contactId: string;
  channel: "linkedin_dm" | "email" | "intro_ask";
  angle?: string;
  voice?: "arif" | "kerem";
}) {
  await requireUser();

  const [c] = await db
    .select()
    .from(contacts)
    .where(eq(contacts.id, opts.contactId))
    .limit(1);
  if (!c) throw new Error("Contact not found");

  const channelGuide = {
    linkedin_dm:
      "LinkedIn DM. 4-5 lines max. Casual but credible. End with a Calendly link placeholder {calendly} and 2 proposed slots.",
    email:
      "Cold email. Subject ≤ 7 words. Opens with a specific reason for THEM (recent deal/talk/paper if known). Ends with two scheduling slots and {calendly}.",
    intro_ask:
      "An intro request to a mutual. First, 1 line asking permission. Then a self-contained 6-line blurb the mutual can paste/forward.",
  }[opts.channel];

  const voiceGuide =
    opts.voice === "kerem"
      ? "Voice: Kerem. Strategy/PE/consulting background, ran 2000+ Dialectica expert calls. Polished, slightly formal."
      : "Voice: Arif. VC/AI/founder background, Imperial MSc. Direct, curious, builder-energy.";

  const out = await generateText({
    model: anthropic(MODEL_FAST()),
    system:
      "You write outreach for StackSquare, an events organization at the intersection of strategy and capital. " +
      voiceGuide +
      " " +
      channelGuide +
      " Never use cliches like 'I hope this finds you well'. Never overpromise. Be specific to the recipient. Output only the message body (and subject on first line for emails).",
    prompt: [
      `Contact:`,
      `- Name: ${c.name}`,
      `- Role: ${c.role ?? "(unknown)"}`,
      `- Company: ${c.company ?? "(unknown)"}`,
      `- Expertise: ${c.expertise.join(", ") || "(unknown)"}`,
      `- Notes: ${c.notes ?? "(none)"}`,
      ``,
      opts.angle ? `Angle to lead with: ${opts.angle}` : "",
      ``,
      `Draft the message.`,
    ].join("\n"),
  });

  await db.insert(aiRuns).values({
    kind: "draft_outreach",
    contactId: c.id,
    input: { channel: opts.channel, angle: opts.angle ?? null, voice: opts.voice ?? "arif" },
    output: { text: out.text },
    model: MODEL_FAST(),
  });

  return { ok: true as const, text: out.text };
}
