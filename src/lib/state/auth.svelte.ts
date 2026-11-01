import type { AuthState } from '#lib/types.ts';

const authState: AuthState = $state({ isAuthenticated: false, token: null });

export async function login(password: string): Promise<void> {
  const res = await fetch(`/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
    signal: AbortSignal.timeout(5_000),
  });
  if (!res.ok) {
    authState.isAuthenticated = false;
    authState.token = null;
    throw new Error(
      res.status === 401 ? 'Invalid password' : `Login failed: ${res.status} ${res.statusText}`,
    );
  }

  const data = await res.json();
  authState.token = data.token;
  authState.isAuthenticated = true;
}

export default authState;
