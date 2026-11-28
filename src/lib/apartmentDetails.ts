import * as v from 'valibot';
import { UnitSchema } from '#lib/address.ts';
import type { Apartment } from '#lib/server/db/schema/public/Apartment.ts';

/** What we track about an apartment besides its status, every field of which may be empty. */
export type ApartmentDetails = Pick<
  Apartment,
  'unit' | 'rent' | 'listingUrl' | 'nextStep' | 'agentContact' | 'notes'
>;

export type DetailKey = keyof ApartmentDetails;

/** What the edit form's inputs hold: every field as text, with `''` for an empty one. */
export type DetailsInput = Record<DetailKey, string>;

const RENT_FORMAT = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

/** Whole dollars, forgiving `$` and commas. `undefined` means the text isn't a rent. */
export function parseRent(text: string): number | null | undefined {
  const digits = text.replace(/[\s$,]/g, '');
  if (digits === '') return null;
  // Seven digits at most, so every match fits Postgres' `integer`.
  return /^[1-9]\d{0,6}$/.test(digits) ? Number(digits) : undefined;
}

/** `$2,850`, for where the column header says it is monthly. */
export function formatDollars(rent: number): string {
  return RENT_FORMAT.format(rent);
}

export function formatRent(rent: number): string {
  return `${formatDollars(rent)}/month`;
}

/** `undefined` means the text isn't a web link. */
export function parseListingUrl(text: string): string | null | undefined {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  // A link copied from the share sheet or typed by hand may leave out its scheme.
  const url = URL.parse(/^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`);
  // The page renders it as a link, where any other scheme, such as `javascript:`, could run code.
  if (url?.protocol !== 'https:' && url?.protocol !== 'http:') return undefined;
  return url.hostname.includes('.') ? url.href : undefined;
}

/** `streeteasy.com`, which says enough about a listing to stand for its link. */
export function siteName(listingUrl: string): string {
  return new URL(listingUrl).hostname.replace(/^www\./, '');
}

// Browsers send a textarea's line breaks as CRLF, which would never equal what was loaded.
const Text = v.pipe(
  v.string(),
  v.transform((text) => text.replace(/\r\n?/g, '\n').trim() || null),
);

export const ApartmentDetailsSchema = v.object({
  unit: UnitSchema,
  rent: v.pipe(
    v.string(),
    v.transform(parseRent),
    v.custom<number | null>(
      (rent) => rent !== undefined,
      'Enter the monthly rent in dollars, such as 2,850.',
    ),
  ),
  listingUrl: v.pipe(
    v.string(),
    v.transform(parseListingUrl),
    v.custom<string | null>(
      (url) => url !== undefined,
      'Paste the whole link, such as https://streeteasy.com/…',
    ),
  ),
  nextStep: Text,
  agentContact: Text,
  notes: Text,
}) satisfies v.GenericSchema<DetailsInput, ApartmentDetails>;

export function toDetailsInput(details: ApartmentDetails): DetailsInput {
  return {
    unit: details.unit ?? '',
    rent: details.rent === null ? '' : String(details.rent),
    listingUrl: details.listingUrl ?? '',
    nextStep: details.nextStep ?? '',
    agentContact: details.agentContact ?? '',
    notes: details.notes ?? '',
  };
}

/** Only what this edit changed, so saving never undoes what the other person saved meanwhile. */
export function changedDetails(
  edited: ApartmentDetails,
  original: ApartmentDetails,
): Partial<ApartmentDetails> {
  return Object.fromEntries(
    Object.entries(edited).filter(([key, value]) => value !== original[key as DetailKey]),
  );
}
