# Multimodal prefactor

## Context

The app works, but it is shaped around one fixed set of NYC destinations. Moving the plan to White
Plains means driving to some places, walking to others, and biking or taking a bus to the rest.
This plan prepares the code for that without adding it: no PR here adds a mode or changes the NYC
page, apart from the fixes each PR names.

What makes that change expensive today:

- **A destination lives in six places**: `destinations.ts`, `types.ts`, `mockData.ts`, the API
  route, a `places/*.svelte` component and `Success.svelte`. Its goal lives on the client and its
  address on the server. Adding seven destinations in #44 touched 12 files and added 262 lines.
- **Each mode has its own path**: `computeActiveTransportRoute` and `computeTransitRoute`, two
  route types, and `walkRoute`, `bikeRoute` and `transitRoute`. Drive would be a third of each.
- **The API route has no test.** `Success.svelte.test.ts` pins every card's text and status, and
  the Google layer has parser and request tests, but nothing covers the route that joins them.

White Plains also breaks two assumptions that NYC never tested:

- **"No route" is normal there.** A transit request with no result throws in `parseTransitRoute`,
  which fails the whole page rather than one card.
- **Trains may be labelled as walking.** `parseTransitRoute` reads only `nameShort`, and an empty
  summary means "walking". If Metro-North lines have only a `name`, a train trip would show as
  "🚇 40 minutes by walking". The proto describes `nameShort` as "normally a line number". This is
  unverified, and so is the shape of a no-route response: Google's docs state neither, so PR 3
  starts by capturing real responses.

Facts from Google's docs and the SDK's protos that shape the design:

- `routingPreference` is valid only for `DRIVE` and `TWO_WHEELER`; on other modes the request
  fails. A drive `departureTime` applies only with `TRAFFIC_AWARE`, which bills at a higher rate.
  So requests need per-mode fields, not one shared body.
- `allowedTravelModes: ['BUS']` is a preference, not a strict filter, and bus is still a `TRANSIT`
  request. Bus is a transit option, not a fifth mode.

## Decisions

**Modes vary per destination; a single trip does not chain modes.** This follows "drive to some
places, walk to others". Each destination lists its trips, and each trip yields one route.
*Rejected for now: bike-to-train chains, because Google cannot route them in one request. If you
want one later, it can be two trips added together.*

**One list of destinations, owned by the server.** The API returns everything a card needs, so the
client has no per-destination code. Adding a destination becomes one entry in one file.

```ts
// src/lib/server/destinations.ts
type Trip = { mode: 'walk' | 'bike' } | { mode: 'transit'; departure: TargetDate };

interface Destination {
  id: string;
  title: string;
  goal: { strictness: 'must' | 'should'; idealMinutes: number; maxMinutes: number };
  place: { address: string } | { closestOf: readonly Candidate[] };
  trips: readonly Trip[]; // Display order.
}
```

**One `Route` union keyed by mode**, shared by server and client. Adding drive adds a member and a
table row, not a parallel code path.

```ts
export type Route =
  | { mode: 'walk' | 'bike'; timeMinutes: number; distanceMiles: number }
  | { mode: 'transit'; timeMinutes: number; summary: string | null }; // null: all walking
```

**One seam to Google**: `Maps = { geocode, computeRoute }`, passed into `computeTravelTimes`. Tests
and `MOCK=1` share a fake, so mock mode covers new destinations for free and `mockData.ts` goes
away.

**Google is called with `fetch`, not its SDKs.** Per-mode request bodies are plain objects, and each
response goes through a pure parser. The REST JSON omits zero values and empty lists, which the SDK
used to fill in, so the parsers must treat a missing `distanceMeters` or `steps` as empty, not as an
error.

**White Plains replaces NYC.** There is no region switch, and git keeps the NYC version.

**Tooling copies `anki-hebrew-card-creation`.** The app is on SvelteKit 3, so new code imports
`#lib/….ts` with the extension and returns `Response.json()`. There is one Vitest config, and a
component test opts into jsdom with a `@vitest-environment jsdom` comment. `tsconfig.json` takes
anki's strict flags except `erasableSyntaxOnly`, because `DayOfWeek` is an enum.

**Env vars live in `src/env.ts`** and are read from `$app/env/private`. `GOOGLE_MAPS_TOKEN` is
optional there so `MOCK=1` runs without it; `requireGmapsToken` in `gmapsToken.ts` throws where
Google is actually called. Tests mock `$app/env/private`.

**`Success.svelte.test.ts` is the safety net for the rest.** It renders the mock data (with two
cards overridden to be `partial` and `unmet`) and asserts each card's title, goal, route lines and
`data-status`. PRs 1 to 3 may change the test's input, but must not change the expected output.

Left alone on purpose:

- **`closestDest.ts`**: tested and fine. Haversine remains only a pre-filter.
- **Shared `Button` and `TextInput`**: the classes appear in only two components.
- **Zod and remote functions**: `foodservice-insights` rejected remote functions for now, and a
  typed parser with explicit checks is enough here.

## PR 1: One route type

- `Route` replaces `ActiveTransportRoute` and `TransitRoute`.
- `computeRoute(trip)` replaces both compute functions, driven by a per-mode table of Google travel
  mode, field mask and buffer minutes. The bike buffer moves into that table.
  `parseActiveTransportRoute` and `parseTransitRoute` stay the pure step underneath, returning
  `Route`.
- `formatRoute(route, place?)` replaces the three formatters, with byte-identical output.
- The `TravelTimes` keys stay for now, so `places/*` get one-line edits.

## PR 2: Destinations as data

The payoff PR.

- `DESTINATIONS` in `src/lib/server/destinations.ts`, in today's card order, with the origin suffix
  moved out of the API route.
- `computeTravelTimes(originAddr, maps)` in a new `src/lib/server/travelTimes.ts`. It uses
  `Promise.all`, replacing today's 13 sequential Google calls.
- The API route shrinks to validating the parameter and choosing real or fake `Maps` by `MOCK`.
- `src/lib/server/fakeMaps.ts` replaces `mockData.ts`.
- `DestinationResult[]` replaces the `TravelTimes` interface. `Success.svelte` becomes an `{#each}`,
  and `DestinationCard` works out its own text and status.
- Add `goalText(goal, routes)`, which keeps today's wording: "a 15-minute walk" for walk-only
  destinations, "40 minutes" otherwise.
- Stop keying `{#each routes}` on the rendered text, which throws if two routes render the same.
- Delete `src/lib/components/travelTimes/places/` (11 files).
- Add tests for `computeTravelTimes` against the fake and for the route handler.

## PR 3: Handle sparse transit

Capture real responses first: White Plains to Grand Central, a Bee-Line bus trip, and a trip with
no route. Those settle the two unknowns in Context and may change this section.

- Add an unavailable `Route` member and render it on the card. `goalStatus` ignores it, and a
  destination with no routes at all is `unmet`.
- Detect transit from `transitDetails`, not from a name being present. Request `transitLine.name`
  and use `nameShort ?? name`.
- In `parseGeocodeResponse`, `ZERO_RESULTS` becomes a 400 with a readable message, and several
  results take the first. Today both end in a 500.

## After this plan

The feature work, for scale. It is not part of this plan.

- **Drive**: add `'drive'` to the distance member of `Route`, add a table row, and send
  `routingPreference: 'TRAFFIC_AWARE'` with a `departure`, plus a parking buffer.
- **Bus**: an optional `allowedTravelModes` on transit trips, with the emoji chosen from
  `transitLine.vehicle.type`.
- **White Plains**: replace `DESTINATIONS`, `candidateLocations.ts`, the origin suffix, the page
  title, `Neighborhoods.svelte` and `OtherCriteria.svelte`.

**Open:** the `fetch` rewrite has run against real Google locally, but not in production's runtime.
Before it merges, try one real address on the Vercel preview.

**Open:** the `500 Grand Concourse` address for Mott Haven in `destinations.ts` was meant to be
fixed but the right address was never settled. It disappears with NYC, so fix it only if NYC stays
live for a while.

**Open:** if you also look in nearby towns such as Scarsdale or Harrison, a fixed origin suffix
stops working and the input should take a full address.

**Open:** straight-line "closest" is less reliable where highways and reservoirs separate places.
Decide once there are real suburban results.

## Verification

Every PR: `npm run lint && npm run check && npm test` and `npm run build`, then `MOCK=1 npm run dev`
to check the page by hand or with `/run`. The Playwright MCP server failed to connect in this
session, so browser automation needs it back.

`.nvmrc` pins Node 24, which CI uses.

Beyond that:

- **PR 2**: run one real NYC address on `main` and on the branch, and compare the cards.
- **PR 3**: real White Plains addresses, including a destination with no transit route.
- **PRs 1 to 3**: the expected table in `Success.svelte.test.ts` stays untouched.

PRs 2 and 3 make real Google calls with your key, about 15 requests per address.
