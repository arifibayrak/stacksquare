import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { env } from "@/lib/env";
import { getAgenda, type Founder } from "@/lib/agenda";
import { sendDigestEmail } from "@/lib/notify";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Authorized by the Vercel cron (Authorization: Bearer CRON_SECRET) or by a
// signed-in admin (so "Send test digest" can be triggered manually). Same shape
// as /api/gmail/sync.
async function authorized(request: Request): Promise<boolean> {
  const secret = env.cronSecret();
  if (secret) {
    const header = request.headers.get("authorization");
    if (header === `Bearer ${secret}`) return true;
  }
  const { userId } = await auth();
  return Boolean(userId);
}

async function run(request: Request) {
  if (!(await authorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ?slot=am | pm. The afternoon run only sends when something is still
  // overdue or due today, so it does not repeat a quiet morning.
  const slot = new URL(request.url).searchParams.get("slot") === "pm" ? "pm" : "am";

  const results: Array<{ owner: Founder; sent: boolean; reason?: string }> = [];
  for (const owner of ["arif", "kerem"] as const) {
    const agenda = await getAgenda(owner);
    const pressing = agenda.overdue.length + agenda.today.length;
    const anything = pressing + agenda.noDeadline.length;

    if (anything === 0) {
      results.push({ owner, sent: false, reason: "nothing due" });
      continue;
    }
    if (slot === "pm" && pressing === 0) {
      results.push({ owner, sent: false, reason: "pm: nothing pressing" });
      continue;
    }
    const sent = await sendDigestEmail(owner, agenda, slot);
    results.push({ owner, sent });
  }

  return NextResponse.json({ ok: true, slot, results });
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
