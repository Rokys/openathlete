import {
  addDaysToDateKey,
  zonedClock,
  zonedInstant,
} from 'src/common/utils/time-zone';

/** A session with a start time but no end lasts what it was planned to */
const DEFAULT_SESSION_MS = 3600_000;

export type FeedEntrySource = {
  startDate: Date;
  endDate: Date;
  /** HH:mm on the athlete's wall clock, null: planned for the day */
  startTime: string | null;
  endTime: string | null;
};

export type FeedEntry = { start: Date; end: Date; allDay: boolean };

/**
 * When the event shows in a calendar app. With a start time it is a timed
 * event, the athlete's wall clock turned into instants. Without, it fills
 * its days: iCal ends an all-day event on the day after its last one, so a
 * one-day event ending the same day would be empty, and Google drops it.
 *
 * The day is read in the athlete's time zone: startDate is a marker at noon
 * of the zone the date was picked in, which can be another day in UTC.
 */
export function feedEntry(event: FeedEntrySource, timeZone: string): FeedEntry {
  const day = zonedClock(event.startDate, timeZone).date;

  if (event.startTime) {
    const start = zonedInstant(day, event.startTime, timeZone);
    const planned = event.endDate.getTime() - event.startDate.getTime();
    const end = event.endTime
      ? zonedInstant(day, event.endTime, timeZone)
      : new Date(
          start.getTime() + (planned > 0 ? planned : DEFAULT_SESSION_MS),
        );
    return { start, end, allDay: false };
  }

  const endDay = zonedClock(event.endDate, timeZone).date;
  const lastDay = endDay > day ? endDay : day;
  return {
    start: new Date(`${day}T00:00:00Z`),
    end: new Date(`${addDaysToDateKey(lastDay, 1)}T00:00:00Z`),
    allDay: true,
  };
}
