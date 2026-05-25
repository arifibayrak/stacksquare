# Roadmap · Events Pivot

Two phases. Phase 1 is outward-facing (the public site visitors see). Phase 2 is the
private operations layer (admin). Phase 1 ships value on its own; Phase 2 makes it
self-serve to manage.

---

## Phase 1 — Public site becomes an events front door

**Status:** complete (2026-05-25)
**Goal:** A visitor to stacksquare.ai sees an events organization (not a podcast), can browse
upcoming events via a Luma embed, and registers on Luma. No podcast routes or links remain.
**Requirements:** REQ-01, REQ-02, REQ-03, REQ-04, REQ-05, REQ-06

### Tasks

1. **Strip podcast routes.** Delete `src/app/episodes`, `src/app/episodes/[slug]`,
   `src/app/guests`, `src/app/guest`, `src/app/fireside`, `src/app/apply`. Remove the
   `submission-form` "apply"/"guest" variants if standalone; keep the contact path.
2. **Events page.** Add `src/app/events/page.tsx` (`force-dynamic`): brand shell + intro copy
   + Luma calendar embed (iframe pointed at a calendar id from `env`/setting). Add a small
   `LumaEmbed` component (`src/components/luma-embed.tsx`) wrapping the iframe/script.
3. **Homepage rewrite.** Reposition hero subcopy and section copy for events; add an
   "Upcoming" section using the Luma embed; reframe the four PILLARS as event themes. Keep
   the three-line brand hero. No em dashes, `·` separators.
4. **Nav + footer.** `site-nav.tsx` links become Events · About · Contact. Remove podcast
   links/format-B fireside references from footer.
5. **About reframe.** Rewrite `/about` copy for an events organization (founders stay).
6. **SEO/metadata.** Update titles/descriptions/OG copy from podcast to events wording.

**Verification:** `pnpm typecheck` clean; no route or link references a removed page;
`/events` renders the Luma embed; homepage reads as events-first; grep finds zero em dashes
in changed files.

---

## Phase 2 — Events admin + schema

**Status:** complete (2026-05-25)
**Goal:** From `/admin`, an authed `@stacksquare.ai` user can create, edit, publish, and order
the events the public site shows, and set the Luma calendar the embeds point at, while the
existing CRM keeps working unchanged.
**Requirements:** REQ-07, REQ-08, REQ-09, REQ-10, REQ-11, REQ-12
**Depends on:** Phase 1

### Tasks

1. **Schema.** Add `events` table + `eventStatusEnum` to `src/db/schema.ts` with exported
   types and label constants. `pnpm db:push` to dev; document the prod push.
2. **Settings row.** Add a tiny `siteSettings` (or reuse a key/value) store for the Luma
   calendar id so it is editable without redeploy; env provides the default.
3. **Server actions.** `src/lib/actions/events.ts`: `createEvent`, `updateEvent`,
   `deleteEvent`, `setEventStatus`, `setLumaCalendar` — all `await auth()`-gated, all
   `revalidatePath` the public `/events`, `/`, and admin pages.
4. **Admin UI.** `/admin/events` list (status + featured + order), `/admin/events/new`,
   `/admin/events/[id]` edit, via a new `EventForm` component. Wire QuickPill-style status
   toggle if it fits cleanly.
5. **Sidebar + dashboard.** Add an Events group to `sidebar.tsx`; retire the Episodes link
   (REQ-12). Add an upcoming-events card to the admin dashboard.
6. **Public wiring.** Point Phase 1's `/events` and homepage embeds at the admin-managed
   Luma calendar id / featured event.

**Verification:** `pnpm typecheck` clean; CRUD an event in admin and see it reflected on
`/events` / homepage; CRM pages (contacts, pipeline, outreach, submissions, AI) still load;
`curl -sI https://stacksquare.ai/admin` returns 307 to `/sign-in` after deploy.

---

## Sequencing note

Phase 1 can deploy and be useful before Phase 2 exists (the events embed can point at a
hardcoded Luma calendar id via env initially; Phase 2 makes that editable and adds curation).
