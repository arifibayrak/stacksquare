# 2. No automated LinkedIn scraper; web-search discovery + 1:1 outreach

Date: 2026-07-12

Status: Accepted

## Context

The original request was to build a "LinkedIn or web scraper" to find thousands
of Turkish founders in London and load them into the admin. We had to choose a
discovery mechanism and a data/outreach posture, given that these are real UK
residents and the operator is a 2-person, student-run organisation.

## Decision

**Discovery.** v1 discovery is **seeds + a web-search agent** (Anthropic's
`web_search` tool, reusing the pattern in `src/lib/actions/enrich.ts`). We do
**not** build a headless/automated LinkedIn crawler. Agent-discovered people
land as `discovered` (unverified) behind a human-review gate before they can be
qualified or promoted. Precision is preferred over recall: every discovered
candidate must carry a verifiable public `sourceUrl`.

**Data posture.** Prospects store public professional data plus a business email
**only when publicly published**. No bulk cold outreach. Outreach happens **1:1
after promotion** into `contacts`, through the normal outreach flow, with an
easy opt-out.

## Consequences

- We avoid violating LinkedIn's Terms of Service and avoid risking the founders'
  personal LinkedIn accounts (restriction / ban).
- We stay defensibly inside UK GDPR "legitimate interest" for B2B
  relationship-building, and clear of PECR restrictions on cold email marketing.
- Lower recall than a scraper or a paid data provider: the map grows slower and
  favours well-sourced, notable people over exhaustive coverage. This matches
  the "market map / intelligence" purpose (know and rank the few hundred that
  matter, not spam thousands).
- A `dismissProspectGlobal` action supports do-not-contact / erasure requests.

## Alternatives considered

- **Headless LinkedIn crawler.** Rejected: ToS violation, account-ban risk,
  disproportionate GDPR exposure, over-engineered for a market map.
- **Extend the Scout extension to bulk-capture LinkedIn search results.**
  Deferred to a later phase as an assisted, human-in-the-loop option.
- **Paid data provider (Apollo / Dealroom / People Data Labs).** Deferred:
  useful for breadth later, but costs money, filters "Turkish" only indirectly,
  and carries its own data-provenance questions.
