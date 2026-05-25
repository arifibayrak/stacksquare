# StackSquare · Events Pivot

## Vision

Repurpose stacksquare.ai from a 2-on-1 podcast platform into an **events organization** site.
StackSquare runs and promotes in-person and online events (fireside-style gatherings,
expert sessions, peer rooms) for the Imperial Business School / founder-investor-operator
community. **Luma** is the registration and ticketing engine; the StackSquare site is the
branded front door and the private operations layer.

## What changes

- The public site stops being a podcast (episodes, guests, fireside, apply) and becomes an
  **events showcase** that funnels visitors to Luma to register.
- The `/admin` CRM (contacts, pipeline, outreach, AI, submissions) is **kept** as the
  relationship engine, and gains an **Events** section to manage what the public site shows.

## Locked decisions (2026-05-25)

1. **Luma = embed (admin-side), public = curated cards.** No Luma API key, no event sync to
   Neon. The Luma calendar (`cal-n7SwFY8KZTFPZTL`) is embedded **inside `/admin/events`** for
   the team to track registrations. The **public** surface is `/grill-me`, which renders the
   curated `events` rows from Neon as branded cards (upcoming + past recaps), each optionally
   linking out to its Luma page. (Revised 2026-05-25: originally the public `/events` page
   embedded the Luma calendar; the user moved the embed to admin and renamed the public page
   to `/grill-me` showing finished/active sessions as cards.)
2. **Podcast content removed.** Public routes `/episodes`, `/episodes/[slug]`, `/guests`,
   `/guest`, `/fireside`, `/apply` are deleted. `/about`, `/contact`, auth routes stay.
3. **CRM kept, Events admin added.** `contacts` / `pipeline` / `outreach` / `ai` /
   `submissions` remain untouched. A new Events admin section is added alongside.
4. **Brand kept, copy reframed.** Same cream/ink Notion aesthetic, 2x2 logo, `·` separator,
   no em dashes. Hero brand line stays. Four-lenses framework is reframed as the editorial
   backbone for event themes. Positioning copy is rewritten for events.

## Stack (unchanged, per CLAUDE.md)

Next.js 16 App Router · React 19 · Tailwind v4 · Drizzle + Neon · Clerk (`@stacksquare.ai`
allowlist) · AI SDK v6 (`@ai-sdk/anthropic`, hyphenated model IDs) · Resend · Sonner ·
dnd-kit · Sharp. Proxy lives at `src/proxy.ts`. Every `/admin/*` and DB-reading public page
exports `dynamic = "force-dynamic"`.

## Hard rules carried forward

- Privacy split: guest/contact CRM data never ships to the public site.
- `@stacksquare.ai` email allowlist on `/admin` (proxy + layout double gate).
- No Obsidian. No em dashes. `·` is the title separator.
- Git committer email stays `264016086+arifibayrak@users.noreply.github.com`.

## Out of scope (this milestone)

- Luma API sync / native event data in Neon (we embed, not sync).
- Native checkout/payments (Luma handles registration + tickets).
- Removing the AI clip/transcript tools (podcast-era, left dormant, no harm).
- Real-time multi-user admin, Cmd+K palette (still backlog).
