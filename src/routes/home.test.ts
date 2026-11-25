import { fail, isRedirect } from '@sveltejs/kit';
import type { Kysely } from 'kysely';
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import type Database from '#lib/server/db/schema/Database.ts';
import { createTestDatabase } from '#tests/db.ts';
import bike from '#tests/fixtures/google/bike.json';
import drive from '#tests/fixtures/google/drive.json';
import geocode from '#tests/fixtures/google/geocode.json';
import geocodeZeroResults from '#tests/fixtures/google/geocode-zero-results.json';
import transit from '#tests/fixtures/google/transit-transfer.json';
import walk from '#tests/fixtures/google/walk.json';
import { actions } from './+page.server';

const env = vi.hoisted(() => ({ MOCK: false, GOOGLE_MAPS_TOKEN: 'test-key' }));
vi.mock('$app/env/private', () => env);

const database = vi.hoisted(() => ({ db: undefined as Kysely<Database> | undefined }));
vi.mock('#lib/server/database.ts', () => ({ getDatabase: async () => database.db }));

const ROUTE_FIXTURES: Record<string, unknown> = {
  WALK: walk,
  BICYCLE: bike,
  TRANSIT: transit,
  DRIVE: drive,
};

async function fakeGoogle(url: URL | string, init?: RequestInit) {
  if (String(url).includes('geocode')) return Response.json(geocode);
  const { travelMode } = JSON.parse(String(init?.body));
  return Response.json(ROUTE_FIXTURES[travelMode]);
}

const fetchMock = vi.fn(fakeGoogle);

beforeAll(async () => {
  database.db = await createTestDatabase();
});

afterAll(async () => {
  await database.db?.destroy();
});

beforeEach(async () => {
  await database.db?.deleteFrom('apartment').execute();
  // Back to `fakeGoogle`, undoing any test's `mockImplementation`.
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  // Under Vitest, `svelteTesting()` resolves SvelteKit's browser build, whose `redirect` reads the
  // origin from `window` rather than from the request.
  vi.stubGlobal('window', { location: { origin: 'https://example.com' } });
});

async function submit(fields: Record<string, string>) {
  const body = new FormData();
  for (const [name, value] of Object.entries(fields)) body.set(name, value);
  const request = new Request('https://example.com/', { method: 'POST', body });
  try {
    return await actions.default({ request } as Parameters<typeof actions.default>[0]);
  } catch (thrown) {
    if (!isRedirect(thrown)) throw thrown;
    return { redirect: thrown.location };
  }
}

const APARTMENT_PATH = expect.stringMatching(/^\/apartments\/\d+$/);

describe('actions.default', () => {
  test.each([
    ['missing', {}],
    ['not a street address', { address: 'White Plains' }],
  ] as [string, { address?: string }][])(
    'refuses an address that is %s without calling Google',
    async (_, fields) => {
      expect(await submit(fields)).toEqual(
        fail(400, {
          address: fields.address ?? '',
          message: 'Enter a street address, starting with its number.',
        }),
      );
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  describe('with MOCK off', () => {
    beforeEach(() => {
      env.MOCK = false;
    });

    test('saves what Google answers and opens it', async () => {
      expect(await submit({ address: '100 Martine Ave' })).toEqual({ redirect: APARTMENT_PATH });
      expect(fetchMock).toHaveBeenCalled();
    });

    test('keeps the address and shows why when Google cannot find it', async () => {
      fetchMock.mockImplementationOnce(async () => Response.json(geocodeZeroResults));

      expect(await submit({ address: '1 Nowhere Ln' })).toEqual(
        fail(400, { address: '1 Nowhere Ln', message: 'Google could not find that address.' }),
      );
    });

    test('keeps the address when Google refuses the request', async () => {
      fetchMock.mockImplementation(async () => new Response(null, { status: 403 }));

      expect(await submit({ address: '100 Martine Ave' })).toEqual(
        fail(502, {
          address: '100 Martine Ave',
          message: 'Couldn’t compute travel times. Try again in a minute.',
        }),
      );
    });
  });

  describe('with MOCK on', () => {
    beforeEach(() => {
      env.MOCK = true;
    });

    test('saves without calling Google', async () => {
      expect(await submit({ address: '1 Main St' })).toEqual({ redirect: APARTMENT_PATH });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    describe('for a place already saved', () => {
      test('names the saved apartment instead of saving', async () => {
        const saved = await submit({ address: '1 Main St' });

        expect(await submit({ address: '1 Main St' })).toEqual(
          fail(409, {
            address: '1 Main St',
            duplicate: {
              id: expect.any(Number),
              address: '1 Main St',
              createdAt: expect.any(Date),
            },
          }),
        );
        expect(saved).toEqual({ redirect: APARTMENT_PATH });
      });

      test('saves another apartment when asked to', async () => {
        const first = await submit({ address: '1 Main St' });

        const second = await submit({ address: '1 Main St', allowDuplicate: '' });

        expect(second).toEqual({ redirect: APARTMENT_PATH });
        expect(second).not.toEqual(first);
      });
    });
  });
});
