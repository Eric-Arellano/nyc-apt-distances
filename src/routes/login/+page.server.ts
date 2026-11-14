import { fail, redirect } from '@sveltejs/kit';
import { returnPath } from '#lib/loginRedirect.ts';
import { hasSession, isSitePassword, startSession } from '#lib/server/auth.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ cookies, url }) => {
  if (hasSession(cookies))
    redirect(303, returnPath(url.searchParams.get('redirectTo'), url.origin));
};

export const actions = {
  default: async ({ cookies, request, url }) => {
    const password = (await request.formData()).get('password');
    if (typeof password !== 'string' || !password) {
      return fail(400, { message: 'Enter the password' });
    }
    if (!isSitePassword(password)) {
      return fail(401, { message: 'Invalid password' });
    }

    startSession(cookies);
    redirect(303, returnPath(url.searchParams.get('redirectTo'), url.origin));
  },
} satisfies Actions;
