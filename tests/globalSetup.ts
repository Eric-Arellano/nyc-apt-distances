// Runs initdb once for the whole run. Booting PGlite from nothing takes seconds on a CI runner,
// which timed out a test that needed two databases; loading this snapshot takes about 100ms.
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    // A `dumpDataDir()` tarball of an empty, unmigrated database. It is passed as a path because
    // Vitest re-sends provided values to the worker for every test file, and the tarball is 40 MB.
    pgliteSnapshotPath: string;
  }
}

export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  const dir = await mkdtemp(join(tmpdir(), 'apt-distances-pglite-'));
  const path = join(dir, 'snapshot.tar');
  const pglite = await PGlite.create();
  const snapshot = await pglite.dumpDataDir('none');
  await pglite.close();
  await writeFile(path, await snapshot.bytes());
  project.provide('pgliteSnapshotPath', path);
  return () => rm(dir, { recursive: true, force: true });
}
