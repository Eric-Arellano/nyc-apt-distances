import { invalidateAll } from '$app/navigation';

export async function login(password: string): Promise<void> {
  const res = await fetch(`/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
    signal: AbortSignal.timeout(5_000),
  });
  if (!res.ok) {
    throw new Error(
      res.status === 401 ? 'Invalid password' : `Login failed: ${res.status} ${res.statusText}`,
    );
  }

  await invalidateAll();
}
