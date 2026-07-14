import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";
import { env } from "@/lib/env";

// Thin Gmail REST client (Phase 2). Uses plain fetch against the official Gmail
// API with OAuth refresh tokens (no scraping; see docs/adr/0004). Refresh
// tokens are encrypted at rest with AES-256-GCM. Message bodies are read only
// to summarize and are never persisted.

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

export const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

// --- Token encryption ------------------------------------------------------

function tokenKey(): Buffer {
  const raw = env.gmailTokenKey();
  // Accept hex (64 chars) or base64; must decode to 32 bytes.
  const buf = /^[0-9a-fA-F]{64}$/.test(raw)
    ? Buffer.from(raw, "hex")
    : Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    throw new Error("GMAIL_TOKEN_KEY must decode to 32 bytes (hex or base64)");
  }
  return buf;
}

export function encryptToken(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", tokenKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptToken(payload: string): string {
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", tokenKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString(
    "utf8",
  );
}

// --- OAuth -----------------------------------------------------------------

export function authUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: env.googleClientId(),
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: GMAIL_SCOPE,
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCode(
  code: string,
  redirectUri: string,
): Promise<{ accessToken: string; refreshToken: string | null }> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.googleClientId(),
      client_secret: env.googleClientSecret(),
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
  };
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
  };
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: env.googleClientId(),
      client_secret: env.googleClientSecret(),
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

async function gmailGet<T>(accessToken: string, path: string): Promise<T> {
  const res = await fetch(`${GMAIL_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Gmail GET ${path} failed: ${res.status}`);
  return (await res.json()) as T;
}

export async function getProfileEmail(accessToken: string): Promise<string> {
  const p = await gmailGet<{ emailAddress: string }>(accessToken, "/profile");
  return p.emailAddress;
}

export async function listThreadIds(
  accessToken: string,
  query: string,
  maxResults = 50,
): Promise<string[]> {
  const q = encodeURIComponent(query);
  const data = await gmailGet<{ threads?: { id: string }[] }>(
    accessToken,
    `/threads?q=${q}&maxResults=${maxResults}`,
  );
  return (data.threads ?? []).map((t) => t.id);
}

type GmailHeader = { name: string; value: string };
type GmailPart = {
  mimeType?: string;
  body?: { data?: string; size?: number };
  parts?: GmailPart[];
  headers?: GmailHeader[];
};
type GmailMessage = {
  id: string;
  internalDate?: string;
  payload?: GmailPart & { headers?: GmailHeader[] };
};
export type GmailThread = { id: string; messages?: GmailMessage[] };

export async function getThread(
  accessToken: string,
  threadId: string,
): Promise<GmailThread> {
  return gmailGet<GmailThread>(accessToken, `/threads/${threadId}?format=full`);
}

// --- Body extraction -------------------------------------------------------

function header(headers: GmailHeader[] | undefined, name: string): string {
  const h = headers?.find((x) => x.name.toLowerCase() === name.toLowerCase());
  return h?.value ?? "";
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data, "base64url").toString("utf8");
}

/** Walk the MIME tree for the best text/plain body (fallback: stripped html). */
function extractBody(part: GmailPart | undefined): string {
  if (!part) return "";
  if (part.mimeType === "text/plain" && part.body?.data) {
    return decodeBase64Url(part.body.data);
  }
  if (part.parts) {
    for (const p of part.parts) {
      const found = extractBody(p);
      if (found) return found;
    }
  }
  if (part.mimeType === "text/html" && part.body?.data) {
    return decodeBase64Url(part.body.data).replace(/<[^>]+>/g, " ");
  }
  return "";
}

/** Drop quoted replies / signatures so the summary sees only the new content. */
export function stripQuoted(text: string): string {
  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  for (const line of lines) {
    if (/^\s*On .+wrote:\s*$/.test(line)) break;
    if (/^-{2,}\s*Original Message\s*-{2,}/i.test(line)) break;
    if (/^\s*>/.test(line)) continue;
    out.push(line);
  }
  return out
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export type ParsedEmail = {
  from: string;
  fromEmail: string | null;
  to: string;
  date: string;
  subject: string;
  text: string;
  internalDate: number | null;
};

function emailFromHeader(value: string): string | null {
  const m = value.match(/<([^>]+)>/);
  const raw = (m ? m[1] : value).trim().toLowerCase();
  return /.+@.+\..+/.test(raw) ? raw : null;
}

export function parseMessage(msg: GmailMessage): ParsedEmail {
  const headers = msg.payload?.headers;
  const fromRaw = header(headers, "From");
  return {
    from: fromRaw,
    fromEmail: emailFromHeader(fromRaw),
    to: header(headers, "To"),
    date: header(headers, "Date"),
    subject: header(headers, "Subject"),
    text: stripQuoted(extractBody(msg.payload)).slice(0, 8000),
    internalDate: msg.internalDate ? Number(msg.internalDate) : null,
  };
}
