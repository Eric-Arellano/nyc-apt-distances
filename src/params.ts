import { defineParams } from '@sveltejs/kit/params';
import type { ApartmentId } from '#lib/server/db/schema/public/Apartment.ts';

// At most nine digits, so every match fits Postgres' `integer` and an overlong id is a 404, not a
// database error. No leading zero, so `String(id)` gives back the same URL.
export function parseApartmentId(param: string): ApartmentId | undefined {
  return /^[1-9]\d{0,8}$/.test(param) ? (Number(param) as ApartmentId) : undefined;
}

export const params = defineParams({ apartmentId: parseApartmentId });
