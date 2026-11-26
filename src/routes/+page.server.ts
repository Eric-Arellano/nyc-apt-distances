import { listApartments } from '#lib/server/apartments.ts';
import { getDatabase } from '#lib/server/database.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({
  apartments: await listApartments(await getDatabase()),
});
