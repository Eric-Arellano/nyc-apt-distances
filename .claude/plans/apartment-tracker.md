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
plus free-form tracking fields. This document is the roadmap of milestones. Each milestone gets
its own detailed plan before work starts.

**Out of scope:** automatically finding listings (no usable listings API exists), accounts for
each person, destinations stored in the database, maps.

## Architecture

- **Auth stays the one shared site password.** Two people don't need accounts. Once addresses
  are stored, every route is gated by default, not just `/api/`.
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
  commits or PRs. Milestone 2 extends AGENTS.md's hard rule to cover contacts and pages.
- Previews hold copies of production data, which is acceptable only because every route requires
  the password (milestone 2). Vercel's fork protection must stay enabled.

## Milestones

Dependencies: 1 and 2 don't depend on anything. 3 must land before 4, and 2 must land before 4,
because 4 is the first milestone that stores addresses. 5 and 6 can run in parallel after 4. 7
comes after 6.

### 1. Shareable lookups (no database)

The address goes in the URL (`/?address=…`), and the lookup runs when the page loads, so sharing
a link reproduces the query. Each open of a link spends the Google key again, at a few cents per
lookup. This stays useful after milestone 4 for one-off checks of addresses not worth saving.

- Touches `AddressInput.svelte`, `src/lib/state/travelTimes.svelte.ts` and `src/routes/+page.svelte`.
- About one PR.

### 2. Gate every route (prefactor)

`src/hooks.server.ts` switches to blocking by default. Everything except the login route and
static assets requires a session: pages redirect to login, and `/api/` returns 401. The AGENTS.md
hard rules are updated to say "every route" and to cover agent contacts.

- About one PR.

### 3. Database foundation

- **Neon setup** (done by hand in the Vercel and Neon dashboards): connect the integration and set
  up branch-per-preview.
- **Dependencies:** Kysely, `pg`, PGlite, Kanel.
- **Code:** the function that creates the database for each environment, the migrator and its
  build-step hook, a test helper that gives each file a fresh PGlite, the Kanel type-generation
  script, and a first migration.
- **README:** what someone now runs, such as the env vars and migrate and type-generation
  commands.
- **Spikes to settle in this milestone's detailed plan:**
  - Kanel needs the Postgres wire protocol to read the dev database, so try `pglite-socket` with a
    Docker fallback.
  - PGlite under `vite dev`: two module instances could open the same directory during a hot
    reload, so keep one instance on `globalThis`.
  - How Vercel's build environment tells a preview from production.
  - How `MOCK=1` combines with a real dev database.
- Likely 2–3 PRs: dev and test infrastructure first, then the Neon wiring and build-step
  migrations.

### 4. Saved apartments

- **Save:** a "Save" button on a lookup stores the address and its results snapshot.
- **Apartment page:** `/apartments/[id]` renders the stored results with no Google call. This is
  the share link.
- **Staleness:** the page shows the compute date, and offers recompute and delete.
- **Open:** whether to warn when saving an address that's already saved. Google's geocoding
  normalizes addresses, which could make duplicates detectable.

### 5. Tracking fields

- **Fields:** label (such as "Unit 4B"), rent, listing URL, status, next step, agent contact, and
  notes.
- **Display:** the listing URL, phone numbers and emails become links you can tap. The page must
  work on a phone, since it'll be used while touring.
- **Open:** the status values. Draft: considering, contacted, toured, applied, signed, passed.
- **Open:** an explicit Save button or autosave, and form actions or `+server.ts` with `fetch`.
  foodservice-insights chose the latter, so read its reasoning before deciding.

### 6. Pipeline list

The home page lists every saved apartment, with status, rent, next step, goals met and the best
time per destination. It's sortable and filterable by status, and links to each apartment page.
The address lookup stays on the same page. This is the first "compare" view. Ship it and watch how
your partner uses it before designing milestone 7.

### 7. Side-by-side compare

- **The view:** pick 2–3 apartments; destinations are rows and apartments are columns, with the
  better time highlighted and rent and next step at the top.
- **Screenshot tests:** revisit them here, as their own PR, because adding Playwright to CI is a
  CI change.

### Later, only if needed

Notes or ratings for each person, CSV export, destinations stored per move.

## Verification

For every PR: `npm run lint && npm run check && npm test`, plus `MOCK=1 npm run dev` to click
through UI changes.

From milestone 3 on, also check the PR's Vercel preview against its own Neon branch:
- the migration ran;
- a saved apartment survives a reload;
- production data wasn't touched.

Real Google calls happen only to check a change by hand, and the PR says so.

## Next step

Bring this plan into the repo with `/plan-adopt`, as `.claude/plans/apartment-tracker.md`. Then
write a detailed plan for milestone 1 or 2; neither depends on anything.
