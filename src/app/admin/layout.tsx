import { auth, currentUser } from "@clerk/nextjs/server";
import { SignOutButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/sidebar";

export const metadata = { title: "Admin · StackSquare" };

// Server-side auth gate. Every /admin/* request lands here.
// 1. No session -> redirect to /sign-in.
// 2. Session but email is not @stacksquare.ai -> render an inline
//    "not authorized" screen with a sign-out button.
export const dynamic = "force-dynamic";

const ALLOWED_DOMAIN = "stacksquare.ai";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in?redirect_url=/admin");
  }

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const allowed = email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`);

  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-lg text-center">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
            Not authorized
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-4xl">
            Admin is restricted to {ALLOWED_DOMAIN} accounts.
          </h1>
          <p className="mt-6 text-base leading-relaxed text-[var(--color-ink-soft)]">
            You are signed in as{" "}
            <strong className="text-[var(--color-ink)]">{email || "an unknown account"}</strong>.
            Sign out and try with a {ALLOWED_DOMAIN} email.
          </p>
          <SignOutButton redirectUrl="/sign-in">
            <button
              type="button"
              className="mt-10 rounded-md bg-[var(--color-ink)] px-6 py-3 text-sm font-medium text-[var(--color-paper)] transition-opacity hover:opacity-80"
            >
              Sign out
            </button>
          </SignOutButton>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 overflow-x-hidden bg-zinc-50 dark:bg-zinc-950">
        {children}
      </main>
    </div>
  );
}
