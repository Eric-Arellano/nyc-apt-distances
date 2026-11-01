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
- **`destinations.ts` is not really typechecked.** Line 1 imports the Svelte component rather than
  the `TravelTimes` interface, which is how `TravelTimes['parkSlope]']` on line 59 passes
  `svelte-check`.
- **Nothing covers the risky parts.** The 16 tests pass, as do lint and typecheck, but no test
  touches the Google layer, the API route or any component.

White Plains also breaks two assumptions that NYC never tested:

- **"No route" is normal there.** A transit request with no result throws at `gmapsRouting.ts:78`,
  which fails the whole page rather than one card.
- **Trains may be labelled as walking.** `gmapsRouting.ts:91` reads only `nameShort`, and an empty
  summary means "walking". If Metro-North lines have only a `name`, a train trip would show as
  "🚇 40 minutes by walking". The proto describes `nameShort` as "normally a line number". This is
  unverified, and so is the shape of a no-route response: Google's docs state neither, so PR 7
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

**Replace both Google SDKs with `fetch`.** They account for 116 of the 132 production packages, for
two REST calls. This matches your "first-party when it is simple to write" rule, removes the
`duration!.seconds as string` casts, and makes per-mode request bodies plain objects.

**White Plains replaces NYC.** There is no region switch, and git keeps the NYC version.

**Tooling comes first and copies `anki-hebrew-card-creation`.** Everything is 18 months old, and
SvelteKit 3 renames `$lib`, so refactoring first would mean writing the new code in idioms that are
about to change. Formatting and linting are already Biome, configured as in anki, so the upgrade
no longer has to work around `eslint.config.js` importing `svelte.config.js`.

Left alone on purpose:

- **`closestDest.ts`**: tested and fine. Haversine remains only a pre-filter.
- **Shared `Button` and `TextInput`**: the classes appear in only two components.
- **Zod and remote functions**: `foodservice-insights` rejected remote functions for now, and a
  typed parser with explicit checks is enough here.

## PR 1: Upgrade to SvelteKit 3

- Bump to the latest 2.x first for its deprecation warnings, as the migration guide recommends,
  then run `npx sv migrate sveltekit-3`.
- Target anki's versions: Node 24 (`.nvmrc`, `engines`), TypeScript 6 (not 7), Vite 8, Vitest 5,
  Svelte 5.57, `@sveltejs/vite-plugin-svelte` 7, the latest `adapter-auto`.
- Replace `tests.yml` with anki's `ci.yml`. CI's Node 20 is below SvelteKit 3's 22.17 minimum.
- Move the adapter and CSP config into `vite.config.ts` and delete `svelte.config.js`.
- `$lib` becomes `#lib/….ts`, `json()` becomes `Response.json()`, and tsconfig extends
  `$app/tsconfig` with anki's strict flags, except `erasableSyntaxOnly`, because `DayOfWeek` is an
  enum.
- Use anki's single Vitest config, where a component test opts into jsdom per file. Delete
  `vitest-setup-client.ts` and `@testing-library/jest-dom`.

## PR 2: Fix small bugs and pin what the page shows

- Fix the `TravelTimes` import and the `'parkSlope]'` typo in `destinations.ts`, plus any type
  errors that surfaces.
- Fix the `500 Grand Concourse` address.
- Zero seconds and milliseconds in `getNextDateTime`. Today the departure keeps the seconds of
  "now", and `gmapsRouting.ts:65` sends a fractional timestamp.
- Move env reads to `src/env.ts` and `$app/env/private`, read at call time as
  `foodservice-insights` does. Today importing a server module without secrets throws, and `MOCK=1`
  still needs a Google token.
- Add `Success.svelte.test.ts`: render the mock data and assert every card's title, goal, route
  lines and status. Add a `data-status` attribute so the test does not pin colour classes.

**That expected table is the safety net for PRs 5 to 7.** They may change the test's input, but
must not change the expected output.

## PR 3: Svelte cleanups

- `Login.svelte` is the one component in legacy mode: move it to `$state` and `async`/`await`.
- Rename `Error.svelte` to `ErrorMessage.svelte`. The import shadows the global, so
  `handleLoginError(error: Error)` is typed as a component. Then remove the `noShadowRestrictedNames`
  override for `Login.svelte` and `TravelTimes.svelte` in `biome.json`.
- Add `lang="ts"` to `Neighborhoods.svelte` and `OtherCriteria.svelte`. Loop over tiers in
  `Neighborhoods.svelte` instead of the two copied lists.
- Drop the `marginBottom` prop for spacing on the parent, `children?.()` on required snippets, and
  the conflicting `font-medium font-semibold` in `Card.svelte`.
- Delete the three `index.ts` barrels.
- Move `AuthState` and `TravelTimesRequest` from `types.ts` into their state modules.

## PR 4: Call Google with `fetch`

Same exported signatures, so the diff stays in `gmapsRouting.ts`, `gmapsGeocoding.ts`, their tests
and `package.json`.

- `POST https://routes.googleapis.com/directions/v2:computeRoutes` with `X-Goog-Api-Key` and
  `X-Goog-FieldMask`. `duration` arrives as `"165s"`, and `departureTime` goes out as RFC 3339.
- `GET` the Geocoding endpoint. The key sits in the query string, so never log that URL.
- Extract pure parsers and test them against real responses for walk, bike and transit, captured
  once into `tests/fixtures/google/` using public addresses only.
- Copy anki's `tests/setup.ts`, which fails any unmocked `fetch`.
- Remove `@googlemaps/routing` and `@googlemaps/google-maps-services-js`, and the
  `noNonNullAssertion` override for `gmapsRouting.ts` in `biome.json`.

## PR 5: One route type

- `Route` replaces `ActiveTransportRoute` and `TransitRoute`.
- `computeRoute(trip)` replaces both compute functions, driven by a per-mode table of Google travel
  mode, field mask and buffer minutes. The bike buffer moves into that table.
- `formatRoute(route, place?)` replaces the three formatters, with byte-identical output.
- The `TravelTimes` keys stay for now, so `places/*` get one-line edits.

## PR 6: Destinations as data

The payoff PR.

- `DESTINATIONS` in `src/lib/server/destinations.ts`, in today's card order, with the origin suffix
  moved out of the API route.
- `computeTravelTimes(originAddr, maps)` in a new `src/lib/server/travelTimes.ts`. It uses
  `Promise.all`, replacing today's 13 sequential Google calls.
- The API route shrinks to validating the parameter and choosing real or fake `Maps`.
- `src/lib/server/fakeMaps.ts` replaces `mockData.ts`.
- `DestinationResult[]` replaces the `TravelTimes` interface. `Success.svelte` becomes an `{#each}`,
  and `DestinationCard` works out its own text and status.
- Add `goalText(goal, routes)`, which keeps today's wording: "a 15-minute walk" for walk-only
  destinations, "40 minutes" otherwise.
- Stop keying `{#each routes}` on the rendered text, which throws if two routes render the same.
- Delete `src/lib/components/travelTimes/places/` (11 files).
- Add tests for `computeTravelTimes` against the fake and for the route handler.

## PR 7: Handle sparse transit

Capture real responses first: White Plains to Grand Central, a Bee-Line bus trip, and a trip with
no route. Those settle the two unknowns in Context and may change this section.

- Add an unavailable `Route` member and render it on the card. `goalStatus` ignores it, and a
  destination with no routes at all is `unmet`.
- Detect transit from `transitDetails`, not from a name being present. Request `transitLine.name`
  and use `nameShort ?? name`.
- In `geocode`, `ZERO_RESULTS` becomes a 400 with a readable message, and several results take the
  first. Today both end in a 500.

## After this plan

The feature work, for scale. It is not part of this plan.

- **Drive**: add `'drive'` to the distance member of `Route`, add a table row, and send
  `routingPreference: 'TRAFFIC_AWARE'` with a `departure`, plus a parking buffer.
- **Bus**: an optional `allowedTravelModes` on transit trips, with the emoji chosen from
  `transitLine.vehicle.type`.
- **White Plains**: replace `DESTINATIONS`, `candidateLocations.ts`, the origin suffix, the page
  title, `Neighborhoods.svelte` and `OtherCriteria.svelte`.

**Open:** if you also look in nearby towns such as Scarsdale or Harrison, a fixed origin suffix
stops working and the input should take a full address.

**Open:** straight-line "closest" is less reliable where highways and reservoirs separate places.
Decide once there are real suburban results.

## Verification

Every PR: `npm run lint && npm run check && npm test` and `npm run build`, then `MOCK=1 npm run dev`
to check the page by hand or with `/run`. The Playwright MCP server failed to connect in this
session, so browser automation needs it back.

Beyond that:

- **PRs 1 and 4**: one real address on the Vercel preview, since both change what runs in
  production and neither is covered by the mock.
- **PR 6**: run one real NYC address on `main` and on the branch, and compare the cards.
- **PR 7**: real White Plains addresses, including a destination with no transit route.
- **PRs 2 to 7**: the expected table from PR 2 stays untouched.

PRs 1, 4, 6 and 7 make real Google calls with your key, about 15 requests per address.
