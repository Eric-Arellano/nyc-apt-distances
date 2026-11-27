import { type Kysely, sql } from 'kysely';

// Everything but status may be empty, since every lookup saves and most are never followed up.
export async function up(db: Kysely<unknown>): Promise<void> {
  // An enum sorts in the order declared, so listing apartments by status follows the process.
  await db.schema
    .createType('apartment_status')
    .asEnum(['interested', 'reached_out', 'visited', 'applied', 'signed', 'not_for_us'])
    .execute();

  await db.schema
    .alterTable('apartment')
    .addColumn('status', sql`apartment_status`, (col) => col.notNull().defaultTo('interested'))
    .addColumn('rent', 'integer', (col) => col.check(sql`rent > 0`))
    .addColumn('listing_url', 'text')
    .addColumn('next_step', 'text')
    .addColumn('agent_contact', 'text')
    .addColumn('notes', 'text')
    .execute();

  await sql`comment on column apartment.rent is 'Monthly rent in whole dollars.'`.execute(db);
  await sql`
    comment on column apartment.listing_url is
      'Always http or https, checked on save, since the page renders it as a link.'
  `.execute(db);
}
