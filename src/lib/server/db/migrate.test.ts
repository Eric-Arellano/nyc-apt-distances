import { type Kysely, sql } from 'kysely';
import { afterEach, describe, expect, test } from 'vitest';
import { createDatabase } from './createDatabase.ts';
import { migrateToLatest } from './migrate.ts';
import { MIGRATIONS } from './migrations/index.ts';
import type Database from './schema/Database.ts';

let db: Kysely<Database>;

afterEach(async () => {
  await db.destroy();
});

async function tableNames(): Promise<string[]> {
  const { rows } = await sql<{ tablename: string }>`
    select tablename from pg_tables where schemaname = 'public' order by tablename
  `.execute(db);
  return rows.map((row) => row.tablename);
}

describe('migrateToLatest', () => {
  test('runs every migration on an empty database', async () => {
    db = createDatabase({ kind: 'pglite' });
    expect(await migrateToLatest(db)).toEqual(Object.keys(MIGRATIONS));
  });

  test('runs nothing once the database is current', async () => {
    db = createDatabase({ kind: 'pglite' });
    await migrateToLatest(db);
    expect(await migrateToLatest(db)).toEqual([]);
  });

  describe('when a migration fails', () => {
    const migrations = {
      '001-ok': {
        up: async (db: Kysely<unknown>) => {
          await db.schema.createTable('ok').addColumn('id', 'integer').execute();
        },
      },
      '002-broken': {
        up: async (db: Kysely<unknown>) => {
          await sql`select * from missing_table`.execute(db);
        },
      },
    };

    test('throws, naming the migration', async () => {
      db = createDatabase({ kind: 'pglite' });
      await expect(migrateToLatest(db, migrations)).rejects.toThrow('Migration 002-broken failed');
    });

    test('rolls back the migrations that ran before it', async () => {
      db = createDatabase({ kind: 'pglite' });
      await migrateToLatest(db, migrations).catch(() => {});
      expect(await tableNames()).toEqual(['kysely_migration', 'kysely_migration_lock']);
    });
  });
});
