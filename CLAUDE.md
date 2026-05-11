@AGENTS.md

# StackSquare

2-on-1 podcast platform for Arif Bayrak and Kerem Ozkefeli (MSc Economics & Strategy at Imperial Business School). Single Next.js 16 app on Vercel, public site at https://stacksquare.ai plus an auth-gated `/admin` CRM. Production-deployed via the `arifibayraks-projects/stacksquare` Vercel project, GitHub-connected to https://github.com/arifibayrak/stacksquare.

## Stack (locked)

- **Next.js 16.2.4** App Router, React 19, Turbopack
- **Tailwind v4** with `@theme inline` design tokens
- **Drizzle ORM** + **Neon Postgres** (Vercel Marketplace integration)
- **Clerk** auth (Vercel Marketplace), `@stacksquare.ai` email allowlist
- **AI SDK v6** with **direct `@ai-sdk/anthropic`** provider (no AI Gateway)
- **Resend** for transactional email
- **Sonner** for toast notifications (mounted globally in root layout)
- **dnd-kit** for the Kanban
- **Sharp** for `next/image` optimization

## Hard rules

1. **Privacy split.** Guest contact data, fit scores, outreach status, notes never ship to the public site. Public site reads only `episodes` where `status=published`, guest public bios, and writes form submissions to `submissions` (triaged manually in `/admin/submissions`).
2. **Email allowlist.** Only `@stacksquare.ai` accounts can use `/admin`. Enforced in two layers: code check in `src/app/admin/layout.tsx` (defense-in-depth), and Clerk dashboard restrictions (allowlist `*@stacksquare.ai`, sign-up mode `restricted`).
3. **Obsidian is gone.** A previous version had Obsidian as the CRM and a separate Next.js public site. Both were deleted. All contact data is in Neon now. Don't suggest reintroducing Obsidian.
4. **No em dashes.** User-facing copy and admin UI must avoid `—`, `–`, `&mdash;`, `&ndash;`. Use periods, commas, parens, or "to" for ranges. The page-title separator convention is `·` (middle dot).

## Conventions

- **Proxy file**: `src/proxy.ts` (NOT `src/middleware.ts` and NOT root-level `proxy.ts`). Next.js 16 renamed middleware to proxy and Clerk requires it inside `src/` when the project uses `--src-dir`.
- **Auth gating**: `src/proxy.ts` enforces a redirect to `/sign-in?redirect_url=...` for any unauthed `/admin/*` request. The admin layout in `src/app/admin/layout.tsx` is a second-layer gate that redirects unauthed users and renders a "Not authorized" screen for users whose email is not `@stacksquare.ai`.
- **Server Actions**: `src/lib/actions/{contacts,episodes,outreach,submissions,ai}.ts`. Every action calls `await auth()` and throws if `!userId`. Actions revalidate the relevant paths so server components reflect changes.
- **DB import**: Server code imports from `@/db` (which loads the postgres connection). Client components import constants and types from `@/db/schema` only — never from `@/db`, otherwise the postgres driver leaks into the client bundle.
- **AI model IDs** for `@ai-sdk/anthropic` are hyphenated (e.g. `claude-sonnet-4-6`, `claude-opus-4-7`), driven by `env.modelFast()` and `env.modelDeep()` in `src/lib/env.ts`. Do not switch to dotted Gateway-style strings (`claude-sonnet-4.6`) — those are for the AI Gateway provider, which we explicitly opted out of.
- **Force-dynamic** is set on every `/admin/*` page that reads from the DB, since Cache Components is off.
- **Pages on the public site** that read from the DB also export `dynamic = "force-dynamic"`.
- **`vercel.json` (not `vercel.ts`)** is the project config. The `@vercel/config` package was unstable on the build runner; we reverted to JSON.
- **Git committer email** must be `264016086+arifibayrak@users.noreply.github.com`. Personal `@imperial.ac.uk` and similar emails will be rejected by Vercel's GitHub gate ("could not associate the committer with a GitHub user"). Local repo's `user.email` is already set; do not change it.

## Design system

- **Public site aesthetic**: Notion-inspired calm presentation. Cream paper background (`#fbfaf8`), near-black ink (`#1a1a1a`), 18px base font, subtle 72px square grid via two `linear-gradient` body backgrounds, generous vertical padding.
- **Brand palette tokens** in `src/app/globals.css`:
  - `--color-paper`, `--color-paper-soft`, `--color-ink`, `--color-ink-soft`, `--color-ink-muted`, `--color-rule`
  - `--color-brand-{50,500,600,700}` (purple accent, used sparingly)
  - `--color-phase-{sourcing,outreach,production,maintained}` for the kanban phase stripes
- **Logo**: `src/components/logo-mark.tsx` renders a 2x2 grid of rounded squares (three ink, one brand) — mirrors the four-lenses identity. The same SVG is `src/app/icon.svg` for the favicon.
- **Hero copy** is three parallel statements: `Strategy meets capital. / Stack meets psychology. / We meet in the square.`
- **Four lenses framework** is the content backbone: Technology Stack · Capital Structure & Investment Thesis · Strategic Planning & Management · Psychology & Decision Making. Every interview maps these onto the guest's domain.

## Admin layout

- **Sidebar** at `src/components/admin/sidebar.tsx` groups links into Pipeline / Outreach / Content / AI sections.
- **Pipeline (`/admin/pipeline`)** is a 4-phase super-column kanban. Each phase contains its sub-stages as nested `useDroppable` zones. The 9-stage data model is preserved; the grouping is purely UI. Drag fires `moveContactStage` and a toast.
  - Phase 1 — Sourcing: identified, researched
  - Phase 2 — Outreach: reached_out, replying
  - Phase 3 — Production: booked, recorded, published
  - Phase 4 — Maintained: long_term, dormant
- **Cards** show priority dot, owner initials chip, next action, smart due label (Today / Tomorrow / In Nd / Nd overdue / date).
- **QuickPill** (`src/components/admin/quick-pill.tsx`) is the reusable "click pill, change value, fire server action, toast" component. Used in the contact detail header for Stage / Priority / Owner.

## Founder photos

- Real headshots live at `public/founders/arif.png` and `public/founders/kerem.jpeg`.
- Source files are in `~/Desktop/Desktop - Arif MacBook Air/stacksquare/Stacksquare Community/`.
- `src/components/initials-avatar.tsx` accepts an optional `src` prop. With `src`, it renders a fixed-size wrapper div containing `<Image fill>` to avoid flex stretching.
- Avatar size on `/about` is 144px in a circular crop.

## Deploy workflow

1. `git push origin main` triggers Vercel auto-deploy.
2. `vercel --prod` from the local repo also works and surfaces errors synchronously.
3. After deploy `Ready`, smoke-probe with `curl -sI https://stacksquare.ai/admin` (expect 307 to `/sign-in`).
4. Vercel dashboard project: `arifibayraks-projects/stacksquare` (org `team_wLTqPcxNCSlmr2F7baYexLcg`, project id `prj_Ndh6PPZV8sManASBgMDolLxk3xfh`).

## Common scripts

- `pnpm dev` — local Turbopack dev server on http://localhost:3000
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm db:push` — push Drizzle schema to the dev DB. For prod, pull prod env first: `vercel env pull .env.production.local --environment=production && pnpm dlx dotenv-cli -e .env.production.local -- pnpm db:push`
- `pnpm db:studio` — open Drizzle Studio against the local DB

## Outstanding work (logged, not blocking)

- Cmd+K command palette across admin
- Bulk-select on contacts table with multi-move
- Auto-save on the contact form (currently explicit Save)
- Inline edit on existing outreach templates (currently create-only)
- Sticky column headers on tall kanban columns
- Real-time multi-user updates (only two users, not currently a problem)
