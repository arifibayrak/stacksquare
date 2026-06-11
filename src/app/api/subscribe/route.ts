import { NextResponse } from "next/server";
import { z } from "zod";
import { db, subscribers } from "@/db";
import { Resend } from "resend";
import { env } from "@/lib/env";

const Body = z.object({
  email: z.string().email().max(320),
});

export async function POST(req: Request) {
  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const email = parsed.email.trim().toLowerCase();

  // Unique index on email makes re-subscribing a quiet no-op.
  const inserted = await db
    .insert(subscribers)
    .values({ email })
    .onConflictDoNothing({ target: subscribers.email })
    .returning();

  const apiKey = env.resendKey();
  const notify = env.notifyEmails();
  if (inserted.length > 0 && apiKey && notify.length > 0) {
    try {
      const resend = new Resend(apiKey);
      await resend.emails.send({
        from: env.resendFrom(),
        to: notify,
        subject: "New subscriber · StackSquare",
        html: `<p><strong>email</strong>: ${email}</p>`,
      });
    } catch (err) {
      console.error("[subscribe] resend notify failed", err);
    }
  }

  return NextResponse.json({ ok: true });
}
