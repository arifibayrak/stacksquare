// Auth + CORS shared by the Stacksquare Scout extension endpoints
// (`/api/capture`, `/api/extract`, `/api/segments`). Every founder has their
// own API key, set only in Vercel env, so each request is attributed to
// whoever was browsing.

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
};

export type CaptureOwner = "arif" | "kerem";

/** Resolve the founder behind an X-API-Key header, or null if unrecognised. */
export function ownerForKey(key: string | null): CaptureOwner | null {
  if (!key) return null;
  if (process.env.EXTENSION_KEY_ARIF && key === process.env.EXTENSION_KEY_ARIF)
    return "arif";
  if (
    process.env.EXTENSION_KEY_KEREM &&
    key === process.env.EXTENSION_KEY_KEREM
  )
    return "kerem";
  return null;
}
