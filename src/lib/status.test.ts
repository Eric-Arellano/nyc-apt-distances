import { sql } from 'kysely';
import { describe, expect, test } from 'vitest';
import { createTestDatabase } from '#tests/db.ts';
import { STATUSES } from './status.ts';

describe('STATUSES', () => {
  // The picker lists them in this order, and the database sorts them in its own.
  test('follows the order of the database enum', async () => {
    const db = await createTestDatabase();
    const { rows } = await sql<{ status: string }>`
      select unnest(enum_range(null::apartment_status)) as status
    `.execute(db);
    await db.destroy();

    expect(STATUSES).toEqual(rows.map(({ status }) => status));
  });
});
