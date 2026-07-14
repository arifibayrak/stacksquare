import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db, gmailAccounts } from "@/db";
import { env } from "@/lib/env";
import { exchangeCode, getProfileEmail, encryptToken } from "@/lib/gmail";

// Admin-only OAuth callback. Exchanges the code, reads the mailbox address, and
// stores the ENCRYPTED refresh token keyed by founder. One mailbox per founder.
export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const owner = url.searchParams.get("state") === "kerem" ? "kerem" : "arif";
  if (!code) {
    return NextResponse.redirect(
      new URL("/admin/outreach?gmail=error", request.url),
    );
  }

  const redirectUri = `${env.siteUrl()}/api/gmail/callback`;
  try {
    const { accessToken, refreshToken } = await exchangeCode(code, redirectUri);
    // Google returns a refresh token only when access_type=offline +
    // prompt=consent (which authUrl sets). Missing => re-consent required.
    if (!refreshToken) {
      return NextResponse.redirect(
        new URL("/admin/outreach?gmail=norefresh", request.url),
      );
    }
    const email = await getProfileEmail(accessToken);
    const refreshTokenEnc = encryptToken(refreshToken);

    await db
      .insert(gmailAccounts)
      .values({ owner, email, refreshTokenEnc, status: "connected" })
      .onConflictDoUpdate({
        target: gmailAccounts.owner,
        set: {
          email,
          refreshTokenEnc,
          status: "connected",
          updatedAt: new Date(),
        },
      });

    return NextResponse.redirect(
      new URL("/admin/outreach?gmail=connected", request.url),
    );
  } catch {
    return NextResponse.redirect(
      new URL("/admin/outreach?gmail=error", request.url),
    );
  }
}
