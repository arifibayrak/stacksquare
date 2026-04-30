# StackSquare

A 2-on-1 podcast and fireside-chat platform built by Arif İsmail Bayrak and Kerem Ozkefeli (MSc Economics & Strategy at Imperial Business School).

This single Next.js app runs both the public site at `stacksquare.ai` and a private, auth-gated `/admin` that replaces the previous Obsidian-based CRM.

## What's inside

- **Public site** — `/`, `/about`, `/episodes`, `/episodes/[slug]`, `/guests`, `/fireside`, `/apply`, `/guest`, `/contact`.
- **Auth** — Clerk (email allowlist for Arif + Kerem). All `/admin/*` is protected by `proxy.ts`.
- **Admin CRM** — `/admin/contacts` list, detail with touch log, drag-drop Kanban at `/admin/pipeline`.
- **Outreach** — `/admin/outreach` queue + composer, `/admin/outreach/templates` library, `{firstName}` / `{company}` template variables, optional Resend send for emails.
- **Episodes** — `/admin/episodes` Kanban, per-episode research doc + question outline + show notes + transcript.
- **AI assist** — `/admin/ai/enrich` (paste bio → structured contact + fit score), `/admin/ai/draft` (AI-drafted outreach in your or Kerem's voice), `/admin/ai/clips` (transcript → 4–6 short-clip suggestions). Direct Anthropic provider via AI SDK v6 with `generateText` + `Output.object`.
- **Inbox** — `/admin/submissions` triages public form submissions into contacts.

## Stack

- Next.js 16 App Router · React 19 · Tailwind v4
- Drizzle ORM + Neon Postgres (Vercel Marketplace)
- Clerk auth (Vercel Marketplace)
- AI SDK v6 + `@ai-sdk/anthropic`
- Resend for transactional email
- dnd-kit for the Kanban board
- Hosted on Vercel; configured with `vercel.ts`

## First-time setup

```bash
# 1. Install
pnpm install

# 2. Copy env template and fill in Vercel-issued keys
cp .env.example .env.local

# 3. Provision Marketplace integrations (Neon + Clerk) and pull env vars
vercel link
vercel env pull .env.local

# 4. Push the schema to the database
pnpm db:push

# 5. Run dev
pnpm dev
```

Visit `http://localhost:3000` for the public site, `/sign-in` to authenticate, then `/admin`.

## Database

Schema lives in `src/db/schema.ts`. Edit it then run `pnpm db:generate` followed by `pnpm db:migrate` (or `pnpm db:push` while iterating).

Tables:

- `contacts`, `touch_log` — the network CRM (8-stage pipeline + dormant)
- `episodes` — content pipeline (idea → published)
- `outreach_templates`, `outreach_log` — reusable scripts and send history
- `submissions` — inbox from public forms
- `subscribers` — newsletter
- `ai_runs` — AI usage log (model, tokens, input/output)

## Deploying

- `vercel.ts` declares the build and framework.
- Push to GitHub; Vercel auto-deploys preview branches.
- Production: `git push origin main` → promotes to `stacksquare.ai`.

## Project conventions

- Prefer Server Components and Server Actions; use `"use client"` only for interactivity.
- Don't put guest contact data on the public site — the privacy split is a hard rule.
- `next.config.ts` keeps Cache Components off for now — pages that read DB data export `dynamic = "force-dynamic"`.
- The Kanban uses drizzle enums + `useOptimistic` for instant feedback; server action `moveContactStage` persists.
