// @vitest-environment jsdom
import { render, screen } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';
import type { ApartmentSummary } from '#lib/server/apartments.ts';
import type { ApartmentId } from '#lib/server/db/schema/public/Apartment.ts';
import type { RemoteFormField } from '$app/server';
import DuplicateWarning from './DuplicateWarning.svelte';

const allowDuplicate = {
  as: (type: string, value: string) => ({ name: 'duplicate', type, value }),
} as unknown as RemoteFormField<'allow'>;

function saved(id: number, unit: string | null): ApartmentSummary {
  return {
    id: id as ApartmentId,
    address: '1 Main St',
    unit,
    createdAt: new Date('2026-11-01T12:00:00Z'),
  };
}

function hint() {
  return document.querySelector('p.text-sm')?.textContent?.trim();
}

describe('DuplicateWarning', () => {
  test('links every apartment that could be this one, by its unit', () => {
    render(DuplicateWarning, {
      existing: [saved(1, null), saved(2, '4B')],
      unit: '4B',
      allowDuplicate,
    });

    const links = screen.getAllByRole('link').map((link) => link.textContent?.trim());
    expect(links).toEqual(['1 Main St', '1 Main St, Unit 4B']);
    expect(screen.getByRole('button', { name: 'Save as a separate apartment' })).toBeTruthy();
  });

  describe('with the same unit saved', () => {
    test('says it is already saved', () => {
      render(DuplicateWarning, { existing: [saved(1, '4B')], unit: '4b', allowDuplicate });

      expect(screen.getByText('Already saved')).toBeTruthy();
      expect(hint()).toBeUndefined();
    });
  });

  describe('without a unit for this one', () => {
    test('asks for its unit', () => {
      render(DuplicateWarning, { existing: [saved(1, '4B')], unit: null, allowDuplicate });

      expect(screen.getByText('Maybe already saved')).toBeTruthy();
      expect(hint()).toBe('If this is another unit, enter it above to tell them apart.');
    });
  });

  describe('without a unit for the saved one', () => {
    test('suggests giving the saved one its unit', () => {
      render(DuplicateWarning, { existing: [saved(1, null)], unit: '4B', allowDuplicate });

      expect(screen.getByText('Maybe already saved')).toBeTruthy();
      expect(hint()).toBe(
        'If one saved without a unit is another apartment, give it its unit on its page.',
      );
    });
  });
});
