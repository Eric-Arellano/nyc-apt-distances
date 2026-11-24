import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('apartment')
    .addColumn('id', 'integer', (col) => col.primaryKey().generatedAlwaysAsIdentity())
    .addColumn('address', 'text', (col) => col.notNull())
    .addColumn('travel_times', 'jsonb', (col) => col.notNull())
    .addColumn('travel_times_computed_at', 'timestamptz', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    // A value stringified twice, or the wrong one stringified, is still valid `jsonb`.
    .addCheckConstraint(
      'apartment_travel_times_is_array',
      sql`jsonb_typeof(travel_times) = 'array'`,
    )
    .execute();

  // `npm run db:types` copies these into the generated types as doc comments.
  await sql`
    comment on column apartment.travel_times is
      'A snapshot of the travel times to each destination, one array entry per destination.'
  `.execute(db);
  await sql`
    comment on column apartment.travel_times_computed_at is
      'When the travel times were computed. Destinations live in code, so they may have changed since.'
  `.execute(db);
}
