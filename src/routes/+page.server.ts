import { listApartments } from '#lib/server/apartments.ts';
import { TABLE_GROUPS } from '#lib/server/comparisonTable.ts';
import { getDatabase } from '#lib/server/database.ts';
import type { PageServerLoad } from './$types';

// The columns come from here, so the browser never imports `DESTINATIONS`.
export const load: PageServerLoad = async () => ({
  apartments: await listApartments(await getDatabase()),
  groups: TABLE_GROUPS,
});
