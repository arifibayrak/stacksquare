function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

// Model IDs use the @ai-sdk/anthropic AnthropicMessagesModelId format
// (hyphenated, e.g. "claude-sonnet-4-6"). Override via env to swap models
// without code changes. Keep these defaults in sync with the SDK type union.
const FAST_DEFAULT = ["claude", "sonnet", "4", "6"].join("-");
const DEEP_DEFAULT = ["claude", "opus", "4", "7"].join("-");
// Outreach summarization is a summarize + light-extraction job, not deep
// reasoning, so it defaults to Sonnet: near-Opus quality at lower cost/latency,
// which matters when the Gmail cron summarizes many threads. Override with
// ANTHROPIC_MODEL_OUTREACH (e.g. a Haiku id for the cheapest option).
const OUTREACH_DEFAULT = ["claude", "sonnet", "4", "6"].join("-");

export const env = {
  databaseUrl: () => required("DATABASE_URL"),
  anthropicKey: () => required("ANTHROPIC_API_KEY"),
  openaiKey: () => process.env.OPENAI_API_KEY,
  resendKey: () => process.env.RESEND_API_KEY,
  resendFrom: () => process.env.RESEND_FROM_EMAIL ?? "hello@stacksquare.ai",
  notifyEmails: () =>
    (process.env.NOTIFY_EMAILS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  siteUrl: () => process.env.NEXT_PUBLIC_SITE_URL ?? "https://stacksquare.ai",
  // Luma calendar id (e.g. "cal-xxxxxxxx") or a full embed URL. Used as the
  // default events source until an admin-managed value overrides it (Phase 2).
  lumaCalendarId: () => process.env.NEXT_PUBLIC_LUMA_CALENDAR_ID ?? null,
  modelFast: () => process.env.ANTHROPIC_MODEL_FAST ?? FAST_DEFAULT,
  modelDeep: () => process.env.ANTHROPIC_MODEL_DEEP ?? DEEP_DEFAULT,
  modelOutreach: () =>
    process.env.ANTHROPIC_MODEL_OUTREACH ?? OUTREACH_DEFAULT,
  // Gmail sync (Phase 2). Configured only when the founders connect Gmail.
  googleClientId: () => required("GOOGLE_CLIENT_ID"),
  googleClientSecret: () => required("GOOGLE_CLIENT_SECRET"),
  // 32-byte key (hex or base64) for encrypting Gmail refresh tokens at rest.
  gmailTokenKey: () => required("GMAIL_TOKEN_KEY"),
  // Shared secret the Vercel cron sends as `Authorization: Bearer ...`.
  cronSecret: () => process.env.CRON_SECRET,
};
