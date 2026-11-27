import { error, isValidationError } from '@sveltejs/kit';
import { describe, expect, test } from 'vitest';
import { showBadRequestInForm } from './showBadRequestInForm';

async function failingWith(status: number, message: string): Promise<never> {
  error(status, message);
}

/** The issues `work` failed with, or what else it threw. */
async function issuesOf(work: Promise<unknown>) {
  try {
    await showBadRequestInForm(work);
  } catch (thrown) {
    return isValidationError(thrown) ? thrown.issues : thrown;
  }
  throw new Error('Expected the work to fail');
}

describe('showBadRequestInForm', () => {
  test("returns the work's value", async () => {
    expect(await showBadRequestInForm(Promise.resolve(1))).toBe(1);
  });

  describe('when the work throws a 400', () => {
    test('shows its message as an issue', async () => {
      expect(await issuesOf(failingWith(400, 'Google could not find that address.'))).toEqual([
        { message: 'Google could not find that address.' },
      ]);
    });
  });

  describe('when the work fails otherwise', () => {
    test('rethrows another HTTP error, for the error page', async () => {
      expect(await issuesOf(failingWith(404, 'No saved apartment has that link.'))).toEqual({
        status: 404,
        body: { message: 'No saved apartment has that link.', status: 404 },
      });
    });

    test('rethrows an unexpected error, for the error page', async () => {
      const failure = new Error('Geocoding returned 403');

      expect(await issuesOf(Promise.reject(failure))).toBe(failure);
    });
  });
});
