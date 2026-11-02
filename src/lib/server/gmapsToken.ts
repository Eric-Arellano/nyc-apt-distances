import { GOOGLE_MAPS_TOKEN } from '$app/env/private';

export function requireGmapsToken(): string {
  if (!GOOGLE_MAPS_TOKEN) {
    throw new Error('GOOGLE_MAPS_TOKEN must be set as an env var.');
  }
  return GOOGLE_MAPS_TOKEN;
}
