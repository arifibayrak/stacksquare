"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { generateText, stepCountIs, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { auth } from "@clerk/nextjs/server";
import { db, contacts, aiRuns } from "@/db";
import { env } from "@/lib/env";

const Found = z.object({
  email: z.string().nullable().describe("Best verified work or personal email"),
  emailConfidence: z.enum(["high", "medium", "low"]).nullable(),
  phone: z.string().nullable().describe("Only if publicly self-posted"),
  links: z
    .array(z.string())
    .describe("Relevant URLs found: GitHub, personal site, X, talks"),
  summary: z
    .string()
    .describe("2-3 sentences on what was found and from where"),
});

/**
 * Hunt the open web for a contact's email/phone. The model runs its own
 * web search + fetch (GitHub, personal site, talks, company pages) and
 * returns structured findings. Fills only blank contact fields; always
 * appends a sourced note so findings can be verified before outreach.
 */
export async function findContactInfo(contactId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [c] = await db.select().from(contacts).where(eq(contacts.id, contactId));
  if (!c) throw new Error("Contact not found");

  const profile = [
    `Name: ${c.name}`,
    c.role && `Role: ${c.role}`,
    c.company && `Company: ${c.company}`,
    c.city && `Location: ${c.city}`,
    c.linkedinUrl && `LinkedIn: ${c.linkedinUrl}`,
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
      output: Output.object({ schema: Found }),
      system:
        "You are a contact research assistant. Find publicly available contact " +
        "details for one person, prioritising what helps a warm, legitimate " +
        "outreach for an events organisation. Search GitHub (profile email and " +
        "public commit emails), the person's personal website (/about, /contact), " +
        "conference talk pages, and company team pages. Cross-check that results " +
        "refer to the SAME person (match name + company/role), and never invent " +
        "an address. Only report a phone number if the person published it " +
        "themselves on their own site. Set emailConfidence by how directly the " +
        "email is attributable to them. Return null when nothing reliable is found.",
      prompt: `Find contact info for:\n${profile}`,
    });
  } catch (err) {
    await db.insert(aiRuns).values({
      kind: "find_contact_info",
      contactId,
      input: { profile },
      model,
      errorMessage: err instanceof Error ? err.message : "unknown",
    });
    throw new Error("Enrichment failed");
  }

  const out = result.output;

  // Fill only blank fields; record everything in a sourced note.
  const noteLine = `Enrichment (${new Date().toISOString().slice(0, 10)}): ${
    out.summary
  }${out.links.length ? `\nLinks: ${out.links.join(", ")}` : ""}`;

  await db
    .update(contacts)
    .set({
      email: c.email ?? out.email ?? null,
      phone: c.phone ?? out.phone ?? null,
      notes: c.notes ? `${c.notes}\n\n${noteLine}` : noteLine,
      updatedAt: new Date(),
    })
    .where(eq(contacts.id, contactId));

  await db.insert(aiRuns).values({
    kind: "find_contact_info",
    contactId,
    input: { profile },
    output: out,
    model,
  });

  revalidatePath(`/admin/contacts/${contactId}`);
  return out;
}
