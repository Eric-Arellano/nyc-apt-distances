import { describe, expect, test } from 'vitest';
import { linkify } from './linkify.ts';

describe('linkify', () => {
  test('links a phone number, an email and a web link among text', () => {
    expect(linkify('Pat 914-555-0100, pat@example.com\nhttps://example.com/a.')).toEqual([
      { kind: 'text', text: 'Pat ' },
      { kind: 'phone', text: '914-555-0100', href: 'tel:9145550100' },
      { kind: 'text', text: ', ' },
      { kind: 'email', text: 'pat@example.com', href: 'mailto:pat@example.com' },
      { kind: 'text', text: '\n' },
      { kind: 'url', text: 'https://example.com/a', href: 'https://example.com/a' },
      { kind: 'text', text: '.' },
    ]);
  });

  test('returns text with nothing to link as one segment', () => {
    expect(linkify('Big kitchen')).toEqual([{ kind: 'text', text: 'Big kitchen' }]);
  });

  test('returns nothing for empty text', () => {
    expect(linkify('')).toEqual([]);
  });

  describe('with a phone number', () => {
    test.each([
      ['(914) 555-0100', 'tel:9145550100'],
      ['914.555.0100', 'tel:9145550100'],
      ['+1 914 555 0100', 'tel:+19145550100'],
      ['9145550100', 'tel:9145550100'],
    ])('links %j', (text, href) => {
      expect(linkify(text)).toEqual([{ kind: 'phone', text, href }]);
    });

    test.each([
      ['a rent', '$2,850'],
      ['a date', '2026-11-27'],
      ['a longer run of digits', '123456789012'],
    ])('leaves %s alone', (_, text) => {
      expect(linkify(text)).toEqual([{ kind: 'text', text }]);
    });
  });

  describe('with a web link', () => {
    test('keeps digits and an @ inside it', () => {
      const url = 'https://example.com/@pat/9145550100';

      expect(linkify(url)).toEqual([{ kind: 'url', text: url, href: url }]);
    });

    test('leaves out a closing parenthesis after it', () => {
      expect(linkify('(https://example.com)')).toEqual([
        { kind: 'text', text: '(' },
        { kind: 'url', text: 'https://example.com', href: 'https://example.com' },
        { kind: 'text', text: ')' },
      ]);
    });
  });
});
