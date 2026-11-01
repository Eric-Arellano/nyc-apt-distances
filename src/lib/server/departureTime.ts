import { DateTime } from 'luxon';

// Luxon numbers days of the week from 1-7.
export enum DayOfWeek {
  Monday = 1,
  Tuesday = 2,
  Wednesday = 3,
  Thursday = 4,
  Friday = 5,
  Saturday = 6,
  Sunday = 7,
}

/** Time should be specified in America/New_York (i.e, ET). */
export interface TargetDate {
  day: DayOfWeek;
  hour: number;
  minute: number;
}

export function getNextDateTime(
  target: TargetDate,
  fromDate: DateTime<true> = DateTime.now().setZone('America/New_York') as DateTime<true>,
): DateTime<true> {
  if (fromDate.zoneName !== 'America/New_York') {
    throw new Error(`Invalid timezone for input date: ${fromDate.zoneName}`);
  }

  let daysToAdd = target.day - fromDate.weekday;
  // If the day has already passed this week, use next week
  if (daysToAdd <= 0) {
    daysToAdd += 7;
  }
  return fromDate.plus({ days: daysToAdd }).set({ hour: target.hour, minute: target.minute });
}
