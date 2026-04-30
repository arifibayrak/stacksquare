@AGENTS.md

## Project specifics

- This is **StackSquare** — a 2-on-1 podcast platform for Arif and Kerem (MSc Imperial). Public site + auth-gated `/admin` CRM in a single Next.js app on Vercel.
- The previous Obsidian + separate Next.js split is **deleted**. All contact data lives in Neon Postgres now. Don't suggest migrating back.
- Auth is **Clerk**; AI is **direct Anthropic** (no AI Gateway); DB is **Neon via Marketplace**; email is **Resend**.
- Hard rule: guest contact data (notes, fit_score, outreach status) never ships to the public site. The public site reads only `episodes` (status=published), guest public bios, and writes form submissions.
- Use `proxy.ts` not `middleware.ts` (Next.js 16 convention) — `clerkMiddleware()` works either way but the file is named `proxy.ts`.
- Server Actions live under `src/lib/actions/`. Always `await auth()` and check `userId` first.
- Model IDs for `@ai-sdk/anthropic` are hyphenated (e.g. `claude-sonnet-4-6`), driven via `env.modelFast()` / `env.modelDeep()`. Do not switch to dotted Gateway-style strings.
