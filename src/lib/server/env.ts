function requireEnvVar(key: string): string {
  const val = process.env[key];
  if (!val) {
    throw new Error(`${key} must be set as an env var.`);
  }
  return val;
}

export const GMAPS_TOKEN = requireEnvVar('GOOGLE_MAPS_TOKEN');
export const USE_MOCK_DATA = !!process.env.MOCK;
export const SITE_PASSWORD = requireEnvVar('SITE_PASSWORD');
export const JWT_SECRET = requireEnvVar('JWT_SECRET');
