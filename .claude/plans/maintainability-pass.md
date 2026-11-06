# Maintainability pass after the White Plains move

## Context

The NYC → White Plains rewrite is done and the UX is settled. Eric asked for one more pass on
health (organization, tests, docs, names), weighted toward what makes the likely next changes
easy: **tweaking goals** (config), maybe **pre-populating addresses from a listings API**, and
maybe **a database of past results with a list/compare view**. Making it perfect is not the goal,
and stopping soon is a real option.

**Overall assessment:** the codebase is in good shape. Google sits behind the `Maps` seam
(`src/lib/server/travelTimes.ts`), `Route` is a proper union, fixtures are real, and AGENTS.md is
thorough. What's left is one optional PR, and it's fine to stop here.

The auth hook in `src/hooks.server.ts` now exempts exactly `/api/login`, and gates only `/api/`.
A page that loads stored addresses must call `hasSession` itself; the hook's comment says so.
`computeTravelTimes(origin, destinations, maps)` takes the destinations as an argument, so its
tests use their own and a goal edit in `destinations.ts` stays config-only. Picking the closest
candidate is `closest(origin, candidates)` in `closest.ts`, over the non-empty `Candidates` tuple
that `candidateLocations.ts` defines, and geocoding returns its `Coordinates`. A trip's
`arriveBy` / `departAt` is a `WeeklyTime`, resolved by `nextOccurrence` in `weeklyTime.ts`.

## PR 1: Pass the Google key in, so the fixture script reuses production's requests (optional, largest)
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
- PR 1: `npm run check` covers the script's types. Capturing bills the key, so run at most a
  single capture (`direnv exec . node scripts/capture-fixtures.ts walk`), only with Eric's OK, and
  say that it ran. The re-captured `walk.json` should come back unchanged apart from Google's own
  drift.
- Before each commit: read `git status` and the diff for secrets, home paths and private
  addresses.
