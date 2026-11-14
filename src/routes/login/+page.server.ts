import { redirect } from '@sveltejs/kit';
import { hasSession } from '#lib/server/auth.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ cookies }) => {
  if (hasSession(cookies)) redirect(303, '/');
};
