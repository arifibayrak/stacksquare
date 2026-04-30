import { AdminSidebar } from "@/components/admin/sidebar";

export const metadata = { title: "Admin — StackSquare" };

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 overflow-x-hidden bg-zinc-50 dark:bg-zinc-950">
        {children}
      </main>
    </div>
  );
}
