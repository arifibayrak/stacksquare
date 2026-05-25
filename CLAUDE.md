@AGENTS.md

# StackSquare

Events organization for Arif Bayrak and Kerem Ozkefeli (MSc Economics & Strategy at Imperial Business School). StackSquare runs fireside rooms, expert sessions, and peer gatherings; **Luma** is the registration/ticketing engine and the public site is the branded front door. Single Next.js 16 app on Vercel, public site at https://stacksquare.ai plus an auth-gated `/admin` CRM. Production-deployed via the `arifibayraks-projects/stacksquare` Vercel project, GitHub-connected to https://github.com/arifibayrak/stacksquare.

> **History:** This was a 2-on-1 podcast platform until the 2026-05 events pivot. The podcast public routes (`/episodes`, `/guests`, `/guest`, `/fireside`, `/apply`) were removed; the homepage and `/about` were reframed for events; a public `/grill-me` page (the event series brand) and an `/admin/events` section were added. The `episodes` table and the orphaned `/admin/episodes/*` pages are left in place (non-destructive) but unlinked from nav. The CRM (contacts, pipeline, outreach, AI, submissions) is unchanged.

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

1. **Privacy split.** Contact/CRM data, fit scores, outreach status, and internal notes never ship to the public site. The public site reads only published `events` and writes form submissions to `submissions` (triaged manually in `/admin/submissions`). Event `notes` are internal-only and must never render publicly.
   - **Luma = embed, not sync.** No Luma API key, no event data synced to Neon. The Luma calendar (`cal-n7SwFY8KZTFPZTL`) is embedded **inside the admin** (`/admin/events`) for the team to see scheduled registrations; the public site does **not** embed Luma. Instead, the public `/grill-me` page renders curated `events` rows as branded cards (upcoming + past recaps), each optionally linking out to its `lumaUrl`. `app_settings.luma_calendar` holds the admin calendar id (env `NEXT_PUBLIC_LUMA_CALENDAR_ID` is the fallback); `src/components/luma-embed.tsx` renders the iframe (luma.com domain). `src/lib/events.ts#getPublishedEvents()` splits published events into upcoming/past for the public pages.
2. **Email allowlist.** Only `@stacksquare.ai` accounts can use `/admin`. Enforced in two layers: code check in `src/app/admin/layout.tsx` (defense-in-depth), and Clerk dashboard restrictions (allowlist `*@stacksquare.ai`, sign-up mode `restricted`).
3. **Obsidian is gone.** A previous version had Obsidian as the CRM and a separate Next.js public site. Both were deleted. All contact data is in Neon now. Don't suggest reintroducing Obsidian.
4. **No em dashes.** User-facing copy and admin UI must avoid `—`, `–`, `&mdash;`, `&ndash;`. Use periods, commas, parens, or "to" for ranges. The page-title separator convention is `·` (middle dot).

## Conventions

- **Proxy file**: `src/proxy.ts` (NOT `src/middleware.ts` and NOT root-level `proxy.ts`). Next.js 16 renamed middleware to proxy and Clerk requires it inside `src/` when the project uses `--src-dir`.
- **Auth gating**: `src/proxy.ts` enforces a redirect to `/sign-in?redirect_url=...` for any unauthed `/admin/*` request. The admin layout in `src/app/admin/layout.tsx` is a second-layer gate that redirects unauthed users and renders a "Not authorized" screen for users whose email is not `@stacksquare.ai`.
- **Server Actions**: `src/lib/actions/{contacts,events,episodes,outreach,submissions,ai}.ts`. Every action calls `await auth()` and throws if `!userId`. Actions revalidate the relevant paths so server components reflect changes. `events.ts` also revalidates the public `/` and `/events`.
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
- **Four lenses framework** is the content backbone: Technology Stack · Capital Structure & Investment Thesis · Strategic Planning & Management · Psychology & Decision Making. Every event maps these onto the speaker's domain (reframed from the podcast era, where it mapped onto the guest's domain).

## Admin layout

- **Sidebar** at `src/components/admin/sidebar.tsx` groups links into Pipeline / Outreach / Events / Inbox / AI sections.
- **Events (`/admin/events`)** is the team's event hub: it embeds the live Luma calendar (registrations live on Luma), hosts `LumaSettings` (`src/components/admin/luma-settings.tsx`) to choose which calendar id is embedded, and manages the curated `events` rows that publish to the public `/grill-me` page. CRUD: list grouped by status (draft/published/archived), `/admin/events/new`, `/admin/events/[id]` edit via `EventForm` (`src/components/admin/event-form.tsx`). Public surface: `/grill-me` (`src/app/grill-me/page.tsx`) renders published rows as `EventCard`s; the homepage shows up to 3 highlights. `featured` flags a card; `notes` are internal-only. Row type is `EventItem` (not `Event`, to avoid the DOM global).
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
- `pnpm db:push` — push Drizzle schema to the dev DB. The DB URL lives in `.env.local` (there is no `.env`), and `drizzle.config.ts` only loads `.env` via `dotenv/config`, so prefix the push: `pnpm dlx dotenv-cli -e .env.local -- pnpm db:push`. For prod: `vercel env pull .env.production.local --environment=production && pnpm dlx dotenv-cli -e .env.production.local -- pnpm db:push`.
  - **Caveat:** `drizzle-kit push` opens an interactive TUI prompt (needs a TTY) whenever it must resolve enum/table renames, which fails in a non-interactive agent shell. When adding purely-additive objects (new enum/table/column), run `db:push` yourself in a real terminal, or apply the additive DDL directly against `DATABASE_URL` (idempotent `CREATE TYPE`/`CREATE TABLE IF NOT EXISTS`). The project is push-only (no `drizzle/` migrations folder); do not commit generated baseline migrations.
- `pnpm db:studio` — open Drizzle Studio against the local DB

## Events / Luma env

- `NEXT_PUBLIC_LUMA_CALENDAR_ID` — fallback Luma calendar id (`cal-xxxxxxxx`) or full embed URL for the public events embeds. The admin-managed `app_settings.luma_calendar` overrides it. Set the real value in `.env.local` and in Vercel project env.

## Outstanding work (logged, not blocking)

- Cmd+K command palette across admin
- Bulk-select on contacts table with multi-move
- Auto-save on the contact form (currently explicit Save)
- Inline edit on existing outreach templates (currently create-only)
- Sticky column headers on tall kanban columns
- Real-time multi-user updates (only two users, not currently a problem)
