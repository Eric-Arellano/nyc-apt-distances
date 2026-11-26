import { error } from '@sveltejs/kit';
import { getApartment } from '#lib/server/apartments.ts';
import { getDatabase } from '#lib/server/database.ts';
import type { PageServerLoad } from './$types';

// Reads only the stored snapshot, so opening a shared link never calls Google.
export const load: PageServerLoad = async ({ params }) => {
  const apartment = await getApartment(await getDatabase(), params.id);
  if (!apartment) error(404, 'No saved apartment has that link.');
  return apartment;
};
