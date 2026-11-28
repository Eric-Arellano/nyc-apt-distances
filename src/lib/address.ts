import * as v from 'valibot';

/** `Unit 4B`, however the unit was typed. */
export function formatUnit(unit: string): string {
  return `Unit ${unit}`;
}

/** `1 Main St, Unit 4B`, which tells apart apartments in the same building. */
export function withUnit(address: string, unit: string | null): string {
  return unit ? `${address}, ${formatUnit(unit)}` : address;
}

/** Without "Unit", "Apt" or "#", so `formatUnit` never shows "Unit Apt 4B". */
export function parseUnit(text: string): string | null {
  return text.trim().replace(/^(?:(?:unit|apt|apartment)\b\.?|#)\s*/i, '') || null;
}

export const UnitSchema = v.pipe(v.string(), v.transform(parseUnit));

export function isValidAddress(address: string): boolean {
  return /^\d+\s+\S+.*$/.test(address.trim());
}

/** `12 Juniper Row` from `12 Juniper Row, White Plains, NY 10601`. */
export function streetPart(address: string): string {
  return address.split(',')[0]?.trim() ?? address;
}
