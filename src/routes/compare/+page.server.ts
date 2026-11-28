import { error } from '@sveltejs/kit';
import { type ApartmentView, getApartment, listApartmentChoices } from '#lib/server/apartments.ts';
import { getDatabase } from '#lib/server/database.ts';
import { DESTINATIONS } from '#lib/server/destinations.ts';
import { pairDestinations } from '#lib/server/sideBySide.ts';
import { type ComparedApartment, type Pair, pairMap } from '#lib/sideBySide.ts';
import { parseApartmentId } from '../../params';
import type { PageServerLoad } from './$types';

type Db = Awaited<ReturnType<typeof getDatabase>>;

// `null` for a side not chosen yet. An unknown id is a 404, as on the apartment's own page.
async function loadSide(db: Db, param: string | null): Promise<ApartmentView | null> {
  if (!param) return null;
  const id = parseApartmentId(param);
  const view = id && (await getApartment(db, id));
  if (!view) error(404, 'No saved apartment has that link.');
  return view;
}

// Only what the view shows, so an agent's contact and the notes stay on the apartment's page.
function toCompared(view: ApartmentView | null): ComparedApartment | null {
  if (!view) return null;
  const { unit, rent, nextStep, listingUrl } = view.details;
  return {
    id: view.id,
    address: view.address,
    status: view.status,
    unit,
    rent,
    nextStep,
    listingUrl,
  };
}

// Reads only stored snapshots, so opening a shared link never calls Google.
export const load: PageServerLoad = async ({ url }) => {
  const db = await getDatabase();
  const views: Pair<ApartmentView | null> = [
    await loadSide(db, url.searchParams.get('a')),
    await loadSide(db, url.searchParams.get('b')),
  ];
  return {
    choices: await listApartmentChoices(db),
    apartments: pairMap(views, toCompared),
    destinations: pairDestinations(
      DESTINATIONS,
      pairMap(views, (view) => view?.results ?? []),
    ),
  };
};
