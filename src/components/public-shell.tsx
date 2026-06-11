import { existsSync } from "node:fs";
import path from "node:path";
import { SiteNav, SiteFooter } from "@/components/site-nav";

/**
 * Wraps every public page in the dark "archive" theme. The token overrides
 * live on this wrapper (.public-dark) so /admin keeps the light theme.
 *
 * Background video: when public/hero-bg.mp4 exists it plays fixed behind the
 * entire page (every section, all routes using this shell), dimmed by an
 * overlay so content stays readable. Hidden for reduced-motion users.
 */
export function PublicShell({ children }: { children: React.ReactNode }) {
  const hasVideo = existsSync(
    path.join(process.cwd(), "public", "hero-bg.mp4"),
  );

  return (
    <div className="public-dark grain relative flex min-h-screen flex-col">
      {hasVideo && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0 motion-reduce:hidden"
        >
          <video
            src="/hero-bg.mp4"
            autoPlay
            muted
            loop
            playsInline
            className="h-full w-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-[rgba(14,13,11,0.55)]" />
        </div>
      )}
      <div className="relative z-10 flex min-h-screen flex-col">
        <SiteNav />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </div>
    </div>
  );
}
