import { error } from '@sveltejs/kit';
import { getApartment, recomputeApartment } from '#lib/server/apartments.ts';
import { getDatabase } from '#lib/server/database.ts';
import { lookupFailure } from '#lib/server/lookupFailure.ts';
import { getMaps } from '#lib/server/maps.ts';
import type { Actions, PageServerLoad } from './$types';

// Reads only the stored snapshot, so opening a shared link never calls Google.
export const load: PageServerLoad = async ({ params }) => {
  const apartment = await getApartment(await getDatabase(), params.id);
  if (!apartment) error(404, 'No saved apartment has that link.');
  return apartment;
};

export const actions = {
  recompute: async ({ params }) => {
    try {
      await recomputeApartment(await getDatabase(), getMaps(), params.id);
    } catch (thrown) {
      return lookupFailure(thrown, {});
    }
  },
} satisfies Actions;
