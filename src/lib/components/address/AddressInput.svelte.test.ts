// @vitest-environment jsdom
import { render, screen } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';
import AddressInput from './AddressInput.svelte';

describe('AddressInput', () => {
  test('submits its text as `address`', () => {
    render(AddressInput, { value: '1 Main St', busy: false });

    const input = screen.getByRole('textbox');
    expect(input).toHaveProperty('value', '1 Main St');
    expect(input).toHaveProperty('name', 'address');
    expect(screen.getByRole('button', { name: 'Add apartment' })).toHaveProperty('disabled', false);
  });

  test('refuses to submit during a save', () => {
    render(AddressInput, { value: '1 Main St', busy: true });

    expect(screen.getByRole('button', { name: 'Calculating…' })).toHaveProperty('disabled', true);
  });

  test('refuses to submit something that is not a street address', () => {
    render(AddressInput, { value: '', busy: false });

    expect(screen.getByRole('button', { name: 'Add apartment' })).toHaveProperty('disabled', true);
  });
});
