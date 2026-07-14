# Outreach Timeline - handoff (manual steps)

Built by Opus, planned by Fable 5. Records outreach conversations against each
contact as a per-contact timeline with AI summaries. **Summaries only. Raw
message bodies are never stored** (see `docs/adr/0004`).

Three parts, ship them in order:

- **Phase 1 - LinkedIn DMs**: the Scout extension (v0.7) reads DM threads you
  open and posts them; the server summarizes + files them on the contact.
- **Phase 3 - Paste fallback**: a "Paste a conversation" box on every contact
  (WhatsApp, calls, in-person, any email you did not sync).
- **Phase 2 - Gmail**: daily server-side sync via the official Gmail API.

Everything below is a step **you** run. Code + scripts are done and typechecked;
the app builds clean. Nothing is committed yet (see step 0).

---

## 0. Git (both repos)

Nothing was committed. Review the diffs, then branch + commit + deploy.

```sh
# stacksquare (server)
cd ~/stacksquare && git status
git checkout -b feat/outreach-timeline
git add -A && git commit -m "feat: multi-channel outreach timeline (LinkedIn DMs, Gmail, paste)"

# stacksquare-scout (extension)
cd ~/stacksquare-scout && git status
git checkout -b feat/dm-logging
git add -A && git commit -m "feat: v0.7 LinkedIn DM conversation logging"
```

---

## Phase 1 - LinkedIn DMs

### 1a. Apply the DB schema (prod Neon)

One shared prod DB. The script is idempotent and additive only.

```sh
cd ~/stacksquare
vercel env pull .env.production.local --environment=production   # if not fresh
node --env-file=.env.production.local scripts/apply-outreach-timeline-ddl.mjs
```

Creates: `contact_identities`, `outreach_threads`, `outreach_timeline`, the
`outreach_source` / `outreach_direction` enums, and the `summarize_outreach`
value on `ai_run_kind`.

### 1b. (Optional) Point the AI split at Fable 5 / Opus 4.8

The summarizer uses the app's existing `env.modelFast()` (triage) and
`env.modelDeep()` (summary). Defaults are unchanged (`claude-sonnet-4-6` /
`claude-opus-4-7`), so existing AI features are untouched. To run the split on
Fable 5 / Opus 4.8, set in Vercel (Production) **and** `.env.local`:

```
ANTHROPIC_MODEL_FAST=claude-fable-5
ANTHROPIC_MODEL_DEEP=claude-opus-4-8
```

Note: this is global (affects enrich/draft/discover too). Leave unset to keep
today's models.

### 1c. Deploy the server

```sh
cd ~/stacksquare && vercel --prod        # or: git push origin (after PR merge)
curl -sI https://stacksquare.ai/api/outreach/linkedin   # expect 405 (GET not allowed) = route live
```

### 1d. Build + load the extension

API keys are already set (`EXTENSION_KEY_ARIF/KEREM`). Nothing new to configure.

```sh
cd ~/stacksquare-scout && pnpm build
# Chrome -> chrome://extensions -> reload the unpacked extension (.output/chrome-mv3)
```

Open the popup, flip **Log DMs** ON (it is default OFF). Then open one of your
own LinkedIn message threads (`/messaging/thread/...`). After ~4s a chip should
say "logged -> <contact>" or "logged (unmatched)".

### 1e. IMPORTANT - verify the messaging parser (the one real unknown)

The LinkedIn *messaging* DOM was not verifiable from here, so the selectors in
`stacksquare-scout/lib/messaging-parser.ts` (`msg-dom@1`) are a best guess.
Test on a real thread and check `/admin/contacts/<id>` -> Outreach timeline (or
`/admin/outreach` -> Unmatched). If nothing logs:

- Open DevTools on a thread, run `pnpm dev`, and inspect. The likely fixes are
  the message-bubble selector (`.msg-s-event-listitem__body`), the sender name
  (`.msg-s-message-group__name`), and the header profile link. The server
  tolerates a lossy transcript, so getting *any* bubbles through is enough.
- Sender attribution ("me" vs "them") is the fragile bit; adjust the `--other`
  / name-match heuristic in `readMessages()` if directions look wrong.

---

## Phase 3 - Paste fallback (no setup)

Ships with Phase 1. On any contact page there is a "Paste a conversation" box.
Paste a WhatsApp export / email / call notes; it is summarized and filed as a
`manual` timeline entry. Raw paste is discarded. This is the WhatsApp answer
(there is no safe WhatsApp API - see below).

---

## Phase 2 - Gmail (do after Phase 1 works)

### 2a. GATING QUESTION - is `@stacksquare.ai` on Google Workspace?

- **Yes (Workspace):** set the OAuth consent screen to **Internal**. No Google
  verification, no CASA assessment, refresh tokens do not expire. Easy.
- **No:** the app is **External** + `gmail.readonly` is a *restricted* scope ->
  Google verification + annual CASA security assessment ($$$), or you stay in
  "testing" mode with 7-day-expiring tokens (you would re-connect weekly).
  If not on Workspace, consider skipping Gmail and leaning on the paste box.

### 2b. Google Cloud console

1. Create a project; enable the **Gmail API**.
2. OAuth consent screen: **Internal** (if Workspace); add scope
   `https://www.googleapis.com/auth/gmail.readonly`.
3. Credentials -> OAuth client ID -> **Web application**. Authorized redirect
   URI: `https://stacksquare.ai/api/gmail/callback`.
4. Copy the client id + secret.

### 2c. Env vars (Vercel Production + `.env.local`)

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GMAIL_TOKEN_KEY=<openssl rand -hex 32>     # 32-byte key, encrypts refresh tokens at rest
CRON_SECRET=<openssl rand -hex 32>         # Vercel cron auto-sends this as Bearer; REQUIRED for the daily sync
```

### 2d. Apply Gmail schema + backfill identities (prod)

```sh
cd ~/stacksquare
node --env-file=.env.production.local scripts/apply-gmail-ddl.mjs
node --env-file=.env.production.local scripts/backfill-contact-identities.mjs
```

The backfill seeds `contact_identities` from existing contacts so the first sync
matches by email. Run it any time; it is idempotent.

### 2e. Deploy, connect, test

```sh
cd ~/stacksquare && vercel --prod          # picks up vercel.json cron + env
```

Then `/admin/outreach` -> **Channels** card -> **Connect** for each founder
(signs into that founder's Google account). Click **Sync now** to test; a toast
reports how many threads were logged. The daily cron runs at 07:00 UTC.

---

## What lands where

- Contact page (`/admin/contacts/<id>`) -> "Outreach timeline" section: the
  summaries + commitments + next steps.
- `/admin/outreach`:
  - "Channels" -> Gmail connect/status/sync.
  - "Unmatched conversations" -> threads we could not match; Link to a contact
    (teaches the identity map, so future threads auto-match) or Dismiss.

## Risk posture (already decided, for your awareness)

- LinkedIn DM capture is **passive, read-only, in your own browser, default
  OFF**. No LinkedIn API calls, no automated actions (ADR 0002). This is the
  lowest-risk capture point, but it is still your account. Keep volume human.
- Gmail is the **official API**, read-only, internal app. Not scraping.
- WhatsApp has **no safe path** (no personal API; scraping risks your number).
  The paste box is the deliberate substitute.
- Third-party message bodies are **never stored** - only AI summaries. Any new
  capture path must route through `src/lib/outreach-summarize.ts` and keep that
  guarantee (ADR 0004).

## Files (for reference)

Server: `src/db/schema.ts`, `src/lib/outreach-identity.ts`,
`src/lib/outreach-summarize.ts`, `src/lib/gmail.ts`, `src/lib/gmail-sync.ts`,
`src/lib/actions/outreach-threads.ts`, `src/app/api/outreach/linkedin/route.ts`,
`src/app/api/gmail/{connect,callback,sync}/route.ts`,
`src/app/admin/outreach/{page,client}.tsx`,
`src/app/admin/contacts/[id]/{page,client}.tsx`, `docs/adr/0004-*.md`,
`scripts/apply-outreach-timeline-ddl.mjs`, `scripts/apply-gmail-ddl.mjs`,
`scripts/backfill-contact-identities.mjs`.

Extension: `lib/messaging-parser.ts`, `entrypoints/content.ts`,
`entrypoints/background.ts`, `entrypoints/popup/{index.html,main.ts}`.
