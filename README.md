# apt-distances

Compute with Google Maps the distance of an apartment to places I care about, such as work.

This project is both to help me move and to learn Svelte.

## How to run

### Pre-requisites

First, define the following env vars, such as with `envrc`:

- `GOOGLE_MAPS_TOKEN`: a Google Cloud API key with the new Routes API and the Geocoding API enabled
- `SITE_PASSWORD`: whatever you want the site password to be

Then, run `npm install`

### Commands

- `npm run dev`
- `npm run format`
- `npm run test`
- `npm run check`
- `npm run lint`
- `node scripts/capture-fixtures.ts`: re-captures the Google responses in `tests/fixtures/google`,
  which bills your key

## Interesting parts of this project

### Computing the nearest place

Several destinations have multiple candidates, such as several parks around White Plains. I only care about being close enough to one of the candidates. It would be inefficient to compute the distances between every single candidate, so instead I pre-compute the closest candidate as follows:

1. Hardcode all the candidate locations and their latitude and longitude.
2. Use the Google Maps Geocoding API to get the latitude and longitude for the apartment address.
3. Use the Haversine formula to compute which candidate location is closest.
4. Use the Google Maps Routes API to compute the travel times.

### Consistent arrival time

For transit, the route time depends on when you travel. For example, transit is much better during rush hour, and buses thin out on weekends. So, I need a consistent time regardless of when the app is running. Each transit trip names when it must arrive, such as "Saturday by 9:30 AM", because that is what matters for getting to a service on time.

This app will compute the next target day of the week by comparing it to the present day when the request is made. This works because Google Maps lets you use a date up to 100 days in the future.

The calculation uses Luxon for timezone handling to allow the program to input times in New York's time zone, regardless of where the server runs.
