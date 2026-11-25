import { fail, redirect } from '@sveltejs/kit';
import { isValidAddress } from '#lib/components/address/addressUtils.ts';
import { listApartments, saveApartment } from '#lib/server/apartments.ts';
import { getDatabase } from '#lib/server/database.ts';
import { lookupFailure } from '#lib/server/lookupFailure.ts';
import { getMaps } from '#lib/server/maps.ts';
import { resolve } from '$app/paths';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({
  apartments: await listApartments(await getDatabase()),
});

export const actions = {
  // Every lookup is saved, so a link to its result never spends the Google key again.
  default: async ({ request }) => {
    const form = await request.formData();
    const address = String(form.get('address') ?? '').trim();
    if (!isValidAddress(address)) {
      return fail(400, { address, message: 'Enter a street address, starting with its number.' });
    }

    let outcome: Awaited<ReturnType<typeof saveApartment>>;
    try {
      outcome = await saveApartment(await getDatabase(), getMaps(), address, {
        allowDuplicate: form.has('allowDuplicate'),
      });
    } catch (error) {
      return lookupFailure(error, { address });
    }

    if (outcome.kind === 'duplicate') return fail(409, { address, duplicate: outcome.existing });
    redirect(303, resolve('/apartments/[id=apartmentId]', { id: outcome.id }));
  },
} satisfies Actions;
