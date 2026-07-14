import { currentUser } from "@clerk/nextjs/server";

// Maps the signed-in Clerk user to a founder identity. Mirrors the
// ALLOWED_EMAILS gate in src/app/admin/layout.tsx: only the two founder
// accounts resolve; anything else returns null.
export async function currentOwner(): Promise<"arif" | "kerem" | null> {
  const user = await currentUser();
  const email = (user?.primaryEmailAddress?.emailAddress ?? "").toLowerCase();
  if (email === "arif@stacksquare.ai") return "arif";
  if (email === "kerem@stacksquare.ai") return "kerem";
  return null;
}
