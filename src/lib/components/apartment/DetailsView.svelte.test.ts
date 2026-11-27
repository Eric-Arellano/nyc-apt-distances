// @vitest-environment jsdom
import { render, screen } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';
import type { ApartmentDetails } from '#lib/apartmentDetails.ts';
import DetailsView from './DetailsView.svelte';

const NO_DETAILS: ApartmentDetails = {
  unit: null,
  rent: null,
  listingUrl: null,
  nextStep: null,
  agentContact: null,
  notes: null,
};

function terms(container: HTMLElement) {
  return [...container.querySelectorAll('dt')].map((dt) => dt.textContent);
}

describe('DetailsView', () => {
  test('shows only the fields that are filled in', () => {
    const { container } = render(DetailsView, {
      details: { ...NO_DETAILS, unit: '4B', rent: 2850 },
    });

    expect(terms(container)).toEqual(['Rent']);
    expect(screen.getByText('$2,850/month')).toBeTruthy();
  });

  test('links the listing by its site name, opening a new tab', () => {
    render(DetailsView, {
      details: { ...NO_DETAILS, listingUrl: 'https://www.example.com/listing/1' },
    });

    const link = screen.getByRole('link', { name: 'example.com' });
    expect(link.getAttribute('href')).toBe('https://www.example.com/listing/1');
    expect(link.getAttribute('target')).toBe('_blank');
  });

  test("makes the agent's phone and email tappable", () => {
    render(DetailsView, {
      details: { ...NO_DETAILS, agentContact: 'Pat 914-555-0100, pat@example.com' },
    });

    expect(screen.getByRole('link', { name: '914-555-0100' }).getAttribute('href')).toBe(
      'tel:9145550100',
    );
    expect(screen.getByRole('link', { name: 'pat@example.com' }).getAttribute('href')).toBe(
      'mailto:pat@example.com',
    );
  });

  test('keeps the notes exactly as typed around their links', () => {
    const notes = 'Ask the super:\n914-555-0100 (evenings)';

    const { container } = render(DetailsView, { details: { ...NO_DETAILS, notes } });

    expect(container.querySelector('dd')?.textContent).toBe(notes);
  });
});
