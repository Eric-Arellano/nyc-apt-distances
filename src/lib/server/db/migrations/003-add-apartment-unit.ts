import { type Kysely, sql } from 'kysely';

// Empty for most apartments, since a lookup is usually typed without a unit.
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable('apartment').addColumn('unit', 'text').execute();

  await sql`
    comment on column apartment.unit is
      'Such as "4B", without a word like "Unit" or "Apt", which the page adds.'
  `.execute(db);
}
