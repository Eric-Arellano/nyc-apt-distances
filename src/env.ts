import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
  // Optional so `MOCK=1` runs without it; `requireGmapsToken` throws where Google is called.
  GOOGLE_MAPS_TOKEN: { schema: (value) => value || undefined },
  SITE_PASSWORD: {
    schema: (value) => {
      if (!value) throw new Error('SITE_PASSWORD must be set.');
      return value;
    },
  },
  MOCK: { schema: (value) => !!value },
});
