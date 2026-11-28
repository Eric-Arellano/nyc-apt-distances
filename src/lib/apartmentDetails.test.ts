import * as v from 'valibot';
import { describe, expect, test } from 'vitest';
import {
  type ApartmentDetails,
  ApartmentDetailsSchema,
  changedDetails,
  formatRent,
  parseListingUrl,
  parseRent,
  siteName,
  toDetailsInput,
} from '#lib/apartmentDetails.ts';

const NO_DETAILS: ApartmentDetails = {
  unit: null,
  rent: null,
  listingUrl: null,
  nextStep: null,
  agentContact: null,
  notes: null,
};

describe('parseRent', () => {
  test.each([
    ['2850', 2850],
    ['$2,850', 2850],
    [' 2 850 ', 2850],
    ['', null],
    ['  ', null],
  ])('reads %j as %j', (text, rent) => {
    expect(parseRent(text)).toBe(rent);
  });

  test.each([
    ['cents', '2850.50'],
    ['zero', '0'],
    ['a leading zero', '02850'],
    ['words', 'about 2850'],
    ['more than seven digits', '12345678'],
  ])('rejects %s', (_, text) => {
    expect(parseRent(text)).toBeUndefined();
  });
});

describe('formatRent', () => {
  test('shows whole dollars a month', () => {
    expect(formatRent(2850)).toBe('$2,850/month');
  });
});

describe('parseListingUrl', () => {
  test.each([
    ['https://example.com/listing/1', 'https://example.com/listing/1'],
    ['http://example.com/a?b=c', 'http://example.com/a?b=c'],
    ['  example.com/listing/1 ', 'https://example.com/listing/1'],
    ['', null],
  ])('reads %j as %j', (text, url) => {
    expect(parseListingUrl(text)).toBe(url);
  });

  test.each([
    ['a script', 'javascript:alert(1)'],
    ['another scheme', 'ftp://example.com/listing'],
    ['a host without a dot', 'listing'],
    ['text with spaces', 'see the listing'],
  ])('rejects %s', (_, text) => {
    expect(parseListingUrl(text)).toBeUndefined();
  });
});

describe('siteName', () => {
  test.each([
    ['https://www.zillow.com/homedetails/123', 'zillow.com'],
    ['https://streeteasy.com/rental/456', 'streeteasy.com'],
  ])('names %j', (url, expected) => {
    expect(siteName(url)).toBe(expected);
  });
});

describe('ApartmentDetailsSchema', () => {
  test('stores an empty or blank field as null', () => {
    const blank = { ...toDetailsInput(NO_DETAILS), unit: '  ', notes: '\r\n' };

    expect(v.parse(ApartmentDetailsSchema, blank)).toEqual(NO_DETAILS);
  });

  test("reads a textarea's CRLF line breaks as LF", () => {
    const input = { ...toDetailsInput(NO_DETAILS), notes: 'One\r\nTwo' };

    expect(v.parse(ApartmentDetailsSchema, input).notes).toBe('One\nTwo');
  });

  test('reads back what toDetailsInput writes', () => {
    const details: ApartmentDetails = {
      unit: '4B',
      rent: 2850,
      listingUrl: 'https://example.com/listing/1',
      nextStep: 'Send reference',
      agentContact: 'Pat, 914-555-0100',
      notes: 'One\nTwo',
    };

    expect(v.parse(ApartmentDetailsSchema, toDetailsInput(details))).toEqual(details);
  });

  test('explains a rent or link it cannot read', () => {
    const input = { ...toDetailsInput(NO_DETAILS), rent: 'about 2850', listingUrl: 'listing' };

    const issues = v.safeParse(ApartmentDetailsSchema, input).issues?.map((issue) => issue.message);

    expect(issues).toEqual([
      'Enter the monthly rent in dollars, such as 2,850.',
      'Paste the whole link, such as https://streeteasy.com/…',
    ]);
  });
});

describe('changedDetails', () => {
  test('keeps only the fields that differ', () => {
    const original = { ...NO_DETAILS, rent: 2850, notes: 'Old' };

    expect(changedDetails({ ...original, rent: 2900, unit: '4B' }, original)).toEqual({
      rent: 2900,
      unit: '4B',
    });
  });

  test('is empty when nothing changed', () => {
    expect(changedDetails(NO_DETAILS, NO_DETAILS)).toEqual({});
  });
});
