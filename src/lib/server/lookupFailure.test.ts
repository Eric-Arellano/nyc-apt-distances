import { error, isValidationError } from '@sveltejs/kit';
import { describe, expect, test } from 'vitest';
import { orLookupIssue } from './lookupFailure';

async function failingWith(status: number, message: string): Promise<never> {
  error(status, message);
}

/** The issues `work` failed with, or what else it threw. */
async function issuesOf(work: Promise<unknown>) {
  try {
    await orLookupIssue(work);
  } catch (thrown) {
    return isValidationError(thrown) ? thrown.issues : thrown;
  }
  throw new Error('Expected the work to fail');
}

describe('orLookupIssue', () => {
  test("returns the work's value", async () => {
    expect(await orLookupIssue(Promise.resolve(1))).toBe(1);
  });

  describe('when Google rejects the address', () => {
    test("shows geocoding's message", async () => {
      expect(await issuesOf(failingWith(400, 'Google could not find that address.'))).toEqual([
        { message: 'Google could not find that address.' },
      ]);
    });
  });

  describe('when the work fails otherwise', () => {
    test('asks to try again', async () => {
      expect(await issuesOf(Promise.reject(new Error('Google answered 403')))).toEqual([
        { message: 'Couldn’t compute travel times. Try again in a minute.' },
      ]);
    });
  });

  describe('when the work throws another HTTP error', () => {
    test('rethrows it, for the error page', async () => {
      expect(await issuesOf(failingWith(404, 'No saved apartment has that link.'))).toEqual({
        status: 404,
        body: { message: 'No saved apartment has that link.', status: 404 },
      });
    });
  });
});
