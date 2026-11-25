# Apartment tracker: roadmap

## Context

The app answers "how far is this address from the places we care about?", and saves every address
it looks up with its travel times. Two of us will use it to find an apartment for next summer's
move, and probably for later moves too, so it needs three things:

- **Share:** send each other an apartment and see the same results. Done: each saved apartment
  has its own page, and that page's link is what we send.
- **Compare:** see how apartments stack up. What this means is still undecided, so build cheap
  views and let us react to them.
- **Track:** rent, listing, agent contact, and where each one is in the process ("did credit
  check, need to send reference"). This replaces the spreadsheet from the last move.

All three rest on **a saved apartment**: an address plus its stored travel times, and soon
free-form tracking fields. This document is the roadmap of the PRs that remain. Each PR gets its
own detailed plan before work starts.

**Out of scope:** automatically finding listings (no usable listings API exists), accounts for
each person, destinations stored in the database, maps.

## Architecture

- **Auth stays the one shared site password.** Two people don't need accounts. Every route is
  gated by default except the `/login` route, matched by route id in `src/hooks.server.ts`: pages
  redirect to `/login?redirectTo=…` and `/api/` returns 401. A new route is private unless someone
  opens it on purpose. Signing in is a form action on `/login` that returns to `redirectTo`, so a
  shared link to an apartment page survives the login, and the session cookie's key is stretched
  from the password with scrypt (`src/lib/server/auth.ts`).
- **Every lookup saves.** The home page's form action (`src/routes/+page.server.ts`) geocodes the
  address, computes its travel times, stores the apartment and redirects to its page,
  `/apartments/[id=apartmentId]`, whose `load` reads only the stored snapshot. So opening a link
  never spends the Google key again, and no `/api/` route is left. The cost is that a mistaken save
  stays until deleting lands. *Rejected: a lookup that saves only when asked, because an unsaved
  lookup's link re-bills Google on every open, and the saved one is what we share anyway.*
- **Reads are `load` functions; writes are form actions** with `use:enhance`, as signing in already
  was. A Google failure comes back through `lookupFailure` (`src/lib/server/lookupFailure.ts`) as
  a failure the form shows in place, keeping what was typed; other HTTP errors, such as a 404, go
  to the error page. *Rejected: `+server.ts` with `fetch`, which foodservice-insights chose so
  maintainers new to SvelteKit see one plain mechanism; this app has no such maintainers, and form
  actions give progressive enhancement and typed `form` results for free. Rejected: remote
  functions, because Kit 3.1 still marks them experimental and they need the app-wide
  `experimental.async` flag.*
- **Apartment URLs carry the integer id**, checked by the `apartmentId` matcher in `src/params.ts`,
  which hands routes an `ApartmentId`. Links are built with `resolve` from `$app/paths`, never
  spelled out, so a renamed route fails the type check.
- **Neon Postgres, through Vercel's Neon integration.** Production uses Neon's main branch, and
  each PR preview gets its own Neon branch, created and deleted by the integration.
  *Rejected: Supabase, because branching needs a paid plan and free projects pause after a week
  idle; we need neither Supabase Auth nor Storage.*
- **The database is reached only from the server, with no RLS**, as in foodservice-insights.
- **Kysely** builds the queries, in camelCase through its `CamelCasePlugin`, and runs the
  migrations; **Kanel** generates the types in
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
    saves still go to this database. Dev always ignores `DATABASE_URL`, so a production URL
    pulled from Vercel can't reach it.
  - Previews and production: `pg` against Neon's pooled `DATABASE_URL`. The code never tells a
    preview from production: the integration hands each deployment its own branch's URL.

  *Rejected: copying foodservice-insights' local Supabase stacks; most of that code exists to work
  around Supabase-specific problems.*
- **Migrations run in Vercel's build step** (`buildCommand` in `vercel.json`, which runs
  `scripts/migrate.ts` over `DATABASE_URL_UNPOOLED`), against whichever Neon branch that
  deployment uses, so CI doesn't change. The script logs the host it migrated, which names the
  branch, and refuses to run outside a Vercel build. Every pending migration runs in one
  transaction, and a migration that has landed is never edited.
- **Nothing run locally writes to Neon.** Postgres-specific behavior is checked on a PR's preview
  (`src/lib/server/database.ts` holds the reasoning).
- **`pg` and PGlite bind `jsonb` differently.** `pg` sends a JS array as a Postgres array
  literal, which `jsonb` rejects; PGlite accepts it. `npm run db:types` types `jsonb` writes as
  `string`, so the type checker demands `JSON.stringify(…)`, the form both accept.
- **Travel times are stored as a snapshot** in `apartment.travel_times`, with the time it was
  computed. Each entry holds only what Google produced (closest place and routes), keyed by
  destination id and a fingerprint of that destination, so copy such as titles and goals can change
  in code without touching stored rows. `computeTravelTimes` in `src/lib/server/travelTimes.ts`
  returns a `TravelTimeEntry` per destination with its `fingerprint` (a hash of the destination's
  place and trips, so reordering trips changes it). It takes the origin already geocoded: callers
  in `src/lib/server/apartments.ts` geocode first, which is what lets the duplicate check run
  before any route is billed. `toDestinationResults` joins entries with the copy in
  `DESTINATIONS`, in code order, and names as `missing` every destination with no entry whose
  fingerprint still matches. Only `apartments.ts` reads or writes the column; it casts Kanel's
  `unknown`, and `TravelTimeEntry` carries the rule that a change stored rows don't satisfy needs a
  migration of them. **Open:** whether to also store the coordinates the lookup geocodes. Without
  them, maps and every recompute geocode the address again, billed.
- **A stale snapshot is recomputed whole.** The apartment page lists the missing destinations and
  offers "Recalculate all travel times", which replaces the whole snapshot, so
  `travel_times_computed_at` stays true of every entry. The button appears only when something is
  missing, so nobody re-bills Google by accident. *Rejected: computing only the missing
  destinations automatically, because it needs a compute time per entry and saves little.*
- **Duplicates are matched on Google's `place_id`**, stored in `apartment.place_id`. Saving a place
  already saved costs one geocode and no routes, and the form offers to open the saved apartment
  or save a separate one. Under `MOCK=1`, `fakeMaps` derives the id from the text, ignoring case
  and spacing. *Rejected: overwriting the saved one, because the same place yields the same travel
  times and Recalculate already covers stale ones. A separate apartment is for another unit in the
  same building, which the tracking fields' label tells apart.*
- **Deleting is a hard delete.** Any table that references `apartment` declares
  `on delete cascade`, so one statement removes an apartment and everything about it.
- **Tracking fields are free-form, except status.** Status is a fixed list, so it can be sorted
  and filtered. Everything else is text: label, rent, listing URL, next step, agent contact, and
  one shared notes textarea (we type our names inline).
- **Comparison reuses `goalStatus`** from `src/lib/components/travelTimes/format.ts`. Once views
  other than the destination card need it, it moves somewhere neutral.
- **UI comes from shadcn-svelte**: Alert for the duplicate and staleness warnings, AlertDialog for
  the delete confirmation, Select for status, Textarea and Field for the tracking form, Table for
  the pipeline. Alert is plain markup; the first bits-ui-backed component (likely PR 1's
  AlertDialog) must add `'unsafe-inline'` to `style-src` in
  `vite.config.ts`, because bits-ui writes `style` attributes during SSR and through
  `setAttribute`, and neither can carry a nonce. `script-src` is what protects the session cookie.

## Privacy, standing rules

- Apartment addresses **and agent contact details** never appear in fixtures, tests, seeds,
  commits or PRs.
- Previews hold copies of production data, which is acceptable only because every route requires
  the password. Vercel's fork protection must stay enabled.
- A deleted apartment survives in any preview branched before the delete, until that branch is
  deleted, and in Neon's restore window.

## PRs

Dependencies: 1, 2 and 3 can run in parallel. 4 comes after 3.

**The Neon setup is done by hand** in the Vercel and Neon dashboards: install Vercel's Neon
integration and connect it to the project with **Preview** checked under "Create database branch
for deployment". The database foundation needs it before it lands, since every build now runs
`scripts/migrate.ts`, which fails without a database URL. The foundation's preview built, so some
URL reached its build step.

**Open:** which one. Neon's docs say branch connection strings are "injected via webhook at
deployment time", but not whether the build step sees them or the stored Preview values, which
point at production. The `Migrating <host>` line in the foundation preview's build log answers
it, and must differ from production's host. If it is production's, the empty `apartment` table
and Kysely's two tables there must be dropped before the foundation merges, because
`001-create-apartment` changed after that preview ran.

## PR 1: Delete an apartment

A "Delete" button on the apartment page, behind a confirmation, deletes the row and returns home.
Ship it first: every lookup saves, so until then a mistyped address that Google still geocodes, or
an unwanted separate copy, comes out only through Neon's console.

## PR 2: Tracking fields

- **Fields:** label (such as "Unit 4B", which also tells apart two units saved at one place), rent,
  listing URL, status, next step, agent contact, and notes.
- **Display:** the listing URL, phone numbers and emails become links you can tap. The page must
  work on a phone, since it'll be used while touring.
- **Open:** the status values. Draft: considering, contacted, toured, applied, signed, passed.
- **Open:** an explicit Save button or autosave. Either way the write is a form action on the
  apartment page.

## PR 3: Pipeline list

Grows the bare "Saved apartments" list on the home page (`listApartments`, rendered by
`src/routes/+page.svelte`) into a pipeline: status, rent, next step, goals met and the best time
per destination, sortable and filterable by status, each row linking to its apartment page. The
add form stays on the same page. This is the first "compare" view. Ship it and watch how your
partner uses it before designing PR 4.

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

Settle the Neon **Open:** above if it still is, and check on the saved-apartments preview that
`002-add-apartment-place-id` ran against the preview branch: it adds a `not null` column with no
default, which works only while production's `apartment` table is empty. Then write a detailed plan
for PR 1, delete an apartment.
