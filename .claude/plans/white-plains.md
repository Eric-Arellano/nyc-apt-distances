# White Plains

## Context

The page covers White Plains on foot and by bike: a Metro-North station, the Hebrew Institute, a
park or trail and a grocery store. NYC is gone, with no region switch, and git keeps it. What is
left needs two things NYC never did:

- **Driving**, to Florham Park, NJ, and as one way to reach Bet Am Shalom and the grocery store.
- **Transit that arrives by a time** rather than departing at one: Bet Am Shalom by 6:15 pm Friday
  and 9:30 am Saturday, and CBST in time for its 10 am Saturday service.

Facts from Google's docs and the protos that shape the design:

- `routingPreference` is valid only for `DRIVE` and `TWO_WHEELER`; on other modes the request
  fails. A drive `departureTime` applies only with `TRAFFIC_AWARE`, which bills at a higher rate.
- `arrivalTime` is valid only for `TRANSIT`, and a request may set it or `departureTime`, not both.
  So a drive cannot arrive by a time; it departs at one.

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

**Groceries are one card with a walk and a drive.** The drive meets the goal almost everywhere, so
the card's colour says little. Its walk line is what tells you whether a store is in walking
distance.

**Goals are first guesses**, to be tuned in review.

*Rejected for now: bike-to-train chains, because Google cannot route them in one request. If you
want one later, it can be two trips added together.*

*Rejected: `allowedTravelModes: ['BUS']` on transit trips. It is only a preference, and no
destination needs to force a bus.*

## PR 1: Transit that arrives by a time

- Transit trips take `arriveBy` and send `arrivalTime`. `capture-fixtures.ts` does the same, and
  its transit fixtures are re-captured.
- The README's "Consistent departure time" section covers arrival times too.
- `Success.svelte.test.ts` tests transit routes apart from `EXPECTED_CARDS`, because no
  destination had a transit trip. Fold them into the Bet Am Shalom cards there.
- New destinations:

| id | Title | Place | Trips | Goal |
| --- | --- | --- | --- | --- |
| `bet-am-shalom-friday` | Bet Am Shalom, Friday 6:15 pm | 295 Soundview Ave, White Plains, NY 10606 | walk; transit arriving Fri 18:15 | should, 15 / 25 |
| `bet-am-shalom-saturday` | Bet Am Shalom, Saturday 9:30 am | same | walk; transit arriving Sat 9:30 | should, 15 / 25 |
| `cbst` | Congregation Beit Simchat Torah, Saturday 10 am | 130 W 30th St, New York, NY 10001 | transit arriving Sat 9:50 | should, 75 / 95 |

**Open:** with `arrivalTime`, Google's `duration` probably covers the ride but not the wait between
getting there and the target. A sparse Saturday bus that arrives 40 minutes early would then look
fast. Read the re-captured fixtures, and decide whether the card should show when the trip arrives.

## PR 2: Drive

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

Fixture re-captures in PRs 1 and 2 are billed, at about ten requests each, so say so in the PR.

Before each PR merges, try one real White Plains address and one real West Harrison address.
Check that each closest candidate is plausible, and that an address in another county gets the
400.

**Open:** straight-line "closest" is less reliable where highways and reservoirs separate places.
Decide after those real runs.
