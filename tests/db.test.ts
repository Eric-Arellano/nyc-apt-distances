import { describe, expect, test } from 'vitest';
import { createTestDatabase } from './db.ts';

describe('createTestDatabase', () => {
  test('applies the migrations', async () => {
    const db = await createTestDatabase();
    const computedAt = new Date('2026-11-23T14:00:00Z');
    const travelTimes = [{ id: 'library', label: 'Library' }];

    const row = await db
      .insertInto('apartment')
      .values({
        address: '100 Martine Ave, White Plains, NY 10601',
        placeId: 'ChIJv6mD9DeUwokRp0fbCIoDwuI',
        travelTimes: JSON.stringify(travelTimes),
        travelTimesComputedAt: computedAt,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    expect(row).toEqual({
      id: 1,
      address: '100 Martine Ave, White Plains, NY 10601',
      travelTimes,
      travelTimesComputedAt: computedAt,
      createdAt: expect.any(Date),
      placeId: 'ChIJv6mD9DeUwokRp0fbCIoDwuI',
      unit: null,
    });
    await db.destroy();
  });

  test('gives each call its own database', async () => {
    const first = await createTestDatabase();
    const second = await createTestDatabase();

    await first
      .insertInto('apartment')
      .values({ address: 'a', placeId: 'a', travelTimes: '[]', travelTimesComputedAt: new Date() })
      .execute();

    expect(await second.selectFrom('apartment').selectAll().execute()).toEqual([]);
    await Promise.all([first.destroy(), second.destroy()]);
  });
});
