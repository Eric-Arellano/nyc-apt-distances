// @vitest-environment jsdom

import { render, screen } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';
import type { RemoteFormField } from '$app/server';
import AddressInput from './AddressInput.svelte';

/** A stand-in for a remote form's `address` field, holding `value`. */
function addressField(value: string) {
  return {
    as: (type: string) => ({ name: 'address', type, value }),
    value: () => value,
  } as unknown as RemoteFormField<string>;
}

describe('AddressInput', () => {
  test("renders the field's attributes", () => {
    render(AddressInput, { field: addressField('1 Main St'), busy: false });

    const input = screen.getByRole('textbox');
    expect(input).toHaveProperty('value', '1 Main St');
    expect(input).toHaveProperty('name', 'address');
    expect(screen.getByRole('button', { name: 'Add apartment' })).toHaveProperty('disabled', false);
  });

  test('refuses to submit during a save', () => {
    render(AddressInput, { field: addressField('1 Main St'), busy: true });

    expect(screen.getByRole('button', { name: 'Calculating…' })).toHaveProperty('disabled', true);
  });

  test('refuses to submit something that is not a street address', () => {
    render(AddressInput, { field: addressField(''), busy: false });

    expect(screen.getByRole('button', { name: 'Add apartment' })).toHaveProperty('disabled', true);
  });
});
