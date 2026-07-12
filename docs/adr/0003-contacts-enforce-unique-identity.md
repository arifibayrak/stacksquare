# 3. Contacts enforce unique identity; no duplicate-merge page

Date: 2026-07-12

Status: Accepted

## Context

Contacts entered the CRM through four independent paths (the manual New Contact
form, submission triage, Scout capture promote, and Research prospect promote),
each with its own ad-hoc dedupe or none at all. Two of them matched an existing
contact by exact `linkedin_url` string equality; the manual form and submission
convert did not check at all. Because stored LinkedIn URLs were not canonical
(44 of 64 rows were `https://www.linkedin.com/...` while discovery produced the
`https://linkedin.com/...` form), even the "matching" paths would miss and fork
a second row for the same person.

The stop-gap was a separate `/admin/contacts/duplicates` page that periodically
clustered likely-duplicate contacts (union-find over email / LinkedIn /
name+company) and merged them by hand. This is a scan-and-clean loop for a
problem that should not exist: it lets duplicates form, then asks a human to
find and fix them.

## Decision

Prevent duplicates at write time instead of cleaning them up after.

- `contacts` enforces two **unique indexes**: `email` and `linkedin_url`. As on
  `prospects`, these are plain unique indexes, so Postgres keeps NULLs distinct
  and contacts with neither key still coexist.
- Both keys are **canonicalised on every write** (`src/lib/contacts-dedup.ts`:
  `canonicalLinkedin`, `normalizeEmail`) so the same person always produces the
  same key. LinkedIn canonicalisation is shared with the prospect layer.
- All four contact-creating paths route through `findContactByIdentity()` first
  and fall back to fill-blanks-or-open-existing, so a repeat person links to the
  one record. The unique indexes are the race-safe last line of defence.
- The `/admin/contacts/duplicates` page, its client, the sidebar link, and the
  `mergeContacts` action are **removed**. There is no standing duplicate search.

## Consequences

- A person is stored once. Promote / convert / capture / manual entry all
  converge on the existing record rather than forking it.
- The strong, reliable identity keys (email, canonical LinkedIn) are hard
  constraints. The weak `name + company` signal is intentionally **not** a
  constraint (too many false positives, and it never caught real dupes here);
  the rare "same person, no shared email or LinkedIn" case is handled by editing
  the record, not by a scan page.
- One-time migration: canonicalise existing `linkedin_url` values, then create
  the two unique indexes. Safe because the table had zero duplicate groups by
  any key at the time (64 contacts). See the migration note below.
- Editing a contact to an email/LinkedIn already held by another contact now
  errors on the unique index instead of silently creating a duplicate.

## Migration

`contacts.email` was already clean. `linkedin_url` was canonicalised in place
(no collisions, since there were no duplicate LinkedIn groups), then:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS contacts_email_idx ON contacts (email);
CREATE UNIQUE INDEX IF NOT EXISTS contacts_linkedin_url_idx ON contacts (linkedin_url);
```

## Alternatives considered

- **Keep the duplicates page, just improve its matching.** Rejected: still a
  scan-and-clean loop; duplicates keep forming and rely on a human noticing.
- **Generated canonical columns** (`GENERATED ALWAYS AS ... STORED`) with the
  unique index on those. Rejected for now: LinkedIn canonicalisation is awkward
  as a pure SQL expression, and normalising on write keeps the stored value
  display-ready. Matches how `prospects` already stores canonical LinkedIn.
