import type ApartmentStatus from '#lib/server/db/schema/public/ApartmentStatus.ts';

// A `Record`, so a status added to the enum fails the type check until it has a label here.
export const STATUS_LABELS: Record<ApartmentStatus, string> = {
  interested: 'Interested',
  reached_out: 'Contacted',
  visited: 'Visited',
  applied: 'Applied',
  signed: 'Signed',
  not_for_us: 'Not for us',
};

export const STATUSES = Object.keys(STATUS_LABELS) as ApartmentStatus[];
