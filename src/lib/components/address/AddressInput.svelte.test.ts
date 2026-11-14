// @vitest-environment jsdom
import { render, screen } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';
import AddressInput from './AddressInput.svelte';

function button() {
  return screen.getByRole('button', { name: 'Calculate travel times' });
}

describe('AddressInput', () => {
  test("starts from the URL's address, ready to submit as `?address=`", () => {
    render(AddressInput, { address: '1 Main St', busy: false });

    const input = screen.getByRole('textbox');
    expect(input).toHaveProperty('value', '1 Main St');
    expect(input).toHaveProperty('name', 'address');
    expect(button()).toHaveProperty('disabled', false);
  });

  test('refuses to submit during a lookup', () => {
    render(AddressInput, { address: '1 Main St', busy: true });

    expect(button()).toHaveProperty('disabled', true);
  });

  test('refuses to submit something that is not a street address', () => {
    render(AddressInput, { address: '', busy: false });

    expect(button()).toHaveProperty('disabled', true);
  });
});
