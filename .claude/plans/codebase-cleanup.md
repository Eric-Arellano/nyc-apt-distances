# Codebase cleanup

## Context

The app has every feature it was meant to have, so the work left is maintainability: the next
person (most likely an agent, since nobody reviews closely any more) should be able to find
things, trust the names, and change a rule in one place. UI, UX and correctness are out of
scope. Every PR below preserves behavior. The one visible change is in PR 6, where the
side-by-side picker joins street and unit with no-break spaces, as the table already does.

What a full read of the code found:

- **The docs lag the app.** The README still introduces a distance calculator. It never says
  what someone editing `destinations.ts` most needs to know: which edits are free and which mark
  every saved apartment's travel times missing until they are recalculated, which is billed.
- **One rule lives in three places.** `goal && goalStatus(route, goal)` is computed in
  `DestinationCard.svelte`, `timeCell` (`server/comparison.ts`) and `sideTrip`
  (`server/sideBySide.ts`). Two parallel types, `TimeCell` and `SideTrip`, both mean "a trip
  this apartment's snapshot may lack".
- **Table columns point at trips by index.** `COMPARISON_GROUPS` names each column by
  `tripIndex`. Reordering a destination's `trips` silently repoints a column at another trip;
  only an out-of-range index throws. Each mode's emoji is defined in three places.
- **Names that mislead.** There are two "status" concepts, an apartment's
  (`status.ts`) and a goal's (`GoalStatus`). `comparison.ts` holds only the table's logic,
  while the `/compare` route is the side-by-side. `types.ts` is a grab-bag name.
  `addressUtils.ts` sits under `components/` though a remote function's schema uses it.
- **Layout.** `src/lib/server/` has 17 flat files, six of them the Google client, told apart
  only by a `gmaps` prefix. Two `../params` imports reach outside `#lib`.

## Decisions

- **Mechanical PRs first** (1–2: moves, renames), so the logic PRs are reviewed against
  final names and rebases stay trivial. **Docs last** (7), so they describe the final layout.
- **Every relative import names its file extension.** Biome's `useImportExtensions` enforces
  it in `.ts` files, but Biome doesn't check `.svelte` script blocks, so a move that touches a
  Svelte import writes `.ts` by hand.
- **The shared/server pairing becomes the stated convention.** A feature's shared types and
  pure logic live in `src/lib/x.ts`. The half that reads `DESTINATIONS` or the database lives in
  `src/lib/server/x.ts`, as `sideBySide.ts` already does. PR 2 applies it to `travelTimes` and
  `comparisonTable`, and PR 7 writes it into `AGENTS.md`.
- **Goals are judged where they meet stored routes**, in `toTripResults`. That is still read
  time, so editing a goal re-judges every apartment without recalculating.
- **Column keys never change.** `?sort=` links carry them, and the `TABLE_GROUPS` key test pins
  them. PR 4 must leave that test untouched and passing.
- **Kept WET on purpose:**
  - `DetailsForm`'s six fields, since each differs.
  - The hidden-id `<input>` in each form.
  - The three `NO_DETAILS` test copies. They are typed, so a new field fails the typecheck in all three.
  - The `window` stub in two tests and `spyMaps` in two tests.
  - `DestinationCard`'s own tint palette.
  - The back link that the apartment and compare pages share.
- *Rejected: renaming `GoalStatus` to tell it from apartment status, because renaming `status.ts` to
  `apartmentStatus.ts` separates them at a fraction of the churn.*
- *Rejected: a lint rule banning `../` imports. Only two exist, both removed in PR 2, and
  `+layout.svelte`'s `../app.css` is legitimate.*
- *Rejected: injecting destinations into `apartments.ts` so its tests use their own. That would
  thread them through every caller for one test, and asserting less in that test does the job.*
- *Rejected: renaming the remote functions to match their server counterparts (`addApartment`
  → `saveApartment`, …). Each body is one line that shows the pairing, and a rename changes
  the endpoint names.*

## PR 1: Group the Google client under `src/lib/server/maps/`

Pure moves with `git mv`, each test file moving with its module. Update importers, including
`scripts/capture-fixtures.ts`.

| From `src/lib/server/` | To `src/lib/server/maps/` |
| --- | --- |
| `gmapsFetch.ts` | `googleFetch.ts` |
| `gmapsGeocoding.ts` | `geocoding.ts` |
| `gmapsRouting.ts` | `routing.ts` |
| `maps.ts`, `getMaps.ts`, `fakeMaps.ts` | same names |
| `weeklyTime.ts` | `weeklyTime.ts`. `Trip` embeds `WeeklyTime`, and routing is its only logic consumer. |

## PR 2: Name shared modules for what they hold

Moves and merges only, with no logic change. Each moved function keeps its comments.

- `src/lib/types.ts` and `src/lib/goalStatus.ts` → `src/lib/travelTimes.ts`, the shared half of
  `server/travelTimes.ts`. `goalStatus.test.ts` → `travelTimes.test.ts`.
- `src/lib/status.ts` → `src/lib/apartmentStatus.ts`, with its test.
- `src/lib/comparison.ts` and `src/lib/server/comparison.ts` → `comparisonTable.ts` in both
  places, with their tests, matching `ComparisonTable.svelte`.
- `src/lib/address.ts` collects how we read and write an apartment's address: `unit.ts`
  (`formatUnit`, `withUnit`, `parseUnit`, `UnitSchema`), `isValidAddress` from
  `components/address/addressUtils.ts`, and `streetPart` from `comparison.ts`. Their tests merge
  into `address.test.ts`.
- `parseApartmentId` and its comment → `src/lib/apartmentId.ts`. `params.test.ts` becomes
  `apartmentId.test.ts`, and `src/params.ts` keeps only `defineParams`. This removes both
  `../params` imports.
- `components/address/AddressInput.svelte` (with its test) and `components/DeleteApartment.svelte`
  → `components/apartment/`. `components/address/` goes away.

## PR 3: Judge each trip once

- `TripResult` (in `lib/travelTimes.ts`) gains `status?: GoalStatus`, absent when the trip has no
  goal. `toTripResults` in `server/travelTimes.ts` sets it.
- One shared `TripCell = { kind: 'missing' } | { kind: 'trip'; route: Route; status?: GoalStatus }`
  in `lib/travelTimes.ts` replaces `TimeCell` (`comparisonTable.ts`) and `SideTrip`
  (`sideBySide.ts`). Beside it go `toTripCell(trip: TripResult | undefined)` and `routeMinutes`,
  moved from `sideBySide.ts`.
- `timeCell` becomes a lookup plus `toTripCell`, and `pairDestinations` uses `toTripCell`.
  `ComparisonTable`'s `sortValue`, `cellText` and `cellTitle` read minutes through
  `routeMinutes`. `DestinationCard` reads `status` and stops calling `goalStatus`.
- Tests:
  - Update `toDestinationResults`, `timeCell`, `pairDestinations` and `ComparisonTable` to the
    new shapes.
  - Rewrite the `listApartments` test to assert what that function adds: row fields, a cell
    per table column, and `missing` where the snapshot lacks a destination.
  - Drop the goal verdicts from that test. Today it fails whenever a goal in `destinations.ts`
    is tuned, and the `goalStatus` and `toDestinationResults` tests already cover judging.

## PR 4: Declare table columns on their trips

- `Destination` gains `shortTitle`. `DestinationTrip` gains `column?: false | { icon?: string;
  label?: string }`. Absent means a column with the mode's icon. `false` means no column, as for
  Bet Am Shalom's drive, which keeps its comment.
- `toColumnGroups(destinations)` derives the groups in `DESTINATIONS` order, skipping
  destinations without a column, and has no error paths. Delete `ComparisonGroup`,
  `COMPARISON_GROUPS`, the identity `MODE_NAMES` map in `server/comparisonTable.ts`, and the two
  "rejects" tests.
- One `MODE_ICONS: Record<TripMode, string>` goes beside `TripMode` in `lib/travelTimes.ts`, so
  server code needn't import from `components/`. It is used by the column default, `format.ts`'s
  `describeRoute` and `NO_ROUTE`, and `SideBySide`'s `tripIcon` fallback. While in `format.ts`,
  collapse the identical walk, bike and drive branches and type `NO_ROUTE` by `TripMode`.
- The current `COMPARISON_GROUPS` order already matches `DESTINATIONS`, so headers and columns
  render identically.
- *Rejected: keeping a separate column list that is "free to change" apart from `trips`. The only
  freedom it has ever used is leaving a trip out, which `column: false` covers.*

## PR 5: Tidy the apartment store, remote functions and routing

- `server/apartments.ts`:
  - `getApartment` throws a 404 like its three siblings, rather than returning `undefined`. The
    apartment page's load drops its copy of "No saved apartment has that link." Export the
    message as `APARTMENT_NOT_FOUND` for compare's `loadSide`, which still 404s an id it
    can't parse.
  - Add a private `updateApartment(db, id, values)` for the update-or-404 that
    `updateApartmentDetails` and `setApartmentStatus` repeat.
  - Add `readSnapshot(travelTimes: unknown)`, which holds the `jsonb` cast and its Kanel comment
    once, for `getApartment` and `listApartments`.
- `export type Db = Kysely<Database>` from `db/createDatabase.ts` replaces the local alias in
  `apartments.ts` and compare's `Awaited<ReturnType<typeof getDatabase>>`.
- `apartments.remote.ts`: rename the `NewApartment` schema, which shadows the generated
  `NewApartment` insert type, to `NewApartmentForm`. Rename `SavedApartment` to `ApartmentIdForm`.
- `maps/routing.ts`:
  - Split each mode's request fields from its `bufferMinutes`, so `routeRequest` needn't
    destructure `bufferMinutes: _`.
  - `routeRequest` returns the arrival target it computed, so `requestRoute` stops reading
    `String(request.body.arrivalTime)` back out of its own body.
- Tests:
  - `apartments.test.ts` gets a `saveOutcome(address, options, maps = fakeMaps)` helper beside
    `save`, replacing the six inline
    `saveApartment(db, …, { …, allowDuplicate: false })` calls.
  - Add one expected-404 constant, and make `getApartment`'s unknown-id test a 404 test.
  - `routing.test.ts` hoists the fake-timer setup it repeats in two `describe`s.
  - `server/sideBySide.test.ts` spells `day: 5` as `DayOfWeek.Friday`.

## PR 6: Tidy the Svelte components

- Add one `shortAddress(address, unit)` to `lib/address.ts`: the street part, then the unit,
  joined by ` · ` with explicit ` ` escapes. It replaces `ComparisonTable`'s inline copy,
  whose no-break spaces are invisible in the source, and `SideBySide`'s `shortName`.
- Add `splitInPlay(items)` to `lib/apartmentStatus.ts`, used by `sortRows` and `SideBySide`'s
  `inPlay`/`notForUs`.
- Extract `components/apartment/MissingTravelTimes.svelte` from the apartment page: the
  recalculate alert, its pending state and its error. The page then reads as its sections.
- Extract `components/comparison/ApartmentSelect.svelte` from `SideBySide`'s sticky bar: one
  side's native select laid over its name, keeping its comment. It is the largest
  self-contained piece of a 334-line component.
- `format.ts`: `transitLines`' doc says it describes the time, but it doesn't. Rewrite
  `format.test.ts`'s bare titles (`'bike'`, `'drive'`, `'unavailable'`) as situations, per
  `AGENTS.md`, with `test.each` for walk, bike and drive.
- Small fixes:
  - `DetailsForm`'s per-instance `ORIGINAL_KEYS` → `detailKeys`.
  - Rewrap the over-long doc comment in `DestinationList.svelte.test.ts`.

## PR 7: Revamp the docs

- **README:**
  - Open with what the app is now: it looks up an apartment's travel times to the places we
    care about, saves every lookup, and tracks status, rent, listing, agent and notes. It
    compares apartments in a sortable table and side by side, behind one shared password.
  - Keep the run, dev-database, deploy and shadcn sections, rewrapping the two over-long lines.
  - Expand "Changing destinations and goals":
    - Titles, goals, labels and columns are free to change.
    - Changing a place or trips, their order included, marks saved travel times missing until
      each apartment is recalculated by hand, which is billed.
  - "Interesting parts" gains two entries:
    - Travel times are a snapshot: pages never call Google, and fingerprints catch staleness.
    - Telling apartments apart: `place_id` plus unit, and units share a snapshot.
  - Name files rather than describe mechanism.
- **`AGENTS.md`:** add a few "where code goes" conventions, not a file tree:
  - The shared/server pairing.
  - Google is reached only through `Maps` in `src/lib/server/maps/`, which `fakeMaps` fakes in
    tests and under `MOCK=1`.
  - Nothing hand-written goes in `components/ui/`.
- Fix any comment the earlier PRs left stale. This PR lands the last section, so it deletes this
  plan, per `/plan-advance`.

## Verification

- The mechanical PRs (1–2) must end with the 330 tests `main` had before this cleanup, because
  renamed test files keep their tests.
- For every PR, run `npm run lint && npm run check && npm test`. Then read `git status` and the
  diff for secrets, absolute home paths and private addresses.
- For PRs that touch Svelte (2, 3, 4, 6), run `svelte-autofixer` on each touched component until
  it is clean. Then run the app with `SITE_PASSWORD=<throwaway> MOCK=1 npm run dev`, which bills
  nothing, needs no Google key and doesn't read `.envrc`.
  - Sign in, then screenshot `/` (sorted at least once), an apartment page, and
    `/compare?a=…&b=…` with Playwright. Compare them against `main`; they should be identical
    apart from PR 6's no-break spaces.
  - Add test apartments only at public addresses, such as the fixtures' 100 Martine Ave.
  - Screenshots stay local, since `.pglite/` may hold real apartments.
- After PR 4, check that the `TABLE_GROUPS` key test passes unchanged, so shared `?sort=` links
  still resolve.
