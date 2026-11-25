import { type Kysely, sql } from 'kysely';

// `not null` without a default works only because no release stored an apartment before this.
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('apartment')
    .addColumn('place_id', 'text', (col) => col.notNull())
    .execute();

  await sql`
    comment on column apartment.place_id is
      'Google''s id for the geocoded address. Saving a place that is already saved asks first.'
  `.execute(db);
}
