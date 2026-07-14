import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { env } from "@/lib/env";
import { authUrl } from "@/lib/gmail";

// Admin-only. Kicks off Gmail OAuth for a founder. The chosen founder rides in
// `state`; the callback verifies the Clerk session again before storing.
export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  const url = new URL(request.url);
  const owner = url.searchParams.get("owner") === "kerem" ? "kerem" : "arif";
  const redirectUri = `${env.siteUrl()}/api/gmail/callback`;
  return NextResponse.redirect(authUrl(redirectUri, owner));
}
