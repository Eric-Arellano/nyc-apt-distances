import { redirect } from '@sveltejs/kit';
import * as v from 'valibot';
import { isValidAddress } from '#lib/components/address/addressUtils.ts';
import { recomputeApartment, saveApartment } from '#lib/server/apartments.ts';
import { getDatabase } from '#lib/server/database.ts';
import type { ApartmentId } from '#lib/server/db/schema/public/Apartment.ts';
import { getMaps } from '#lib/server/getMaps.ts';
import { showBadRequestInForm } from '#lib/server/showBadRequestInForm.ts';
import { resolve } from '$app/paths';
import { form } from '$app/server';
import { parseApartmentId } from '../params';

const NewApartment = v.object({
  address: v.pipe(
    v.string(),
    v.trim(),
    v.check(isValidAddress, 'Enter a street address, starting with its number.'),
  ),
  // Sent only by the "Save as a separate apartment" button.
  duplicate: v.optional(v.picklist(['allow'])),
});

// Every lookup is saved, so a link to its result never spends the Google key again.
export const addApartment = form(NewApartment, async ({ address, duplicate }) => {
  const db = await getDatabase();
  const outcome = await showBadRequestInForm(
    saveApartment(db, getMaps(), address, { allowDuplicate: duplicate === 'allow' }),
  );
  // `address` says which submission the warning answers, so the page can drop it once edited.
  if (outcome.kind === 'duplicate') return { address, duplicate: outcome.existing };
  redirect(303, resolve('/apartments/[id=apartmentId]', { id: outcome.id }));
});

export const recomputeTravelTimes = form(
  v.object({
    // A hidden field, since a `form` call's `params` come from a header the client sets anyway.
    id: v.pipe(
      v.string(),
      v.transform(parseApartmentId),
      v.custom<ApartmentId>((id) => id !== undefined),
    ),
  }),
  async ({ id }) => {
    const db = await getDatabase();
    await showBadRequestInForm(recomputeApartment(db, getMaps(), id));
  },
);
