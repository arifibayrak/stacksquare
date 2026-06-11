import { SiteNav, SiteFooter } from "@/components/site-nav";

/**
 * Wraps every public page in the dark "archive" theme. The token overrides
 * live on this wrapper (.public-dark) so /admin keeps the light theme.
 */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="public-dark grain flex min-h-screen flex-col">
      <SiteNav />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
