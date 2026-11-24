# Apartment tracker: roadmap

## Context

Today the app answers one question: "how far is this address from the places we care about?" It
forgets the address afterwards. Two of us will use it to find an apartment for next summer's move,
and probably for later moves too, so it needs three things:

- **Share:** send each other an apartment and see the same results.
- **Compare:** see how apartments stack up. What this means is still undecided, so build cheap
  views and let us react to them.
- **Track:** rent, listing, agent contact, and where each one is in the process ("did credit
  check, need to send reference"). This replaces the spreadsheet from the last move.

All three depend on one new concept, **a saved apartment**: an address plus its stored results
plus free-form tracking fields. This document is the roadmap of PRs. Each PR gets
its own detailed plan before work starts.

**Out of scope:** automatically finding listings (no usable listings API exists), accounts for
each person, destinations stored in the database, maps.

## Architecture

- **Auth stays the one shared site password.** Two people don't need accounts. Every route is
  gated by default except the `/login` route, matched by route id in `src/hooks.server.ts`: pages
  redirect to `/login?redirectTo=…` and `/api/` returns 401. A new route is private unless someone
  opens it on purpose. Signing in is a form action on `/login` that returns to `redirectTo`, so a
  shared link to an apartment page survives the login, and the session cookie's key is stretched
  from the password with scrypt (`src/lib/server/auth.ts`).
- **One-off lookups stay in the URL** (`/?address=…`), run in the browser after each navigation by
  `src/routes/+page.svelte`, which owns the lookup's promise. Every open of such a link spends the
  Google key again; a saved apartment is what avoids that.
- **Neon Postgres, through Vercel's Neon integration.** Production uses Neon's main branch, and
  each PR preview gets its own Neon branch, created and deleted by the integration.
  *Rejected: Supabase, because branching needs a paid plan and free projects pause after a week
  idle; we need neither Supabase Auth nor Storage.*
- **The database is reached only from the server, with no RLS**, as in foodservice-insights.
- **Kysely** builds the queries and runs the migrations; **Kanel** generates the types in
  `src/lib/server/db/schema` from the migrations, not from any live database. `npm run db:types`
  migrates a throwaway PGlite and has Kanel read it directly, so no Postgres server or Docker is
  involved. A new migration goes in `src/lib/server/db/migrations/`, listed by hand in its
  `index.ts` so the same list works under Vite, Vitest and plain Node.
- **One Kysely database, a different driver per environment,** chosen only in `createDatabase`
  (`src/lib/server/db/createDatabase.ts`):
  - Tests: PGlite in memory. `createTestDatabase()` in `tests/db.ts` gives each test file a fresh,
    migrated one. No network, no Docker, and worktrees are isolated automatically.
  - Dev: PGlite in a gitignored `.pglite/` in each worktree. `getDatabase()` in
    `src/lib/server/database.ts` applies pending migrations on first use and keeps the instance on
    `globalThis`, so a hot reload can't open the directory twice. `MOCK=1` fakes only Google;
    saves still go to this database.
  - Previews and production: `pg` against Neon's pooled `DATABASE_URL`. The code never tells a
    preview from production: the integration hands each deployment its own branch's URL.

  *Rejected: copying foodservice-insights' local Supabase stacks; most of that code exists to work
  around Supabase-specific problems.*
- **Migrations run in Vercel's build step** (`buildCommand` in `vercel.json`, which runs
  `scripts/migrate.ts` over `DATABASE_URL_UNPOOLED`), against whichever Neon branch that
  deployment uses, so CI doesn't change. The script logs the host it migrated, which names the
  branch. Every pending migration runs in one transaction, and a migration that has landed is
  never edited.
- **`pg` and PGlite bind `jsonb` differently.** `pg` sends a JS array as a Postgres array
  literal, which `jsonb` rejects; PGlite accepts it. Write `jsonb` values as `JSON.stringify(…)`,
  the form both accept, or tests on PGlite will pass while Neon fails.
- **Results are stored as a snapshot:** the `DestinationResult[]` the API already returns,
  recorded with the time it was computed. The `apartment` table already exists
  (`0001-create-apartment`): an identity `id`, `address`, `results` as `jsonb`,
  `results_computed_at` and `created_at`. Kanel types `results` as `unknown`, so reads need a
  typed boundary. Destinations stay in code
  (`src/lib/server/destinations.ts`), so a snapshot can go stale. The app shows the compute date,
  flags a snapshot whose destination ids no longer match, and offers a "Recompute" button.
- **Tracking fields are free-form, except status.** Status is a fixed list, so it can be sorted
  and filtered. Everything else is text: label, rent, listing URL, next step, agent contact, and
  one shared notes textarea (we type our names inline).
- **Comparison reuses `goalStatus`** from `src/lib/components/travelTimes/format.ts`. Once views
  other than the destination card need it, it moves somewhere neutral.

## Privacy, standing rules

- Apartment addresses **and agent contact details** never appear in fixtures, tests, seeds,
  commits or PRs.
- Previews hold copies of production data, which is acceptable only because every route requires
  the password. Vercel's fork protection must stay enabled.

## PRs

Dependencies: 1 is the first PR that stores addresses. 2 and 3 can run in parallel after 1. 4
comes after 3.

**Before PR 1 lands, the Neon setup must be done by hand** in the Vercel and Neon dashboards:
install Vercel's Neon integration, connect it to the project with **Preview** checked under
"Create database branch for deployment", and confirm on a preview's build log that
`scripts/migrate.ts` migrated a different host than production's.

**Open:** Neon's docs say branch connection strings are "injected via webhook at deployment
time", but not whether the build step sees them or the stored Preview values, which point at
production. The database foundation's own preview is the cheap place to find out, since its only
migration creates an empty table.

## PR 1: Saved apartments

- **Save:** a "Save" button on a lookup in `src/routes/+page.svelte` stores the address and its
  results snapshot.
- **Apartment page:** `/apartments/[id]` renders the stored results with no Google call. This is
  the share link.
- **Staleness:** the page shows the compute date, and offers recompute and delete.
- **Open:** whether to warn when saving an address that's already saved. Google's geocoding
  normalizes addresses, which could make duplicates detectable.

## PR 2: Tracking fields

- **Fields:** label (such as "Unit 4B"), rent, listing URL, status, next step, agent contact, and
  notes.
- **Display:** the listing URL, phone numbers and emails become links you can tap. The page must
  work on a phone, since it'll be used while touring.
- **Open:** the status values. Draft: considering, contacted, toured, applied, signed, passed.
- **Open:** an explicit Save button or autosave, and form actions or `+server.ts` with `fetch`.
  foodservice-insights chose the latter, so read its reasoning before deciding; the login here is
  already a form action.

## PR 3: Pipeline list

The home page lists every saved apartment, with status, rent, next step, goals met and the best
time per destination. It's sortable and filterable by status, and links to each apartment page.
The address lookup stays on the same page. This is the first "compare" view. Ship it and watch how
your partner uses it before designing PR 4.

## PR 4: Side-by-side compare

- **The view:** pick 2–3 apartments; destinations are rows and apartments are columns, with the
  better time highlighted and rent and next step at the top.
- **Screenshot tests:** revisit them here, as their own PR, because adding Playwright to CI is a
  CI change.

## Later, only if needed

Notes or ratings for each person, CSV export, destinations stored per move.

## Verification

For every PR: `npm run lint && npm run check && npm test`, plus `MOCK=1 npm run dev` to click
through UI changes. Also check the PR's Vercel preview against its own Neon branch:
- the migration ran, and the build log names the preview branch's host, not production's;
- a saved apartment survives a reload;
- production data wasn't touched.

Real Google calls happen only to check a change by hand, and the PR says so.

## Next step

Finish the Neon setup and settle the **Open:** above on a preview, then write a detailed plan for
PR 1, saved apartments.
