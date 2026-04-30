"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { Resend } from "resend";
import { db, outreachTemplates, outreachLog, contacts } from "@/db";
import { env } from "@/lib/env";

const CHANNELS = [
  "linkedin_dm",
  "email",
  "whatsapp",
  "intro_ask",
  "in_person",
  "call",
  "other",
] as const;

const TemplateInput = z.object({
  name: z.string().min(1),
  channel: z.enum(CHANNELS),
  subject: z.string().optional().nullable(),
  body: z.string().min(1),
  variables: z.array(z.string()).default([]),
});

function parseTemplate(fd: FormData) {
  const raw = Object.fromEntries(fd.entries()) as Record<string, string>;
  return {
    name: raw.name,
    channel: raw.channel,
    subject: raw.subject || null,
    body: raw.body,
    variables: (raw.variables || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  };
}

export async function createTemplate(formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const parsed = TemplateInput.parse(parseTemplate(formData));
  await db.insert(outreachTemplates).values(parsed);
  revalidatePath("/admin/outreach/templates");
  redirect("/admin/outreach/templates");
}

export async function updateTemplate(id: string, formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const parsed = TemplateInput.parse(parseTemplate(formData));
  await db
    .update(outreachTemplates)
    .set({ ...parsed, updatedAt: new Date() })
    .where(eq(outreachTemplates.id, id));
  revalidatePath("/admin/outreach/templates");
}

export async function deleteTemplate(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  await db.delete(outreachTemplates).where(eq(outreachTemplates.id, id));
  revalidatePath("/admin/outreach/templates");
}

function fillTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

export async function renderTemplate(
  templateId: string,
  contactId: string,
): Promise<{ subject: string | null; body: string }> {
  const [t] = await db
    .select()
    .from(outreachTemplates)
    .where(eq(outreachTemplates.id, templateId))
    .limit(1);
  const [c] = await db
    .select()
    .from(contacts)
    .where(eq(contacts.id, contactId))
    .limit(1);
  if (!t || !c) throw new Error("Not found");

  const vars: Record<string, string> = {
    name: c.name,
    firstName: c.name.split(" ")[0] ?? c.name,
    role: c.role ?? "",
    company: c.company ?? "",
    city: c.city ?? "",
  };

  return {
    subject: t.subject ? fillTemplate(t.subject, vars) : null,
    body: fillTemplate(t.body, vars),
  };
}

const SendInput = z.object({
  contactId: z.string().uuid(),
  templateId: z.string().uuid().optional().nullable(),
  channel: z.enum(CHANNELS),
  subject: z.string().optional().nullable(),
  body: z.string().min(1),
  owner: z.enum(["arif", "kerem", "both"]).optional().nullable(),
  alsoSendEmail: z.coerce.boolean().default(false),
});

export async function logAndMaybeSendOutreach(formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
  const parsed = SendInput.parse({
    ...raw,
    alsoSendEmail: raw.alsoSendEmail === "on",
    templateId: raw.templateId || null,
  });

  const [c] = await db
    .select()
    .from(contacts)
    .where(eq(contacts.id, parsed.contactId))
    .limit(1);
  if (!c) throw new Error("Contact not found");

  if (parsed.alsoSendEmail && parsed.channel === "email" && c.email) {
    const apiKey = env.resendKey();
    if (!apiKey) throw new Error("RESEND_API_KEY not configured");
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: env.resendFrom(),
      to: c.email,
      subject: parsed.subject ?? "Hello",
      text: parsed.body,
    });
  }

  await db.insert(outreachLog).values({
    contactId: parsed.contactId,
    templateId: parsed.templateId,
    channel: parsed.channel,
    subject: parsed.subject ?? null,
    body: parsed.body,
    owner: parsed.owner ?? null,
  });

  await db
    .update(contacts)
    .set({
      stage: c.stage === "identified" || c.stage === "researched"
        ? "reached_out"
        : c.stage,
      lastTouchAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(contacts.id, parsed.contactId));

  revalidatePath("/admin/outreach");
  revalidatePath(`/admin/contacts/${parsed.contactId}`);
}
