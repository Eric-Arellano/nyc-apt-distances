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
- **Kysely** builds the queries and runs the migrations; **Kanel** generates types from the live
  schema.
- **One Kysely database, a different driver per environment:**
  - Tests: PGlite in memory, a fresh migrated database for each test file. No network, no Docker,
    and worktrees are isolated automatically.
  - Dev: PGlite saved to a gitignored directory in each worktree.
  - Previews and production: `pg` against Neon.

  Only the function that creates the database knows which driver it is using. *Rejected: copying
  foodservice-insights' local Supabase stacks; most of that code exists to work around
  Supabase-specific problems.*
- **Migrations run in Vercel's build step,** against whichever Neon branch that deployment uses,
  so CI doesn't change. Every pending migration runs in one transaction, and a migration that has
  landed is never edited.
- **Results are stored as a snapshot:** the `DestinationResult[]` the API already returns,
  recorded with the time it was computed. Destinations stay in code
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

Dependencies: 1 must land before 2, the first PR that stores addresses. 3 and 4 can run in
parallel after 2. 5 comes after 4.

## PR 1: Database foundation

- **Neon setup** (done by hand in the Vercel and Neon dashboards): connect the integration and set
  up branch-per-preview.
- **Dependencies:** Kysely, `pg`, PGlite, Kanel.
- **Code:** the function that creates the database for each environment, the migrator and its
  build-step hook, a test helper that gives each file a fresh PGlite, the Kanel type-generation
  script, and a first migration.
- **README:** what someone now runs, such as the env vars and migrate and type-generation
  commands.
- **Spikes to settle in this PR's detailed plan:**
  - Kanel needs the Postgres wire protocol to read the dev database, so try `pglite-socket` with a
    Docker fallback.
  - PGlite under `vite dev`: two module instances could open the same directory during a hot
    reload, so keep one instance on `globalThis`.
  - How Vercel's build environment tells a preview from production.
  - How `MOCK=1` combines with a real dev database.
- Likely 2–3 PRs: dev and test infrastructure first, then the Neon wiring and build-step
  migrations.

## PR 2: Saved apartments

- **Save:** a "Save" button on a lookup in `src/routes/+page.svelte` stores the address and its
  results snapshot.
- **Apartment page:** `/apartments/[id]` renders the stored results with no Google call. This is
  the share link.
- **Staleness:** the page shows the compute date, and offers recompute and delete.
- **Open:** whether to warn when saving an address that's already saved. Google's geocoding
  normalizes addresses, which could make duplicates detectable.

## PR 3: Tracking fields

- **Fields:** label (such as "Unit 4B"), rent, listing URL, status, next step, agent contact, and
  notes.
- **Display:** the listing URL, phone numbers and emails become links you can tap. The page must
  work on a phone, since it'll be used while touring.
- **Open:** the status values. Draft: considering, contacted, toured, applied, signed, passed.
- **Open:** an explicit Save button or autosave, and form actions or `+server.ts` with `fetch`.
  foodservice-insights chose the latter, so read its reasoning before deciding; the login here is
  already a form action.

## PR 4: Pipeline list

The home page lists every saved apartment, with status, rent, next step, goals met and the best
time per destination. It's sortable and filterable by status, and links to each apartment page.
The address lookup stays on the same page. This is the first "compare" view. Ship it and watch how
your partner uses it before designing PR 5.

## PR 5: Side-by-side compare

- **The view:** pick 2–3 apartments; destinations are rows and apartments are columns, with the
  better time highlighted and rent and next step at the top.
- **Screenshot tests:** revisit them here, as their own PR, because adding Playwright to CI is a
  CI change.

## Later, only if needed

Notes or ratings for each person, CSV export, destinations stored per move.

## Verification

For every PR: `npm run lint && npm run check && npm test`, plus `MOCK=1 npm run dev` to click
through UI changes. Also check the PR's Vercel preview against its own Neon branch:
- the migration ran;
- a saved apartment survives a reload;
- production data wasn't touched.

Real Google calls happen only to check a change by hand, and the PR says so.

## Next step

Write a detailed plan for PR 1, the database foundation.
