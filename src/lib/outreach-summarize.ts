import { createHash } from "node:crypto";
import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { db, aiRuns } from "@/db";
import { env } from "@/lib/env";

/**
 * Outreach conversation summarization. Triage (junk filter), paste parsing, and
 * the rolling summary + commitment extraction all run on env.modelOutreach(),
 * which defaults to Sonnet. This is a summarize/extract job, not deep reasoning,
 * so Opus is unnecessary and Sonnet is cheaper and faster at volume (the Gmail
 * cron can summarize dozens of threads a day). Override with
 * ANTHROPIC_MODEL_OUTREACH (e.g. a Haiku id for the cheapest option).
 *
 * Privacy (docs/adr/0004): raw message text is summarized in-memory and never
 * persisted. ai_runs.input stores only a hash + message count, never the text.
 */

export type OutreachMessage = {
  from: "me" | "them";
  at?: string | null;
  text: string;
};

export type OutreachSource = "linkedin" | "gmail" | "manual";

export function transcriptSha256(messages: OutreachMessage[]): string {
  const canon = messages
    .map((m) => `${m.from}|${m.at ?? ""}|${m.text}`)
    .join("\n");
  return createHash("sha256").update(canon).digest("hex");
}

/** Stable dedup/cursor key for the newest message in a transcript. */
export function lastMessageKey(messages: OutreachMessage[]): string | null {
  const last = messages[messages.length - 1];
  if (!last) return null;
  return createHash("sha256")
    .update(`${last.from}|${last.at ?? ""}|${last.text}`)
    .digest("hex");
}

function renderTranscript(messages: OutreachMessage[], max = 60_000): string {
  const lines = messages.map((m) => {
    const who = m.from === "me" ? "ME" : "THEM";
    const when = m.at ? ` (${m.at})` : "";
    return `${who}${when}: ${m.text}`;
  });
  const joined = lines.join("\n");
  return joined.length > max ? joined.slice(joined.length - max) : joined;
}

const TriageResult = z.object({
  worthLogging: z
    .boolean()
    .describe(
      "true if this is a real 1:1 outreach/relationship conversation worth " +
        "recording in a CRM; false for automated notifications, newsletters, " +
        "receipts, calendar invites, promotions, or empty pleasantries.",
    ),
  reason: z.string().nullable(),
});

export type Triage = z.infer<typeof TriageResult>;

const SummaryResult = z.object({
  rollingSummary: z
    .string()
    .describe("2-4 sentence summary of the WHOLE conversation to date."),
  deltaSummary: z
    .string()
    .describe("1-2 sentences on what is new since the previous summary."),
  commitments: z
    .array(z.string())
    .describe("Concrete commitments/asks made by either side. Empty if none."),
  nextSteps: z
    .string()
    .nullable()
    .describe("The single most important next action, or null."),
  direction: z.enum(["outbound", "inbound", "mixed"]),
});

export type OutreachSummary = z.infer<typeof SummaryResult>;

const PastedTranscript = z.object({
  counterpartName: z.string().nullable(),
  messages: z.array(
    z.object({
      from: z.enum(["me", "them"]),
      at: z.string().nullable(),
      text: z.string(),
    }),
  ),
});

/**
 * Turn a pasted blob (WhatsApp export, email thread, call notes) into a
 * structured transcript using the fast model. The universal fallback for
 * channels we do not auto-capture.
 */
export async function parsePastedTranscript(
  raw: string,
): Promise<{ counterpartName: string | null; messages: OutreachMessage[] }> {
  // Keep the most recent portion of very long exports (chats are chronological,
  // so the tail is the newest and most relevant context).
  const MAX = 60_000;
  const clipped = raw.length > MAX ? raw.slice(raw.length - MAX) : raw;
  const { output } = await generateText({
    model: anthropic(env.modelOutreach()),
    output: Output.object({ schema: PastedTranscript }),
    system:
      "You convert a pasted conversation into a structured transcript. It may be " +
      "a WhatsApp export (lines like '[2024-06-12, 14:23] Name: message' or " +
      "'12/06/2024, 14:23 - Name: message'), an email thread, or free-form notes. " +
      "'me' is the founder who pasted it; 'them' is the other person. Preserve " +
      "order. Include timestamps as 'at' when present (as written), else null. " +
      "Skip system lines like 'Messages are end-to-end encrypted'. If it is " +
      "unstructured notes rather than a back-and-forth, return a single 'me' " +
      "message whose text is the notes.",
    prompt: clipped,
  });
  return output;
}

/** Fast junk filter: is this thread worth logging at all? */
export async function triageThread(input: {
  counterpartName?: string | null;
  subject?: string | null;
  messages: OutreachMessage[];
}): Promise<Triage> {
  const { output } = await generateText({
    model: anthropic(env.modelOutreach()),
    output: Output.object({ schema: TriageResult }),
    system:
      "You are a CRM triage filter for a small team's outreach. Decide if a " +
      "conversation is a genuine person-to-person exchange worth logging " +
      "against a contact. Reject automated mail, newsletters, receipts, " +
      "notifications, promotions, and content-free pleasantries.",
    prompt:
      `Counterpart: ${input.counterpartName ?? "unknown"}\n` +
      (input.subject ? `Subject: ${input.subject}\n` : "") +
      `Transcript:\n${renderTranscript(input.messages, 8_000)}`,
  });
  return output;
}

/**
 * Deep summary of a thread + delta since the previous summary. Logs to ai_runs
 * without any raw message text.
 */
export async function summarizeThreadDelta(input: {
  source: OutreachSource;
  contactId?: string | null;
  threadId?: string | null;
  counterpartName?: string | null;
  subject?: string | null;
  previousSummary?: string | null;
  messages: OutreachMessage[];
}): Promise<OutreachSummary> {
  const model = env.modelOutreach();
  const sha = transcriptSha256(input.messages);
  try {
    const { output } = await generateText({
      model: anthropic(model),
      output: Output.object({ schema: SummaryResult }),
      system:
        "You summarize an outreach conversation for a CRM timeline. Be concise " +
        "and factual. 'ME' is the founder; 'THEM' is the contact. Capture " +
        "commitments (intros promised, calls agreed, materials to send) and the " +
        "single clearest next step. Do not invent details.",
      prompt:
        `Source: ${input.source}\n` +
        `Counterpart: ${input.counterpartName ?? "unknown"}\n` +
        (input.subject ? `Subject: ${input.subject}\n` : "") +
        (input.previousSummary
          ? `Previous summary (for delta): ${input.previousSummary}\n`
          : "") +
        `Transcript:\n${renderTranscript(input.messages)}`,
    });

    await db.insert(aiRuns).values({
      kind: "summarize_outreach",
      contactId: input.contactId ?? null,
      input: {
        threadId: input.threadId ?? null,
        source: input.source,
        messageCount: input.messages.length,
        transcriptSha256: sha,
      },
      output,
      model,
    });

    return output;
  } catch (err) {
    await db.insert(aiRuns).values({
      kind: "summarize_outreach",
      contactId: input.contactId ?? null,
      input: {
        threadId: input.threadId ?? null,
        source: input.source,
        messageCount: input.messages.length,
        transcriptSha256: sha,
      },
      model,
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
