# White Plains

## Context

The destinations move from NYC to White Plains, and NYC goes entirely: there is no region switch,
and git keeps the NYC version. The White Plains page needs three things NYC never did:

- **Driving**, to Florham Park, NJ, and as one way to reach Bet Am Shalom and the grocery store.
- **Transit that arrives by a time** rather than departing at one: Bet Am Shalom by 6:15 pm Friday
  and 9:30 am Saturday, and CBST in time for its 10 am Saturday service.
- **Buses that read as buses.** Bee-Line lines are numbers, so "🚇 26 minutes on the 40" looks like
  a subway.

Facts from Google's docs and the protos that shape the design:

- `routingPreference` is valid only for `DRIVE` and `TWO_WHEELER`; on other modes the request
  fails. A drive `departureTime` applies only with `TRAFFIC_AWARE`, which bills at a higher rate.
- `arrivalTime` is valid only for `TRANSIT`, and a request may set it or `departureTime`, not both.
  So a drive cannot arrive by a time; it departs at one.
- A transit step's `transitLine.vehicle.type` names the vehicle. Google's bus types are `BUS`,
  `INTERCITY_BUS` and `TROLLEYBUS`. This is unverified for Bee-Line, so PR 1 checks it on capture.

## Decisions

**Each mode's time lives in its trip type**, so a drive that arrives by a time doesn't typecheck.
Walking and biking don't vary with the hour, so they take no time.

```ts
export type Trip =
  | { mode: 'walk' | 'bike' }
  | { mode: 'transit'; arriveBy: TargetDate }
  | { mode: 'drive'; departAt: TargetDate };
```

**A drive toward an arrival target departs a quarter hour before it.** Inside White Plains the
drive is short enough that the exact minute barely moves Google's traffic estimate.

**One card per target time.** Bet Am Shalom gets a Friday card and a Saturday card, rather than
one card whose two transit lines would need labels. Each card repeats the walk so its status stands
on its own, which costs one extra request.

**Static request fields per mode live in `MODES`** (`src/lib/server/routeModes.ts`), so
`scripts/capture-fixtures.ts` sends what production sends. The drive row carries
`routingPreference`. Time fields need Luxon, which `routeModes.ts` must not import, so
`computeRoute` adds them.

**The input takes a full address, and geocoding rejects a match outside `ORIGIN_COUNTY`** (in
`destinations.ts`) with a 400 that names where Google placed it. Without a suffix, an address
missing its town lands wherever Google guesses. That is the same quiet failure the partial-match
check in `gmapsGeocoding.ts` already guards against. *Rejected: a ", White Plains, NY" suffix,
because a West Harrison street would then resolve to a same-named White Plains street, or not at
all.*

**Bus or train is data on the `Route`, not text.** The transit member trades
`summary: string | null` for `rides: { line: string; vehicle: 'bus' | 'train' }[]`, where an empty
list means all walking. `formatRoute` shows 🚌 when every ride is a bus and 🚆 otherwise, and it
names a bus line "the 40 bus".

**Groceries are one card with a walk and a drive.** The drive meets the goal almost everywhere, so
the card's colour says little. Its walk line is what tells you whether a store is in walking
distance.

**Candidate coordinates come from OpenStreetMap** (Nominatim), so filling `candidateLocations.ts`
needs no billed call. Coordinates only pick the closest candidate, and Google routes to the
`address` string, so the real-address runs in Verification are what confirm each address.

**Goals are first guesses**, to be tuned in review.

*Rejected for now: bike-to-train chains, because Google cannot route them in one request. If you
want one later, it can be two trips added together.*

*Rejected: `allowedTravelModes: ['BUS']` on transit trips. It is only a preference, and no
destination needs to force a bus.*

## PR 1: Name buses as buses (prefactor)

- Add `transitLine.vehicle.type` to the transit field mask and re-run `capture-fixtures.ts`.
  Confirm that `transit-bus.json` reports a bus type before trusting the list in Context.
- Replace `summary` with `rides`, as described in Decisions. `parseTransitRoute` keeps
  `nameShort ?? name` and its " Line"/" Train" trimming.
- NYC's transit lines in `Success.svelte.test.ts` change from 🚇 to 🚆, and that is the only
  expected-output change.

## PR 2: White Plains, on foot and by bike

Replace `DESTINATIONS` and every list in `candidateLocations.ts`, set `ORIGIN_COUNTY` to
`'Westchester County'`, and update the page title, the address placeholder in
`AddressInput.svelte` (to something like "100 Martine Ave, White Plains") and the README's NYC
prose. The route test in `src/routes/api/travel-times/travelTimes.test.ts` mocks `ORIGIN_COUNTY` to
Westchester only because `geocode.json` is in White Plains; drop that mock. This PR adds only
the destinations whose trips all exist already:

| id | Title | Place | Trips | Goal |
| --- | --- | --- | --- | --- |
| `metro-north` | Metro-North station 🚆 | closest station | walk, bike | must, 10 / 20 |
| `hebrew-institute` | Hebrew Institute of White Plains | 20 Greenridge Ave, White Plains, NY 10605 | walk | must, 15 / 25 |
| `park` | Park or trail 🌳 | closest park or trailhead | walk | should, 10 / 20 |
| `grocery` | Grocery store 🛒 | closest supermarket | walk (PR 4 adds drive) | should, 10 / 20 |

Check each candidate before it goes in: is it still open, and is it at that address?

- **Stations:** White Plains, North White Plains, Hartsdale and Scarsdale on the Harlem Line, and
  Harrison on the New Haven Line.
- **Parks and trailheads**, leaving out pocket parks and plazas: the Bronx River Pathway at the
  County Center and at North White Plains, Kensico Dam Plaza, Cranberry Lake Preserve, Saxon Woods
  Park, Silver Lake Preserve, Delfino Park, Gillie Park, Gardella Park and Turnure Park.
- **Supermarkets:** ShopRite (City Place), Stop & Shop (Westchester Ave), Whole Foods (Bloomingdale
  Rd), Wegmans (Corporate Park Dr, West Harrison), ACME (Knollwood Rd), C-Town (S Lexington Ave)
  and Trader Joe's (Hartsdale).

Remove `Candidate.lines` and `Place.additionalInfo`, which only subway stops used. `fakeMaps`
geocodes to a public White Plains point so that `MOCK=1` picks White Plains candidates.
`travelTimes.test.ts` and `Success.svelte.test.ts` switch to White Plains cards and still cover
every status and route shape. Transit has no destination until PR 3, but its own tests still cover
it.

## PR 3: Transit that arrives by a time

- Transit trips take `arriveBy` and send `arrivalTime`. `capture-fixtures.ts` does the same, and
  its transit fixtures are re-captured.
- The README's "Consistent departure time" section covers arrival times too.
- New destinations:

| id | Title | Place | Trips | Goal |
| --- | --- | --- | --- | --- |
| `bet-am-shalom-friday` | Bet Am Shalom, Friday 6:15 pm | 295 Soundview Ave, White Plains, NY 10606 | walk; transit arriving Fri 18:15 | should, 15 / 25 |
| `bet-am-shalom-saturday` | Bet Am Shalom, Saturday 9:30 am | same | walk; transit arriving Sat 9:30 | should, 15 / 25 |
| `cbst` | Congregation Beit Simchat Torah, Saturday 10 am | 130 W 30th St, New York, NY 10001 | transit arriving Sat 9:50 | should, 75 / 95 |

**Open:** with `arrivalTime`, Google's `duration` probably covers the ride but not the wait between
getting there and the target. A sparse Saturday bus that arrives 40 minutes early would then look
fast. Read the re-captured fixtures, and decide whether the card should show when the trip arrives.

## PR 4: Drive

- Add `'drive'` to the distance member of `Route` and to `tripMode` on the unavailable member.
  Add a `MODES` row with `DRIVE`, the distance field mask, `routingPreference: 'TRAFFIC_AWARE'` and
  a 5-minute buffer for parking. `computeRoute` sends `departureTime` from `departAt`.
  `parseActiveTransportRoute` now reads drives too, so rename it `parseDistanceRoute`.
- Add 🚗 lines to `formatRoute` and a drive row to `fakeMaps`. Capture a `drive.json` from White
  Plains station to Florham Park, departing Sunday 11:00.
- Add drive trips to Bet Am Shalom (departing Fri 18:00 and Sat 9:15) and to the grocery store
  (Sun 11:00).
- New destination:

| id | Title | Place | Trips | Goal |
| --- | --- | --- | --- | --- |
| `florham-park` | Florham Park, NJ | Florham Park, NJ 07932, the town rather than an address | drive departing Sun 11:00 | should, 45 / 60 |

Once this lands, an address makes 15 requests: one geocode and 14 routes, four of them at the
traffic-aware rate.

## Verification

For each PR, run `npm run lint && npm run check && npm test` and `npm run build`. Then check the
page with `MOCK=1 npm run dev`, by hand or with `/run`. Run `svelte-autofixer` on each Svelte file
touched until it reports nothing.

Fixture re-captures in PRs 1, 3 and 4 are billed, at about ten requests each, so say so in the PR.

Before PRs 2, 3 and 4 merge, try one real White Plains address and one real West Harrison address.
Check that each closest candidate is plausible, and that an address in another county gets the
400.

**Open:** straight-line "closest" is less reliable where highways and reservoirs separate places.
Decide after those real runs.
