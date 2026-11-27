// @vitest-environment jsdom

import { render, screen } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';
import type { RemoteFormField } from '$app/server';
import AddressInput from './AddressInput.svelte';

/** A stand-in for a remote form's text field, holding `value`. */
function textField(name: string, value: string) {
  return {
    as: (type: string) => ({ name, type, value }),
    value: () => value,
  } as unknown as RemoteFormField<string>;
}

function fields(address: string, unit = '') {
  return { field: textField('address', address), unit: textField('unit', unit) };
}

describe('AddressInput', () => {
  test("renders the field's attributes", () => {
    render(AddressInput, { ...fields('1 Main St', '4B'), busy: false });

    const address = screen.getByRole('textbox', { name: 'Street address and town' });
    expect(address).toHaveProperty('value', '1 Main St');
    expect(address).toHaveProperty('name', 'address');
    const unit = screen.getByRole('textbox', { name: 'Unit, if any' });
    expect(unit).toHaveProperty('value', '4B');
    expect(unit).toHaveProperty('name', 'unit');
    expect(screen.getByRole('button', { name: 'Add apartment' })).toHaveProperty('disabled', false);
  });

  test('refuses to submit during a save', () => {
    render(AddressInput, { ...fields('1 Main St'), busy: true });

    expect(screen.getByRole('button', { name: 'Calculating…' })).toHaveProperty('disabled', true);
  });

  test('refuses to submit something that is not a street address', () => {
    render(AddressInput, { ...fields(''), busy: false });

    expect(screen.getByRole('button', { name: 'Add apartment' })).toHaveProperty('disabled', true);
  });
});
