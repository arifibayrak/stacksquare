# Glossary

The shared language of the StackSquare admin. Domain terms only; see
`docs/adr/` for the decisions behind them.

## Contact

A real person the team has a relationship with (or is actively building one
with), tracked through the 9-stage pipeline. Every contact is assumed to be
worth a `fitScore`, a `nextAction`, and a place in a `circle`
(inner / reach / moonshot). Lives in the `contacts` table.

## Segment

A saved, targeted people-database, e.g. "Turkish founders in London". A market
map / intelligence asset: a curated, ranked picture of a group worth knowing.
The admin surfaces Segments under the **Research** section (labelled
"Databases"). One person can belong to several Segments. See
[ADR 0001](docs/adr/0001-prospect-layer-separate-from-contacts.md).

## Prospect

A person discovered for a Segment who is **not yet a Contact**. Holds public
professional data only (name, title, company, city, public links, a public bio,
and a business email only when publicly published). One `prospects` row per real
person, shared across the Segments they belong to. A Prospect never appears in
the pipeline, the outreach queue, or the public site.

## Membership

The link between a Prospect and a Segment. Carries the judgments that are
*specific to that map*: the **Tier** and the lifecycle **Status**. The same
person can be Tier A in one Segment and Tier C in another. Modelled by the
`segment_members` join table (mirrors `event_targets`).

## Tier

A per-Segment ranking of how much a Prospect matters to that map: **A** (clear
high-signal target), **B** (solid fit), **C** (adjacent / ecosystem).

## Status

A Prospect's lifecycle within a Segment: **discovered** (found, unverified) →
**enriched** (web-search enrichment has run) → **qualified** (a human confirmed
the fit) → **promoted** (became a Contact) or **dismissed** (not pursued here).

## Discovery

Finding candidate people for a Segment. Two paths: **seeds** (you paste names /
companies / LinkedIn URLs) and the **web-search agent** (finds people from
public sources and lands them as unverified for review). No automated LinkedIn
scraping. See [ADR 0002](docs/adr/0002-no-automated-linkedin-scraper.md).

## Discovery run (Search)

One web-search discovery over a Segment, kept as a first-class record so many
searches stay separable. Numbered per Segment ("Search #1, #2, ..."), labelled
from its params, and it stores the qualitative research findings plus a signal
breakdown. Every Prospect it surfaces is stamped with its `discovery_run_id`, so
the segment page can show, filter by, and delete an individual search and its
people. Modelled by the `discovery_runs` table. Seeded / pre-tracking members
are **Ungrouped**.

## Promotion

Graduating a Prospect into the warm `contacts` pipeline. The **only** path a
Prospect becomes a Contact. Stamps the new contact's `source` as
`research:<segment-slug>` for traceability, and dedupes against existing
contacts by LinkedIn URL.
