# StackSquare - Coding Vision

The north star for how this codebase is built and why. `CLAUDE.md` is the
operational rulebook (stack, conventions, commands). This is the "why" behind
those rules and the direction we build toward. When a decision is not covered by
`CLAUDE.md`, decide in the spirit of this document.

> This is a living doc. Add current context in the "Working context" section at
> the bottom rather than rewriting the principles above it.

## 1. What StackSquare is

An events organization (fireside rooms, expert sessions, peer gatherings) for
Arif and Kerem, plus the private CRM that makes those rooms possible. Luma is the
ticketing engine; the public site is the branded front door; the real asset is
the **relationship graph in the CRM**. The product is not "a website" and not "a
podcast" (that era is over). It is: *fill good rooms with the right people, and
never lose track of a relationship.*

The four lenses (Technology Stack, Capital, Strategic Planning, Psychology) are
the content backbone and the way every event and guest is framed.

## 2. The CRM is the moat

Everything compounds around one idea: **be the system of record for who we know
and what was said.** Contacts, pipeline, research segments, outreach, the
outreach timeline, and the work queue all serve that. When choosing what to
build next, prefer things that make the relationship graph richer, more trusted,
and lower-friction to act on, over net-new surface area.

## 3. Engineering principles (the recurring "why")

These are already encoded across the code and ADRs. Hold them as defaults.

- **The privacy split is sacred.** The public site reads only published `events`
  and writes only `submissions`. CRM data, fit scores, notes, outreach status,
  and internal event notes never reach a public route. A feature that blurs this
  line is wrong until proven otherwise.
- **ToS-safe by default, no automated scraping.** (ADR 0002) We read what a
  platform already gave us (passive Voyager reads, official APIs), at human pace,
  with no automated actions. We do not risk the founders' own accounts. The Scout
  extension and Gmail sync both live inside this rule; WhatsApp is paste-only for
  exactly this reason.
- **Store meaning, not raw material.** (ADR 0004) The outreach timeline keeps AI
  summaries + commitments, never third parties' raw message bodies. Minimize the
  data at rest; the source app stays the system of record for the words. Any new
  capture path routes through the summarize helper and keeps this guarantee.
- **One person, stored once.** (ADR 0003) Identity is deduped at write time
  (canonical LinkedIn URL + normalized email, now extended by
  `contact_identities`). There is no "find duplicates" cleanup because duplicates
  are prevented, not repaired.
- **Prospects are not contacts.** (ADR 0001) The research/discovery layer is a
  separate, ToS-careful staging area. People cross into `contacts` only on
  explicit promotion.
- **AI: fast/deep split, direct provider.** Cheap model triages/extracts; deep
  model reasons/summarizes (`env.modelFast()` / `env.modelDeep()`). Direct
  `@ai-sdk/anthropic`, hyphenated model ids, no Gateway. Every AI call is logged
  to `ai_runs` with inputs minimized (hashes/counts, not raw sensitive text).
- **One shared prod DB, so treat every write as production.** Schema changes are
  additive and idempotent (`CREATE ... IF NOT EXISTS`, `ADD VALUE IF NOT
  EXISTS`) applied via `scripts/apply-*-ddl.mjs`. No destructive migrations, no
  placeholder seed rows expecting them to stay local.
- **Import discipline.** Server imports from `@/db`; client components import
  only from `@/db/schema`. DB-reading pages are `force-dynamic`. Keep the
  postgres driver out of the client bundle.
- **Two-person pragmatism.** This is a tool for two people, not a SaaS. Best-
  effort rate limits, manual triage queues, and small surface area are features.
  Do not build multi-tenant, real-time, or heavy infra we do not need yet.
- **Calm surfaces.** Public site stays Notion-quiet (cream paper, ink, sparing
  brand purple). Admin stays fast and legible. No em dashes in copy; middle dot
  (`·`) is the separator.

## 4. Architectural north star

- **Contacts are the spine.** Pipeline, events, research, outreach, tasks, and
  the outreach timeline all hang off a contact (or promote into one).
- **Capture is cheap and forgiving; the CRM is curated.** Scout captures and
  Gmail sync flow into review queues (Scout queue, unmatched conversations), not
  straight into the curated graph. A human promotes/links. This keeps the graph
  trustworthy.
- **AI assists, humans decide.** Enrichment, drafting, and summarization prepare
  work; they never auto-send, auto-promote, or auto-contact.
- **The work queue is the daily driver.** The `tasks` table (`/admin/tasks`) is
  the one place that answers "what do I do next." See 4.1.

### 4.1 The work queue (`tasks`)

`tasks` is the cross-cutting to-do layer for the two founders. It is
deliberately distinct from `event_tasks` (per-event process checklists): a
`task` is a "who does what by when" item that may belong to no event at all.

Shape (keep it this lean): `title` + optional `notes`; `owner` and `createdBy`
(both founder-scoped); `status` (`open` / `done`) with `completedAt` stamped on
done and cleared on reopen; `priority` (p1/p2/p3); a nullable `dueDate` (null
means "needs a deadline"); optional `contactId` / `eventId` links (both
`onDelete: set null`, so a task survives the thing it referenced); and
`sortOrder` for manual ordering.

Vision for it:

- **Connected to the graph, not floating.** Prefer tasks that link to a contact
  or event. A task about a person should open from, and back to, that contact so
  work never drifts away from the relationship graph.
- **One surface, two kinds of item.** `/admin/tasks` is the daily cockpit. It
  should show **manual** tasks (rows in this table) alongside **derived**
  to-dos that already live elsewhere, without duplicating them into the table:
  contacts with a `nextActionDue` today, unmatched outreach threads awaiting a
  link, outreach targets past follow-up, and event prep with near due dates.
  Manual tasks are the writable layer; derived items are read-through views.
- **Humans decide; completion automates nothing.** Marking a task done records
  the fact and nothing more. It does not move a pipeline stage, send anything,
  or promote a prospect. Any such side effect is an explicit, separate action.
- **Lightweight, for two people.** Ordering is manual (`sortOrder`) plus
  due-date/priority sort. No assignees beyond the two founders, no sub-tasks, no
  dependencies, no automation engine until the pain is real.
- **A task is closed by doing the underlying work, not by grooming the list.**
  If the queue becomes busywork to maintain, it has failed its job.

## 5. What we deliberately do NOT build

- No Obsidian, no separate public site (both deleted; do not reintroduce).
- No Luma API sync. Luma is an embed in the admin and outbound links only.
- No WhatsApp/LinkedIn scraping or automated messaging. Paste + passive read.
- No CRM data on public routes, ever.
- No heavyweight infra (queues, workers, realtime) before two users feel the
  pain.

## 6. How to decide on new scope

Before building, pressure-test against:
1. **Privacy split** - does it keep CRM data off public routes? If not, stop.
2. **ToS / account risk** - does it endanger the founders' accounts or store
   third-party raw data? If yes, find the passive/official/summary path.
3. **Graph value** - does it make the relationship graph richer or easier to act
   on, or is it net-new surface for its own sake?
4. **Bottleneck honesty** - is this the actual constraint right now, or
   gold-plating? (Rooms filled and relationships tracked beat tooling polish.)
5. **Reversibility** - additive, idempotent, and easy to roll back on the shared
   DB.

## 7. Working context (edit this section freely)

_Keep the principles above stable; capture the moving parts here._

- **Current milestone / focus:** <fill in>
- **Active workstreams:** <e.g. tasks/work-queue, outreach timeline rollout, ...>
- **Recently shipped:** outreach timeline (LinkedIn DMs + Gmail + paste),
  Scout v0.7 DM logging (see `docs/OUTREACH-TIMELINE-HANDOFF.md`).
- **In flight (Arif):** the `tasks` work queue (`/admin/tasks`, see 4.1) and a
  daily digest (`/api/cron/digest`, am/pm slots in `vercel.json`) that surfaces
  the day's tasks + derived to-dos. <add detail as it firms up>
- **Open questions / decisions to make:** <fill in>
- **Near-term roadmap:** <fill in>
- **Known landmines:** one shared prod DB; Gmail external-vs-Workspace OAuth;
  LinkedIn messaging DOM can churn (selectors in the Scout extension).
