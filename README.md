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
- `npm run db:types`: regenerates the database types in `src/lib/server/db/schema` after you add
  a migration to `src/lib/server/db/migrations`
- `node scripts/capture-fixtures.ts`: re-captures the Google responses in `tests/fixtures/google`,
  which bills your key

### The dev database

`npm run dev` keeps its database in `.pglite/`, using [PGlite](https://pglite.dev), so there is no
Postgres server to install. It applies new migrations on first use. To start over, stop the server
and delete `.pglite/`. Each test file gets its own database in memory.

`npm run dev` ignores `DATABASE_URL`, so a production URL from `vercel env pull` can't reach it. Nothing run locally writes to Neon; check Postgres-specific behavior on a PR's preview instead.

### Deploying

The app runs on Vercel with [Neon](https://neon.com) Postgres, through Vercel's Neon integration.
Production uses Neon's main branch, and each preview deployment gets its own Neon branch. Each
deploy runs pending migrations against its own branch before it builds, as set in `vercel.json`.

### Changing destinations and goals

They live in `src/lib/server/destinations.ts`.

### Adding a UI component

Styling is Tailwind plus [shadcn-svelte](https://www.shadcn-svelte.com), whose components are
copied into `src/lib/components/ui/` so we own them. Nothing hand-written goes there. Add one with
the CLI, then run `npm run format`:

```sh
npx shadcn-svelte add <component>
```

The CLI may add dependencies to `package.json`, and theme colors to `src/app.css` in its own
neutral or light palette. Check both diffs before running `npm install`.

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
