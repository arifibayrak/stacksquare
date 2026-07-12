# 1. A separate Prospect layer, distinct from Contacts

Date: 2026-07-12

Status: Accepted

## Context

We are building targeted people-databases ("Segments") inside the admin, the
first being "Turkish founders in London" (potentially thousands of people). The
existing `contacts` table is a warm relationship pipeline for a 2-person team
booking a small set of high-fit speakers: every row is assumed to be a real
relationship with a `fitScore`, a `stage` in the 9-step funnel, a `circle`, an
`owner`, and a `nextAction`, and it is rendered on the Kanban board, the
outreach queue, and the circle-grouped contacts list.

We had to decide where scraped/discovered people live.

## Decision

Discovered people live in a **separate `prospects` table**, never in `contacts`.
A Prospect holds public professional data only. A Prospect enters `contacts`
**only** via an explicit "Promote" action, which mirrors the existing Scout
`captures` -> `promoteCapture` -> `contacts` bridge (dedupe by LinkedIn URL,
fill-blanks-or-insert, stamp `source`).

Segments are first-class (`segments` table) with **many-to-many** membership via
`segment_members`, so one person is stored and enriched once and shared across
every database they qualify for. Per-map judgments (**tier**, lifecycle
**status**) live on the join; the person's identity and roles live on the
Prospect.

## Consequences

- The warm pipeline stays clean: thousands of cold prospects never swamp the
  Kanban, outreach queue, or contacts list, and no existing query needs a
  "hide the cold ones" filter.
- Prospects can enforce a **unique** `linkedin_url` (unlike `contacts`, which has
  none), giving real dedupe on the research side.
- Cost: a second people-table and a promote step to keep in sync. Contacts and
  Prospects can drift after promotion (we link by `prospects.contact_id` but do
  not continuously reconcile).
- Reversing this later (merging the two) would be a real migration, which is why
  it is recorded here.

## Alternatives considered

- **One `contacts` table + a flag.** Rejected: pollutes every existing contacts
  surface and every query, and mixes cold research with warm relationships.
- **Reuse the Scout `captures` table.** Rejected: `captures` is built around
  single LinkedIn-extension snapshots, not a curated, ranked, multi-database
  catalog.
