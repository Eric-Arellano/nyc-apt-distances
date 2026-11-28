import { defineParams } from '@sveltejs/kit/params';
import { parseApartmentId } from '#lib/apartmentId.ts';

export const params = defineParams({ apartmentId: parseApartmentId });
