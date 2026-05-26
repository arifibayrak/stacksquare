# State · Events Pivot

**Created:** 2026-05-25
**Mode:** interactive · balanced
**Milestone:** v2 Events Pivot (repurpose podcast platform → events organization)

## Current position

- Phase 1 + Phase 2 built and verified locally (typecheck clean, `pnpm build` succeeds). Not yet pushed/deployed.
- Phase 1: complete. Phase 2: complete.

### Revision 2026-05-25 (post-build, per user)

- Luma calendar embed moved from the public site **into `/admin/events`** (calendar
  `cal-n7SwFY8KZTFPZTL`, set as `NEXT_PUBLIC_LUMA_CALENDAR_ID` in `.env.local`).
- Public events page briefly renamed `/events` -> `/grill-me`, then renamed BACK to
  **`/events`** (2026-05-26) with neutral copy; "Grill Me" freed for an AI skill elsewhere.
  It shows published `events`
  rows as cards (upcoming + past), not a Luma iframe. Homepage shows up to 3 highlights.
- New: `src/lib/events.ts` (getPublishedEvents), `src/components/event-card.tsx`,
  `src/app/grill-me/`. Removed: `src/app/events/`, `src/lib/luma.ts` (dead). `LumaEmbed`
  now targets the luma.com domain. Build re-verified clean.

## Locked decisions

- Luma = embed (no API key / no sync). Events table stores curated references only.
- Podcast public routes removed; CRM kept; Events admin added; brand kept, copy reframed.

## Key context for executors

- This is a live production site (stacksquare.ai). Phase 1 deletes public routes and rewrites
  the homepage — outward-facing, confirm before deploy.
- Read `node_modules/next/dist/docs/` before writing Next.js 16 code (per AGENTS.md).
- Client components import only from `@/db/schema`, never `@/db`.
- Every `/admin/*` and DB-reading public page exports `dynamic = "force-dynamic"`.
- Model IDs hyphenated. Committer email fixed. No em dashes. `·` separator.

## Open questions

- Luma calendar id / event URLs to embed (need the real lu.ma calendar from the user before
  the embed renders real data; Phase 1 can ship with a placeholder env var).

## Next action

- User to review on localhost (`pnpm dev`), paste the real lu.ma calendar URL (env or admin), then approve push/deploy.
- Prod DB needs the additive schema: the `events` + `app_settings` tables and `event_status` enum (apply via `db:push` in a TTY against prod env, or the additive DDL).
- Optional follow-up: delete the orphaned `/admin/episodes/*` pages and the `episodes` table if the podcast era is fully retired.
