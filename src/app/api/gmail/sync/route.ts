import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { env } from "@/lib/env";
import { syncGmailAccount } from "@/lib/gmail-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Runs the Gmail sync for both founders. Authorized either by the Vercel cron
// (Authorization: Bearer CRON_SECRET) or by a signed-in admin (manual "Sync
// now" button).
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
  const results = [];
  for (const owner of ["arif", "kerem"] as const) {
    try {
      results.push(await syncGmailAccount(owner));
    } catch (err) {
      results.push({
        owner,
        logged: 0,
        skipped: 0,
        errors: 1,
        error: err instanceof Error ? err.message : "failed",
      });
    }
  }
  return NextResponse.json({ ok: true, results });
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
