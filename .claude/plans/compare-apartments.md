# Comparing apartments

## Context

Every address we look up is saved as an apartment with a snapshot of its travel times, and its
page tracks rent, listing, agent, status, next step and notes. What's left is **comparing**:
seeing how the apartments stack up. Two of us will use it, one of whom is not technical and lives
in Google Sheets, so the views should feel like a spreadsheet and read well with blanks, since
most lookups are never followed up.

The question we most want answered is "which apartment is closest to X?", such as the walk to
the Hebrew Institute, across every apartment at once. Then, for two finalists, "how do these
differ on everything?" That makes two views: a sortable table of everything (PR 1), and a
side-by-side view of two apartments (PR 2).

**How we get there matters as much as how long it takes.** Walking is what we'd do on Shabbat,
transit is the fallback, and driving anywhere in town is always reasonable, so a fast drive must
never make a destination look good. The same goes for the station: walking is safer, but a bike
ride within its own goal will do. So each trip in `DESTINATIONS` carries its own goal, or none
when it is only for reference, and `goalStatus` (`src/lib/goalStatus.ts`) judges one route
against it. The table gives a column to each trip that tells apartments apart.

Both designs are drawn in a clickable mockup with made-up apartments
(https://claude.ai/artifact/6E9oUL4EdasFP8Kg7cDFGY, private), which we approved after two rounds. The
real thing is checked on its PR's preview, at phone width too, before the design is called done.

**Out of scope:** automatically finding listings (no usable listings API exists), accounts for
each person, destinations stored in the database, maps.

## What the remaining work relies on

- **Every route is gated except `/login`** (`src/hooks.server.ts`), so a new `/compare` route is
  private without doing anything.
- **Pages read through `load` functions**, and links are built with `resolve` from `$app/paths`.
- **A snapshot can lack a destination.** `toDestinationResults` drops it from `results` and
  names it in `missing`, so a view that lines trips up in columns or rows must show a gap ("—")
  rather than shift everything over. Each result's `trips` pairs a route with its goal and label.
- **A trip is named by destination id and its position in `trips`.** Mode is not enough: Bet Am
  Shalom has a bus on Friday and another on Saturday, told apart by their labels.
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

## PR 1: Comparison table

The home page's "Saved apartments" list becomes a table, one row per apartment. The add form
stays above it, since looking up addresses is still the most common thing we do.

**Columns**, left to right:

1. **Apartment**, frozen. The street part of the address (before the first comma) and the unit,
   linking to its page, with the next step beneath in small muted text, clamped to one line. The
   full address is the link's `title`. Next step rides here rather than in its own column, so the
   table fits a laptop without scrolling.
2. **Status**, as its label.
3. **Rent**, as `$2,850`; the header says "/mo".
4. **One column per trip worth comparing**, its minutes tinted green, yellow or red by
   `goalStatus`. They are, grouped under their destination: Station 🚶 🚴, HI 🚶, Park 🚶,
   Grocery 🚶, Bet Am Shalom 🚶 · 🚌 Fri · 🚌 Sat, CBST 🚆, Florham 🚗. Bet Am Shalom's drive
   gets no column, since driving there is always reasonable; it is on the apartment page and in
   PR 2. The list lives in code beside `DESTINATIONS`, as destination id, trip position and short
   label. A trip the snapshot lacks is "—", untinted; one Google found no route for is "None",
   red unless the trip has no goal. A legend under the table says what the colors mean.

**Headers** are two rows. A destination with several columns names itself once across them, with
each column's mode icon (and day) below; a destination with one column puts its name above its
icon in a single cell, so every icon lines up on the bottom row. Every time column is the same
width, and a faint rule separates destinations. Short names (HI, BAS, CBST) are what we call
them anyway; the full name is the header's `title`.

**Sorting.** Every column header is a button. The first click sorts the obvious way (shortest,
cheapest, earliest in the process) and the second reverses it. Blanks sink to the bottom either
way, and ties fall back to newest first. The default is by status. The sort lives in the URL
(`?sort=hebrew-institute-walk`, `&desc`), so it survives going to an apartment and back, and a
sorted link can be shared.

**"Not for us"** apartments always sit in their own section at the bottom, whatever the sort,
dimmed, so the comparison is among the apartments still in play. *Rejected: a status filter,
because with a few dozen apartments sorting and sinking do the job without another control.*

**Telling rows apart.** The frozen apartment column is the anchor: on a phone, the times scroll
sideways under it, as in a Sheets frozen column. The hovered row is highlighted. *Rejected:
striped rows, which were noise on top of the tinted cells.* **Open:** a sticky header row, which
`overflow-x` on the table's wrapper stops sticking to the page; live without it unless the table
gets long.

**Data.** `listApartments` returns each apartment's status, unit, rent, next step and, per
column, the trip's minutes (or none, or missing) and its goal status, computed on the server from
`toDestinationResults`. The columns come from the load as well, so the browser never imports
`DESTINATIONS`. Pure functions worth testing: picking a column's trip out of the results, the
street part of an address, and the sort (direction, blanks, "Not for us", ties).

A prefactor PR can go first: the column list, with no visible change.

## PR 2: Side-by-side compare

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
  included. A destination picked from several places names the one picked ("to Hartsdale"), since
  that can differ between the two, and a transit trip lists its lines. Each cell is tinted by
  `goalStatus` for that trip, or left plain when the trip has no goal.
- **The better side** is bold and outlined, with how much better beneath (`6 min faster`,
  `$150 less`); a tie is plain. *Rejected: a label beside the number, and bars, both tried in
  the mockup.*
- **Data.** The load returns both apartments as `getApartment` does. Pure functions worth
  testing: pairing the two apartments' trips by destination and trip position (a trip one of them lacks
  shows "—" on that side), and the difference marking.

## Later, only if needed

Notes or ratings for each person, CSV export, destinations stored per move, screenshot tests (as
their own PR, since adding Playwright to CI is a CI change), and storing the coordinates a lookup
geocodes (without them, maps and every recompute geocode the address again, billed).

## Verification

For every PR: `npm run lint && npm run check && npm test`, plus `MOCK=1 npm run dev` to click
through UI changes, at phone width too. Then check the PR's Vercel preview, whose Neon branch
holds a copy of our real apartments, which is the first time the views meet real data.

Real Google calls happen only to check a change by hand, and the PR says so.

## Next step

Start PR 1.
