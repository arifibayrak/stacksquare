import { auth } from "@clerk/nextjs/server";
import { AdminSidebar } from "@/components/admin/sidebar";

export const metadata = { title: "Admin · StackSquare" };

// Defense-in-depth gate: every /admin/* request runs through this layout
// before any child page renders. If the request is unauthenticated,
// auth.protect() redirects to /sign-in. This works regardless of whether
// Next.js 16's proxy.ts middleware convention is picked up by Clerk.
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await auth.protect();

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 overflow-x-hidden bg-zinc-50 dark:bg-zinc-950">
        {children}
      </main>
    </div>
  );
}
