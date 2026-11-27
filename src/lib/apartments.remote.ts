import { redirect } from '@sveltejs/kit';
import * as v from 'valibot';
import { ApartmentDetailsSchema } from '#lib/apartmentDetails.ts';
import { isValidAddress } from '#lib/components/address/addressUtils.ts';
import {
  deleteApartment,
  recomputeApartment,
  saveApartment,
  setApartmentStatus,
  updateApartmentDetails,
} from '#lib/server/apartments.ts';
import { getDatabase } from '#lib/server/database.ts';
import type { ApartmentId } from '#lib/server/db/schema/public/Apartment.ts';
import { getMaps } from '#lib/server/getMaps.ts';
import { showBadRequestInForm } from '#lib/server/showBadRequestInForm.ts';
import { STATUSES } from '#lib/status.ts';
import { UnitSchema } from '#lib/unit.ts';
import { resolve } from '$app/paths';
import { form } from '$app/server';
import { parseApartmentId } from '../params';

const NewApartment = v.object({
  address: v.pipe(
    v.string(),
    v.trim(),
    v.check(isValidAddress, 'Enter a street address, starting with its number.'),
  ),
  unit: v.optional(UnitSchema, ''),
  // Sent only by the "Save as a separate apartment" button.
  duplicate: v.optional(v.picklist(['allow'])),
});

// Every lookup is saved, so a link to its result never spends the Google key again.
export const addApartment = form(NewApartment, async ({ address, unit, duplicate }) => {
  const db = await getDatabase();
  const outcome = await showBadRequestInForm(
    saveApartment(db, getMaps(), { address, unit, allowDuplicate: duplicate === 'allow' }),
  );
  // `address` and `unit` say which submission the warning answers, so the page can drop it once
  // either is edited.
  if (outcome.kind === 'duplicate') return { address, unit, duplicate: outcome.existing };
  redirect(303, resolve('/apartments/[id=apartmentId]', { id: outcome.id }));
});

const SavedApartment = v.object({
  // A hidden field, since a `form` call's `params` come from a header the client sets anyway.
  id: v.pipe(
    v.string(),
    v.transform(parseApartmentId),
    v.custom<ApartmentId>((id) => id !== undefined),
  ),
});

export const recomputeTravelTimes = form(SavedApartment, async ({ id }) => {
  const db = await getDatabase();
  await showBadRequestInForm(recomputeApartment(db, getMaps(), id));
});

export const saveDetails = form(
  // `original` is what the form opened with, in hidden fields, so only what changed is written.
  v.object({
    ...SavedApartment.entries,
    edited: ApartmentDetailsSchema,
    original: ApartmentDetailsSchema,
  }),
  async ({ id, ...edit }) => {
    await updateApartmentDetails(await getDatabase(), id, edit);
  },
);

export const changeStatus = form(
  v.object({ ...SavedApartment.entries, status: v.picklist(STATUSES) }),
  async ({ id, status }) => {
    await setApartmentStatus(await getDatabase(), id, status);
  },
);

export const removeApartment = form(SavedApartment, async ({ id }) => {
  await deleteApartment(await getDatabase(), id);
  redirect(303, resolve('/'));
});
