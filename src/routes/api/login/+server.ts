import { json, type RequestHandler } from '@sveltejs/kit';

import { isSitePassword, startSession } from '$lib/server/auth';

export const POST: RequestHandler = async ({ cookies, request }) => {
  let data: Record<string, unknown>;
  try {
    data = await request.json();
  } catch {
    return json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  if (!data.password || typeof data.password !== 'string') {
    return json({ error: 'Password must be a non-empty string' }, { status: 400 });
  }

  if (!isSitePassword(data.password)) {
    return json({ error: 'Invalid password' }, { status: 401 });
  }
  startSession(cookies);
  return new Response(null, { status: 204 });
};
