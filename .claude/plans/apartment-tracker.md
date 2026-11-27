# Apartment tracker: roadmap

## Context

The app saves every address we look up as an apartment, with a snapshot of its travel times, and
gives each one a page we can share. That page also tracks its rent, listing, agent, notes, and
where it is in the process, replacing the spreadsheet from the last move. Two of us will use it to
find an apartment for next summer's move, and probably for later moves too; one of us is not
technical and lives in Google Sheets, so plain words and forgiving inputs matter more than
density. What's left is **compare:** see how apartments stack up. What this means is still
undecided, so build cheap views and let us react to them.

This document is the roadmap of PRs. Each PR gets its own detailed plan before work starts.

**Out of scope:** automatically finding listings (no usable listings API exists), accounts for
each person, destinations stored in the database, maps.

## Architecture

- **Auth stays the one shared site password.** Every route is gated except `/login`
  (`src/hooks.server.ts`), so a new route is private unless someone opens it on purpose. Signing
  in returns to `redirectTo`, so a shared link to an apartment page survives the login.
- **The browser reaches the server through remote functions** (`src/lib/apartments.remote.ts`),
  experimental in SvelteKit 3.1 and accepted as such. Writes are `form` or `command` functions,
  not form actions. Every remote form enhances with `signInOnExpiredSession`, which sends an
  expired session to the login page and never resets the form; a form about a saved apartment
  takes its id as a hidden field validated by `SavedApartment`. An address geocoding rejects comes
  back through `showBadRequestInForm` as an issue the form shows in place; any other failure goes
  to the error page. *Rejected: form actions with `use:enhance`, and `+server.ts` with `fetch`.*
- **Pages read through `load` functions**, as `/apartments/[id=apartmentId]` does, so the page
  renders on the server and an unknown id is a real 404. Links are built with `resolve` from
  `$app/paths`, never spelled out, so a renamed route fails the type check.
- **Every lookup saves**, so opening a link never spends the Google key again. A mistaken save is
  deleted from its page. *Rejected: a lookup that saves only when asked, because an unsaved
  lookup's link re-bills Google on every open, and the saved one is what we share anyway.*
- **Duplicates are matched on Google's `place_id` and the unit**, which the add form asks for
  beside the address because buildings with several apartments we're considering are common. A
  different unit saves without asking; a missing unit on either side could be any unit, so it
  offers the saved ones to open, or to save a separate apartment. Another unit copies the
  building's travel times instead of routing again.
- **Neon Postgres, through Vercel's Neon integration**, reached only from the server, with no RLS.
  Production uses Neon's main branch; each PR preview gets its own branch, which starts as a copy
  of production's data and keeps its writes to itself, as #117's preview showed. Nothing run locally
  writes to Neon (`src/lib/server/database.ts` holds the reasoning), so Postgres-specific behavior
  is checked on a PR's preview.
- **Kysely** builds the queries in camelCase and runs the migrations; **Kanel** generates the types
  in `src/lib/server/db/schema` from the migrations with `npm run db:types`. A new migration goes in
  `src/lib/server/db/migrations/`, listed by hand in its `index.ts`. Migrations run in Vercel's build
  step, and a migration that has landed is never edited. Tests get a fresh, migrated PGlite per file
  from `createTestDatabase()` in `tests/db.ts`.
- **`pg` and PGlite bind `jsonb` differently.** `pg` sends a JS array as a Postgres array
  literal, which `jsonb` rejects; PGlite accepts it. `npm run db:types` types `jsonb` writes as
  `string`, so the type checker demands `JSON.stringify(…)`, the form both accept.
- **Travel times are stored as a snapshot** in `apartment.travel_times`, keyed by destination id
  and a fingerprint of that destination, so copy such as titles and goals can change in code
  without touching stored rows. `getApartment` reads it through `toDestinationResults`, which joins
  it with `DESTINATIONS` and lists what's missing; a stale snapshot is recomputed whole, only when
  asked. **Open:** whether to also store the coordinates the lookup geocodes. Without them, maps
  and every recompute geocode the address again, billed.
- **Deleting is a hard delete**, only from the apartment page. Any table that references
  `apartment` declares `on delete cascade`, so one statement removes an apartment and everything
  about it. *Rejected: a delete in the list's rows, because a mistake is noticed on the page saving
  lands on, and an apartment we turn down is better marked "Not for us" than deleted with its
  history.*
- **Status is a Postgres enum, `apartment_status`**, declared in process order (Interested,
  Reached out, Visited, Applied, Signed, Not for us), so `order by status` follows the process.
  The words live in `STATUS_LABELS` in `src/lib/status.ts`. Status is coarse on purpose; the
  free-text next step carries the detail ("send reference letter").
- **Every other tracking field may be empty**, since most lookups are never followed up, and a
  view must read well with blanks. Rent is whole dollars a month (`integer`); the listing URL is
  always http(s), checked on save because it renders as a link; the unit (added by #120) is stored bare ("4B") and
  shown through `formatUnit`; the details form edits it, which is how a saved apartment that forgot
  its unit gets one; next step, one free-text agent contact and one shared notes field
  (we type our names inline) are text. `getApartment` returns them as `details`, typed
  `ApartmentDetails` in `src/lib/apartmentDetails.ts`; `listApartments` returns none of them yet.
- **Details are read first and edited on purpose**: an Edit button turns the card into a form
  with Save and Cancel, while status saves the moment it's picked. The form posts what it opened
  with as hidden `original` fields, and only fields that differ are written, so a stale tab can't
  undo the other person's save. *Rejected: autosave per field, because display text is what makes
  phone numbers tappable on a tour, and inputs invite accidental edits while scrolling.*
- **Comparison reuses `goalStatus`** from `src/lib/components/travelTimes/format.ts`. Once views
  other than the destination card need it, it moves somewhere neutral.
- **UI comes from shadcn-svelte**, added with `npx shadcn-svelte add`; Table is likely next, for
  the pipeline. Status uses NativeSelect rather than Select, so a phone shows its own picker.
  bits-ui is installed, and the CSP already allows its inline styles.

## Privacy, standing rules

- Apartment addresses **and agent contact details** never appear in fixtures, tests, seeds,
  commits or PRs.
- Previews hold copies of production data, which is acceptable only because every route requires
  the password. Vercel's fork protection must stay enabled.
- A deleted apartment survives in any preview branched before the delete, until that branch is
  deleted, and in Neon's restore window.

## PRs

PR 2 waits on watching the pipeline in use.

## PR 1: Pipeline list

Grows the home page's bare "Saved apartments" list into a pipeline: unit, status, rent, next
step, goals met and the best time per destination, sortable by status or rent and filterable by
status, each row linking to its apartment page. `listApartments` grows to return those fields.
The add form stays on the same page. It must work on a phone, where a wide table likely becomes a
card per apartment. This is the first "compare" view. Ship it and watch how your partner uses it
before designing PR 2.

## PR 2: Side-by-side compare

- **The view:** pick 2–3 apartments; destinations are rows and apartments are columns, with the
  better time highlighted and rent and next step at the top.
- **Screenshot tests:** revisit them here, as their own PR, because adding Playwright to CI is a
  CI change.

## Later, only if needed

Notes or ratings for each person, CSV export, destinations stored per move.

## Verification

For every PR: `npm run lint && npm run check && npm test`, plus `MOCK=1 npm run dev` to click
through UI changes, at phone width too. Also check the PR's Vercel preview against its own Neon
branch:
- the migration ran, and the build log names the preview branch's host, not production's;
- a saved apartment survives a reload;
- production data wasn't touched.

Real Google calls happen only to check a change by hand, and the PR says so.

## Next step

Start PR 1.
