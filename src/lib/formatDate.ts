// Fixed to English and New York time, so the server renders the same text the browser hydrates, and
// the day is White Plains' day.
const DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeZone: 'America/New_York',
});

export function formatDate(date: Date): string {
  return DATE_FORMAT.format(date);
}
