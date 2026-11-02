# Multimodal prefactor

## Context

The app works, but it is shaped around one fixed set of NYC destinations. Moving the plan to White
Plains means driving to some places, walking to others, and biking or taking a bus to the rest.
This plan prepares the code for that without adding it: no PR here adds a mode or changes the NYC
page, apart from the fixes each PR names.

White Plains breaks two assumptions that NYC never tested:

- **"No route" is normal there.** A transit request with no result throws in `parseTransitRoute`,
  which fails the whole page rather than one card.
- **Trains may be labelled as walking.** `parseTransitRoute` reads only `nameShort`, and an empty
  summary means "walking". If Metro-North lines have only a `name`, a train trip would show as
  "🚇 40 minutes by walking". The proto describes `nameShort` as "normally a line number". This is
  unverified, and so is the shape of a no-route response: Google's docs state neither, so PR 1
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

**One list of destinations, owned by the server.** The API returns everything a card needs as a
`DestinationResult[]`, so the client has no per-destination code. Adding a destination is one entry
in `DESTINATIONS` in `src/lib/server/destinations.ts`, whose `Destination` type lists its trips in
display order. `Trip` is exported from `gmapsRouting.ts`.

**One `Route` union keyed by mode**, shared by server and client (`src/lib/types.ts`).
`computeRoute({ origin, dest, trip })` looks the trip's mode up in a table of Google travel mode,
field mask and buffer minutes, and `formatRoute(route, place)` renders it. Adding drive adds a
member and a table row, not a parallel code path.

```ts
export type Route =
  | { mode: 'walk' | 'bike'; timeMinutes: number; distanceMiles: number }
  | { mode: 'transit'; timeMinutes: number; summary: string | null }; // null: all walking
```

**One seam to Google**: `Maps = { geocode, computeRoute }` in `src/lib/server/travelTimes.ts`, passed
into `computeTravelTimes`. Tests and `MOCK=1` share `fakeMaps.ts`, so mock mode covers new
destinations for free. The API route only validates its parameter and chooses real or fake `Maps`.

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

**`Success.svelte.test.ts` is the safety net.** It renders a hand-written `DestinationResult[]` and
asserts each card's title, goal, route lines and `data-status`. PR 1 may change the test's input,
but must not change the expected output.

Left alone on purpose:

- **`closestDest.ts`**: tested and fine. Haversine remains only a pre-filter.
- **Shared `Button` and `TextInput`**: the classes appear in only two components.
- **Zod and remote functions**: `foodservice-insights` rejected remote functions for now, and a
  typed parser with explicit checks is enough here.

## PR 1: Handle sparse transit

Capture real responses first: White Plains to Grand Central, a Bee-Line bus trip, and a trip with
no route. Those settle the two unknowns in Context and may change this section.

- Add an unavailable `Route` member and render it on the card. `goalStatus` ignores it, and a
  destination with no routes at all is `unmet`. `goalText` picks its wording from the routes' modes,
  so it must ignore the new member too, or a walk that comes back unavailable changes the goal text.
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

`npm run lint && npm run check && npm test` and `npm run build`, then `MOCK=1 npm run dev`
to check the page by hand or with `/run`. The Playwright MCP server failed to connect in this
session, so browser automation needs it back.

`.nvmrc` pins Node 24, which CI uses.

Beyond that:

- Real White Plains addresses, including a destination with no transit route. This makes real
  Google calls with your key, about 15 requests per address.
- The expected table in `Success.svelte.test.ts` stays untouched.
