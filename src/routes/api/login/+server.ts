import type { RequestHandler } from '@sveltejs/kit';

import { login } from '#lib/server/auth.ts';

export const POST: RequestHandler = async ({ request }) => {
  let data: Record<string, unknown>;
  try {
    data = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  if (!data.password || typeof data.password !== 'string') {
    return Response.json({ error: 'Password must be a non-empty string' }, { status: 400 });
  }

  const result = login(data.password);
  if (!result.success) {
    return Response.json({ error: 'Invalid password' }, { status: 401 });
  }
  return Response.json({ token: result.token });
};
