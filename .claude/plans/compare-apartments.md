# Comparing apartments

## Context

Every address we look up is saved as an apartment with a snapshot of its travel times, and its
page tracks rent, listing, agent, status, next step and notes. The home page compares them all
in a sortable table, a column per trip worth comparing (`ComparisonTable.svelte`), which answers
"which apartment is closest to X?" Two of us use it, one of whom is not technical and lives in
Google Sheets, so the views should feel like a spreadsheet and read well with blanks, since most
lookups are never followed up.

What's left is the other question: for two finalists, "how do these differ on everything?" That
is a side-by-side view of two apartments.

**How we get there matters as much as how long it takes.** Walking is what we'd do on Shabbat,
transit is the fallback, and driving anywhere in town is always reasonable, so a fast drive must
never make a destination look good. The same goes for the station: walking is safer, but a bike
ride within its own goal will do. So each trip in `DESTINATIONS` carries its own goal, or none
when it is only for reference, and `goalStatus` (`src/lib/goalStatus.ts`) judges one route
against it. The table gives a column only to each trip that tells apartments apart
(`COMPARISON_GROUPS`, beside `DESTINATIONS`); the side-by-side view shows every trip.

Both designs are drawn in a clickable mockup with made-up apartments
(https://claude.ai/artifact/6E9oUL4EdasFP8Kg7cDFGY, private), which we approved after two rounds; the
table followed it closely and read well. The real thing is checked on its PR's preview, at phone
width too, before the design is called done.

**Out of scope:** automatically finding listings (no usable listings API exists), accounts for
each person, destinations stored in the database, maps.

## What the remaining work relies on

- **Every route is gated except `/login`** (`src/hooks.server.ts`), so a new `/compare` route is
  private without doing anything.
- **Pages read through `load` functions**, and links are built with `resolve` from `$app/paths`.
  View state that should survive a round trip or be shareable lives in the URL, read from
  `page.url` and changed with `goto(…, { replace: true, reset: false })`, as the table's sort is.
- **A snapshot can lack a destination.** `toDestinationResults` drops it from `results` and
  names it in `missing`, so a view that lines trips up in columns or rows must show a gap ("—")
  rather than shift everything over. Each result's `trips` pairs a route with its goal and label.
- **A trip is named by destination id and its position in `trips`.** Mode is not enough: Bet Am
  Shalom has a bus on Friday and another on Saturday, told apart by their labels. The table's
  `timeCell` (`src/lib/server/comparison.ts`) picks a trip out of the results this way.
- **The table's look is the one to match**: goal tints are Tailwind fills (`bg-green-600/30`,
  `bg-yellow-600/30`, `bg-red-600/30`) in `ComparisonTable.svelte`, a "None" for no route is red
  only when the trip has a goal, and there is no legend, since the colors read on their own.
  When a second view needs the tints, move them somewhere both import rather than copying them.
- **Helpers already written**: `streetPart` (`src/lib/comparison.ts`) for a short apartment name,
  `withUnit` for the full one, `formatDollars` (`src/lib/apartmentDetails.ts`) for `$150`, and
  `goalText` for a goal in words.
- **Changing a destination's place or trips marks every saved apartment stale** (its fingerprint
  in `src/lib/server/travelTimes.ts`), and each is recalculated by hand, billed. Titles, goals and
  labels are free to change.
- **`STATUSES`** in `src/lib/status.ts` is in process order, the order a status sort uses.
- **UI comes from shadcn-svelte**, added with `npx shadcn-svelte add`, which copies source in
  rather than adding a dependency. Selects are NativeSelect, so a phone shows its own picker.

## Privacy, standing rules

- Apartment addresses **and agent contact details** never appear in fixtures, tests, seeds,
  commits, PRs or mockups. Mockups use made-up streets.
- Previews hold copies of production data, which is acceptable only because every route requires
  the password. Vercel's fork protection must stay enabled.
- A deleted apartment survives in any preview branched before the delete, until that branch is
  deleted, and in Neon's restore window.

## PR 1: Side-by-side compare

Two apartments, side by side, at `/compare?a=<id>&b=<id>`. Two is enough, and two columns fit a
phone without scrolling sideways.

- **Choosing them.** Each side is a NativeSelect of every apartment, in a bar pinned to the top
  while scrolling (the view is long on a phone), with a link under each to that apartment's page.
  The bar is raised in color and shadowed so it reads as separate from what scrolls under it. An
  apartment page links to "Compare with…", which opens the view with that apartment on the left.
  A side not chosen yet shows its select alone. An unknown id is a 404, as on the apartment page.
  *Rejected: checkboxes in the table, because they cost the frozen column width on a phone.*
- **At a glance.** Status, rent, next step and the listing's site name, one row each.
- **Travel times.** A heading per destination, then a row per trip: the mode's icon (and label)
  once at the left with its goal in muted text, then each apartment's minutes. Every trip shows, drives
  included. A destination picked from several places names the one picked (the closest park), since
  that can differ between the two, and a transit trip lists its lines. Each cell is tinted by
  `goalStatus` for that trip, or left plain when the trip has no goal.
- **The better side** is bold and outlined, with how much better beneath (`6 min faster`,
  `$150 less`); a tie is plain. *Rejected: a label beside the number, and bars, both tried in
  the mockup.*
- **Data.** The load returns both apartments as `getApartment` does. Pure functions worth
  testing: pairing the two apartments' trips by destination and trip position (a trip one of them lacks
  shows "—" on that side), and the difference marking.

## Later, only if needed

A sticky header row on the table, which `overflow-x` on its wrapper stops sticking to the page,
if the table gets long. Notes or ratings for each person, CSV export, destinations stored per
move, screenshot tests (as their own PR, since adding Playwright to CI is a CI change), and
storing the coordinates a lookup geocodes (without them, maps and every recompute geocode the
address again, billed).

## Verification

For every PR: `npm run lint && npm run check && npm test`, plus `MOCK=1 npm run dev` to click
through UI changes, at phone width too. `MOCK=1` gives every apartment the same times, so a
comparison view is better judged against made-up apartments with varied times, seeded into the
`.pglite/` of a scratch worktree so the dev database is left alone. Then check the PR's Vercel
preview, whose Neon branch holds a copy of our real apartments, which is the first time the views
meet real data.

Real Google calls happen only to check a change by hand, and the PR says so.

## Next step

Start PR 1, the side-by-side view.
