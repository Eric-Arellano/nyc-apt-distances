import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('apartment')
    .addColumn('id', 'integer', (col) => col.primaryKey().generatedAlwaysAsIdentity())
    .addColumn('address', 'text', (col) => col.notNull())
    // The `DestinationResult[]` the travel-times API returned, as of `results_computed_at`.
    .addColumn('results', 'jsonb', (col) => col.notNull())
    .addColumn('results_computed_at', 'timestamptz', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    // A value stringified twice, or the wrong one stringified, is still valid `jsonb`.
    .addCheckConstraint('apartment_results_is_array', sql`jsonb_typeof(results) = 'array'`)
    .execute();
}
