# Requirements · Events Pivot

Scope: v1 = this milestone. Each requirement maps to a phase in ROADMAP.md.

## v1 (in scope)

### Public site (Phase 1)

- **REQ-01** Remove podcast public routes: `/episodes`, `/episodes/[slug]`, `/guests`,
  `/guest`, `/fireside`, `/apply`. No dead links remain in nav, footer, or homepage.
- **REQ-02** Homepage repositions StackSquare as an events organization: new hero subcopy,
  an "upcoming events" surface driven by a Luma embed, four-lenses reframed as event themes.
  Hero brand line ("Strategy meets capital / Stack meets psychology / We meet in the square")
  is retained.
- **REQ-03** New `/events` route renders the live Luma calendar embed plus intro copy, so
  visitors can browse and register without leaving the brand shell. Registration happens on
  Luma (embed widget / deep link), not on-site.
- **REQ-04** Primary nav becomes Events · About · Contact. Footer cleaned of podcast links.
- **REQ-05** `/about` copy reframed for events. Contact form retained; "apply to be a guest"
  and "be a guest" submission surfaces removed.
- **REQ-06** All new/changed copy follows brand rules: no em dashes, `·` separator, cream/ink
  aesthetic, existing tokens.

### Admin (Phase 2)

- **REQ-07** Neon gains an `events` table: title, slug, summary, Luma event URL, optional
  Luma embed id, start datetime, location, cover image, status (draft/published), featured
  flag, sort order, timestamps. Schema pushed to dev (and prod via documented flow).
- **REQ-08** Auth-gated server actions in `src/lib/actions/events.ts` (create/update/delete/
  publish), each calling `await auth()` and revalidating affected paths.
- **REQ-09** Admin Events UI: list (`/admin/events`), create (`/admin/events/new`), edit
  (`/admin/events/[id]`) using an `EventForm`. Sidebar gains an Events group.
- **REQ-10** A single "Luma calendar id" setting feeds the public `/events` and homepage
  embeds, editable without a redeploy (env-backed default, admin-overridable row).
- **REQ-11** Admin dashboard surfaces an upcoming-events count/card. CRM (contacts, pipeline,
  outreach, AI, submissions) remains fully functional and untouched.
- **REQ-12** Podcast-only admin surface (`/admin/episodes`) is retired from nav and replaced
  by Events; the `episodes` table is left in place (non-destructive) but unlinked from UI.

## v2 / later (out of scope)

- Luma API sync, native event detail pages, attendee/RSVP ingestion.
- On-site payments/ticketing.
- Cmd+K palette, bulk-select, auto-save form, real-time updates (existing backlog).
