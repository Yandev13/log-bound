// Layer 0: date, time, and duration text for the pages. All times show in the project time zone (A-04).
import { PROJECT_TIME_ZONE } from './hours';

const timeFormat = new Intl.DateTimeFormat('en-PH', {
  timeZone: PROJECT_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const dateFormat = new Intl.DateTimeFormat('en-PH', {
  timeZone: 'UTC',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/** "08:05" for an ISO time. */
export function timeOfDay(iso: string): string {
  return timeFormat.format(new Date(iso));
}

/** "Mon, 26 Oct 2026" for a calendar date "2026-10-26". */
export function dateLabel(date: string): string {
  return dateFormat.format(new Date(`${date}T00:00:00Z`));
}

/** "7 h 30 min" for 450 minutes. */
export function duration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}
