import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/sidebar";

export const metadata = { title: "Admin · StackSquare" };

// Server-side auth gate. Every /admin/* request lands here. Unauthed
// requests get a 307 to /sign-in with the original path preserved as
// redirect_url, so the user lands back where they were trying to go
// after signing in. Works in dev and prod regardless of middleware.
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in?redirect_url=/admin");
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
