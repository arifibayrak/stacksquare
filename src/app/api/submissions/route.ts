import { NextResponse } from "next/server";
import { z } from "zod";
import { db, submissions } from "@/db";
import { Resend } from "resend";
import { env } from "@/lib/env";

const Body = z.object({
  kind: z.enum(["apply", "guest", "contact"]),
  payload: z.record(z.string(), z.unknown()),
});

export async function POST(req: Request) {
  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const [row] = await db
    .insert(submissions)
    .values({ kind: parsed.kind, payload: parsed.payload })
    .returning();

  const apiKey = env.resendKey();
  const notify = env.notifyEmails();
  if (apiKey && notify.length > 0) {
    try {
      const resend = new Resend(apiKey);
      const fields = Object.entries(parsed.payload)
        .map(([k, v]) => `<p><strong>${k}</strong>: ${String(v)}</p>`)
        .join("\n");
      await resend.emails.send({
        from: env.resendFrom(),
        to: notify,
        subject: `New ${parsed.kind} submission — StackSquare`,
        html: `<h2>${parsed.kind} submission</h2>${fields}<p>Triage in /admin.</p>`,
      });
    } catch (err) {
      console.error("[submissions] resend notify failed", err);
    }
  }

  return NextResponse.json({ id: row.id });
}
