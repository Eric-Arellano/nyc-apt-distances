# apt-distances

Compute with Google Maps the distance of an apartment to places I care about, such as work.

This project is both to help me move and to learn Svelte.

## How to run

### Pre-requisites

First, define the following env vars, such as with [direnv](https://direnv.net) in an `.envrc`:

- `GOOGLE_MAPS_TOKEN`: a Google Cloud API key with the new Routes API and the Geocoding API enabled
- `SITE_PASSWORD`: whatever you want the site password to be

Then, run `npm install`

### Commands

- `npm run dev`
- `MOCK=1 npm run dev`: serves canned travel times without calling Google, so it bills nothing
- `npm run format`
- `npm run test`
- `npm run check`
- `npm run lint`
- `node scripts/capture-fixtures.ts`: re-captures the Google responses in `tests/fixtures/google`,
  which bills your key

### Changing destinations and goals

They live in `src/lib/server/destinations.ts`.

## Interesting parts of this project

### Computing the nearest place

Several destinations have multiple candidates, such as several parks around White Plains. I only
care about being close enough to one of them, so rather than route to every candidate, the app
geocodes the apartment and routes only to the candidate closest in a straight line.

### Consistent travel times

Route times depend on when you travel: transit is much better during rush hour, buses thin out on
weekends, and traffic varies. So each timed trip names a time of the week rather than "now". A
transit trip names when it must arrive, such as "Saturday by 9:30 AM", because that is what matters
for getting to a service on time. A drive names when it departs, because Google takes an arrival
time only for transit. Either way, the app uses the next occurrence of that time, in New
York's time zone.
