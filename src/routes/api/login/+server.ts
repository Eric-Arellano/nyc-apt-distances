import { json, type RequestHandler } from '@sveltejs/kit';

import { login } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request }) => {
  let data: Record<string, unknown>;
  try {
    data = await request.json();
  } catch {
    return json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  if (!data.password || typeof data.password !== 'string') {
    return json({ error: 'Password must be a non-empty string' }, { status: 400 });
  }

  const result = login(data.password);
  if (!result.success) {
    return json({ error: 'Invalid password' }, { status: 401 });
  }
  return json({ token: result.token });
};
