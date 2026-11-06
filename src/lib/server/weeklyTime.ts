import { DateTime } from 'luxon';

const ZONE = 'America/New_York';

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

// In Eastern time.
export interface WeeklyTime {
  day: DayOfWeek;
  hour: number;
  minute: number;
}

// Never today, even when the time is still to come: today's slot means next week's.
export function nextOccurrence({ day, hour, minute }: WeeklyTime): DateTime<true> {
  const now = DateTime.now().setZone(ZONE) as DateTime<true>;
  const daysAhead = day - now.weekday;
  return now
    .plus({ days: daysAhead <= 0 ? daysAhead + 7 : daysAhead })
    .set({ hour, minute, second: 0, millisecond: 0 });
}
