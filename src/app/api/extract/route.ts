import { NextResponse } from "next/server";
import { z } from "zod";
import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { env } from "@/lib/env";

// Stateless field extraction for the Scout panel's "Scan profile" button.
// Reads the visible LinkedIn page text and returns CRM fields. No DB write.

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
};

const Body = z.object({
  pageText: z.string().min(1).max(40000),
});

const Extracted = z.object({
  name: z.string().nullable(),
  role: z.string().nullable(),
  company: z.string().nullable(),
  city: z.string().nullable(),
  headline: z.string().nullable(),
});

function authed(key: string | null): boolean {
  return (
    (!!process.env.EXTENSION_KEY_ARIF &&
      key === process.env.EXTENSION_KEY_ARIF) ||
    (!!process.env.EXTENSION_KEY_KEREM &&
      key === process.env.EXTENSION_KEY_KEREM)
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: Request) {
  if (!authed(request.headers.get("x-api-key"))) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: CORS_HEADERS },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400, headers: CORS_HEADERS },
    );
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  try {
    const { output } = await generateText({
      model: anthropic(env.modelFast()),
      output: Output.object({ schema: Extracted }),
      system:
        "You extract CRM fields from the visible text of a LinkedIn profile page. " +
        "Return the profile owner's full name, their current primary role title, " +
        "the company of that role, and their city/location (short form, e.g. 'London'). " +
        "headline is the short tagline under their name. " +
        "Prefer the most recent position marked Present. Ignore navigation text, " +
        "ads, 'people also viewed', and any profiles other than the page owner. " +
        "Use null when a field is genuinely absent.",
      prompt: parsed.data.pageText,
    });
    return NextResponse.json(output, { status: 200, headers: CORS_HEADERS });
  } catch (err) {
    console.error("[extract] failed", err);
    return NextResponse.json(
      { error: "Extraction failed" },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
