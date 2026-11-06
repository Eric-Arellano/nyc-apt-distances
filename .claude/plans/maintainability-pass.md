# Maintainability pass after the White Plains move

## Context

The NYC → White Plains rewrite is done and the UX is settled. Eric asked for one more pass on
health (organization, tests, docs, names), weighted toward what makes the likely next changes
easy: **tweaking goals** (config), maybe **pre-populating addresses from a listings API**, and
maybe **a database of past results with a list/compare view**. Making it perfect is not the goal,
and stopping soon is a real option.

**Overall assessment:** the codebase is in good shape. Google sits behind the `Maps` seam
(`src/lib/server/travelTimes.ts`), `Route` is a proper union, fixtures are real, and AGENTS.md is
thorough. What's left is a handful of small PRs, stacked in order. PRs 1–2 are worth doing. 3–5
are nice to have, and it's fine to stop after any one of them.

The auth hook in `src/hooks.server.ts` now exempts exactly `/api/login`, and gates only `/api/`.
A page that loads stored addresses must call `hasSession` itself; the hook's comment says so.

## PR 1: Keep goal edits config-only
Today, changing a goal or a park in `destinations.ts` breaks
`src/lib/server/travelTimes.test.ts`, which hard-codes the Hebrew Institute's goal and the closest
park's name. Since goal tweaks are the change you'll most likely make, a config edit shouldn't
break a test.
- Change `computeTravelTimes(origin, maps)` to take the destinations too:
  `computeTravelTimes(origin, DESTINATIONS, maps)`. `src/routes/api/travel-times/+server.ts`
  passes `DESTINATIONS`.
- The server test defines two of its own destinations (one fixed address, one `closestOf` with two
  candidates) and uses them in place of the real config. The route test
  (`src/routes/api/travel-times/travelTimes.test.ts`) only compares ids against `DESTINATIONS`, so
  it already survives config edits. Leave it as is.

## PR 2: Bring the two oldest server modules up to convention (two small PRs)
These predate AGENTS.md: old names, branches that exist only for tests, and "should…" test names.

### 2a. `closestDest.ts` → `closest.ts`
- Merge `computeClosestPoint` (returns null, used only by tests) and `findClosest` (throws) into a
  single `closest(origin, candidates: readonly [T, ...T[]])`. A non-empty tuple type means an
  empty list can't be written, so the throw is no longer needed. Type `closestOf` in
  `destinations.ts` and the arrays in `candidateLocations.ts` to match.
- Rename `CoordinatePoint` → `Coordinates` and use it for the geocode return type. Today
  `gmapsGeocoding.ts` spells it inline twice and `fakeMaps.ts` once.
- Rewrite `closestDest.test.ts` to follow the conventions: points at White Plains scale, no
  "should", and no comment restating the test name.

### 2b. `departureTime.ts` → `weeklyTime.ts`
The module now serves both `arriveBy` and `departAt`, so "departure" is wrong.
- `TargetDate` → `WeeklyTime`, `getNextDateTime` → `nextOccurrence`.
- Drop the `fromDate` parameter and its timezone throw, which exist only for tests. Tests use
  `vi.useFakeTimers`, as `gmapsRouting.test.ts` and `auth.test.ts` already do, in place of
  `vi.spyOn(DateTime, 'now')`.
- Collapse each test's four field assertions into a single `toISO()` equality.

Update the imports in `gmapsRouting.ts`, `destinations.ts` and their tests.

## PR 3: Make the page test survive a restyle (Svelte, optional)
`Success.svelte.test.ts` finds routes with `.space-y-2 > div`, a Tailwind class, so restyling the
page breaks the test.
- Render the cards and routes in `Success.svelte` / `DestinationCard.svelte` as `<ul>`/`<li>`
  (better semantics too, with no visual change once list styles are reset), and query by role.
- `components/travelTimes/utils.ts` → `format.ts`. Replace `DestinationCard`'s nested status
  ternary with a `Record<GoalStatus, string>` of classes.
- Fix the top-level `describe`s in `gmapsRouting.test.ts`, which spell the situation into the
  subject (`'computeRoute for a bike trip'` → `computeRoute` › `for a bike trip`). Move the walk
  test out of the bike group. Turn `addressUtils.test.ts` into a `test.each`.
- Run `svelte-autofixer` on each Svelte file touched, until it reports nothing.

## PR 4: README refresh (small)
- Add `MOCK=1 npm run dev`. AGENTS.md mentions it but the README doesn't.
- One line naming `src/lib/server/destinations.ts` as where destinations and goals live.
- "with `envrc`" → direnv. The arrival-time section covers transit only; drives depart at a time.
  Drop the mechanism ("uses Luxon", the step list); `candidateLocations.ts` already holds the
  rejected alternative.

## PR 5: Pass the Google key in, so the fixture script reuses production's requests (optional, largest)
`scripts/capture-fixtures.ts` duplicates the computeRoutes call and has its own `nextTime`,
because the gmaps modules import `$app/env/private`, which plain Node can't load. That's also why
`routeModes.ts` carries its "no imports" rule.
- `geocode`/`computeRoute` take the key as a parameter. The route builds
  `MOCK ? fakeMaps : googleMaps(requireGmapsToken())`. The gmaps tests drop
  `vi.mock('$app/env/private')`.
- Export the request builders (body plus field mask) and the raw fetch. The script's captures
  become `{ file, origin, dest, trip: Trip }` and use `nextOccurrence`.
- Fold `MODES` back into `gmapsRouting.ts` if nothing else needs it standalone.
- **Risk:** check that `@sveltejs/kit`'s `error` import in `gmapsGeocoding.ts` loads under plain
  Node. If it doesn't, keep that throw at the route boundary.

This is the pattern a second external API (listings) would copy. Without one, the payoff is
modest, so it's fine to skip.

## Deliberately not doing now

- **No `server/google/` folder.** The `gmaps*` prefix already groups those files. Split by
  provider when a second one (listings) arrives.
- **No DB/storage abstraction, result versioning, or moving `goalStatus` to shared code.** It
  would be speculative until the history view exists.
- **Import-extension consistency** (`.ts` / `.js` / bare): cosmetic, not worth a PR.

## Notes for the possible features (not work items)

- **Listings APIs:** to my knowledge, Zillow's listing data is partner-only (Bridge, for MLS
  partners), StreetEasy has no public API, and StreetEasy barely covers Westchester. Scraping
  breaks their terms. Verify before planning anything. Pasting addresses may stay the practical
  path.
- **History/compare:** start in the browser's `localStorage`, not a server database: no
  dependency, no hosting choice, and private addresses never leave the device. Move to a server
  database only if a second person or device needs the list. Whichever store is used, keep the
  address, `computedAt` and the raw `routes`, then grade on read
  against the current goals, so a goal tweak re-grades history. That's when `goalStatus` moves out
  of `components/`. A URL per result (`/?address=…`) is the natural first step, because the list
  then links to it. Stored addresses are private: keep them out of the repo and behind the
  password, and remember the hook only gates `/api/`, not page loads. If it ever needs a server database, which
  one depends on where `adapter-auto` deploys, which is **Open:**.

## Verification (each PR)

- `npm run lint && npm run check && npm test`. Report any flake by name.
- PRs 1, 3: confirm the tests fail on the old code / pass on the new. For PR 1, changing a goal in
  `destinations.ts` locally should leave the suite green.
- PR 3: `MOCK=1 npm run dev` and eyeball the page to confirm it looks the same.
- PR 5: `npm run check` covers the script's types. Capturing bills the key, so run at most a
  single capture (`direnv exec . node scripts/capture-fixtures.ts walk`), only with Eric's OK, and
  say that it ran. The re-captured `walk.json` should come back unchanged apart from Google's own
  drift.
- Before each commit: read `git status` and the diff for secrets, home paths and private
  addresses.
