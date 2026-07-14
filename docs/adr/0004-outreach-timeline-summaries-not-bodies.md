# 4. Outreach timeline stores summaries, never message bodies

Date: 2026-07-14

## Status

Accepted

## Context

We want a per-contact "outreach timeline" that records the conversations we
have with people across channels: LinkedIn DMs (captured passively by the Scout
extension), Gmail (synced via the official API), and manual paste-ins
(WhatsApp, calls, in-person). This means handling other people's private
messages, who never consented to us persisting their words.

ADR 0002 already forbids automated LinkedIn scraping. DM capture stays within
that rule: the extension only reads the Voyager JSON LinkedIn already served to
the founder's own browser, at human pace, on threads the founder opened. It
makes no LinkedIn API calls and takes no automated actions.

The remaining risk is the data at rest. Storing raw message bodies of third
parties in Neon creates a GDPR liability (weak lawful basis, data-minimization
failure, breach blast radius) that is disproportionate to the product value.
The value is in *knowing what was discussed and what was promised*, which a
summary captures. The raw text is not needed after summarization.

## Decision

The outreach timeline stores **AI summaries and minimal metadata only. Raw
message bodies are never persisted.**

- Transcripts travel from the extension (or Gmail sync, or a paste box) to the
  server, are summarized in memory, and are then discarded.
- `outreach_threads.summary` holds a rolling summary; `outreach_timeline` holds
  per-sync delta summaries, extracted commitments, and next steps.
- `ai_runs` logs for the `summarize_outreach` kind store only a SHA-256 of the
  transcript plus a message count in `input`. Never the text.
- Dedup/cursor uses a hash of the newest message (`last_message_key`), not its
  content.
- Capture is opt-in and default-off (the extension's "Log DM conversations"
  toggle), and a fast-model triage step drops automated / content-free threads
  before any summary is written.

## Consequences

- We cannot show a verbatim transcript in the CRM, only the summary. Acceptable:
  the source app (LinkedIn / Gmail) remains the system of record for the words.
- Any new capture path (future channels) MUST route through the same summarize
  helper and MUST NOT write raw text into a `payload`/`input` column or logs.
  The summaries-only guarantee is a code-discipline property, not a schema one.
- Gmail uses the official API as an internal app (`gmail.readonly`), not
  scraping (see the Phase 2 handoff).
