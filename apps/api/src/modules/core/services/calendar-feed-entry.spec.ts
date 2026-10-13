import { feedEntry } from './calendar-feed-entry';

const at = (iso: string) => new Date(iso);
const HOUR = 3600_000;

const source = (
  startDate: Date,
  overrides: Partial<Parameters<typeof feedEntry>[0]> = {},
) => ({
  startDate,
  endDate: new Date(startDate.getTime() + HOUR),
  startTime: null,
  endTime: null,
  ...overrides,
});

describe('feedEntry', () => {
  describe('without a time', () => {
    it('fills its day: iCal ends an all-day event on the day after', () => {
      // Noon in Lisbon (UTC+1 in October)
      const entry = feedEntry(
        source(at('2026-10-12T11:00:00Z')),
        'Europe/Lisbon',
      );

      expect(entry).toEqual({
        start: at('2026-10-12T00:00:00Z'),
        end: at('2026-10-13T00:00:00Z'),
        allDay: true,
      });
    });

    it("reads the day in the athlete's zone, not in UTC", () => {
      // Noon in Auckland (UTC+13) is the evening before in UTC
      const entry = feedEntry(
        source(at('2026-10-11T23:00:00Z')),
        'Pacific/Auckland',
      );

      expect(entry.start).toEqual(at('2026-10-12T00:00:00Z'));
      expect(entry.end).toEqual(at('2026-10-13T00:00:00Z'));
    });

    it('lasts until the day it ends', () => {
      const startDate = at('2026-10-12T11:00:00Z');
      const entry = feedEntry(
        source(startDate, { endDate: at('2026-10-13T09:00:00Z') }),
        'Europe/Lisbon',
      );

      expect(entry.start).toEqual(at('2026-10-12T00:00:00Z'));
      expect(entry.end).toEqual(at('2026-10-14T00:00:00Z'));
    });

    it('stays on one day when the end is not after the start', () => {
      const startDate = at('2026-10-12T11:00:00Z');
      const entry = feedEntry(
        source(startDate, { endDate: startDate }),
        'Europe/Lisbon',
      );

      expect(entry.end).toEqual(at('2026-10-13T00:00:00Z'));
    });

    it('does not make a timed event of an end time alone', () => {
      const entry = feedEntry(
        source(at('2026-10-12T11:00:00Z'), { endTime: '09:00' }),
        'Europe/Lisbon',
      );

      expect(entry.allDay).toBe(true);
    });
  });

  describe('with a start time', () => {
    it("turns the athlete's wall clock into instants", () => {
      const entry = feedEntry(
        source(at('2026-10-12T11:00:00Z'), {
          startTime: '07:30',
          endTime: '08:45',
        }),
        'Europe/Lisbon',
      );

      expect(entry).toEqual({
        start: at('2026-10-12T06:30:00Z'),
        end: at('2026-10-12T07:45:00Z'),
        allDay: false,
      });
    });

    it('lasts the planned duration without an end time', () => {
      const startDate = at('2026-10-12T11:00:00Z');
      const entry = feedEntry(
        source(startDate, {
          endDate: new Date(startDate.getTime() + 2 * HOUR),
          startTime: '07:00',
        }),
        'Europe/Lisbon',
      );

      expect(entry.start).toEqual(at('2026-10-12T06:00:00Z'));
      expect(entry.end).toEqual(at('2026-10-12T08:00:00Z'));
    });

    it('lasts an hour when nothing says how long', () => {
      const startDate = at('2026-10-12T11:00:00Z');
      const entry = feedEntry(
        source(startDate, { endDate: startDate, startTime: '07:00' }),
        'Europe/Lisbon',
      );

      expect(entry.end).toEqual(at('2026-10-12T07:00:00Z'));
    });

    it('keeps the wall clock across a DST change', () => {
      // Lisbon leaves summer time on 25 October 2026
      const before = feedEntry(
        source(at('2026-10-24T11:00:00Z'), { startTime: '07:00' }),
        'Europe/Lisbon',
      );
      const after = feedEntry(
        source(at('2026-10-26T12:00:00Z'), { startTime: '07:00' }),
        'Europe/Lisbon',
      );

      expect(before.start).toEqual(at('2026-10-24T06:00:00Z'));
      expect(after.start).toEqual(at('2026-10-26T07:00:00Z'));
    });

    it('works in UTC', () => {
      const entry = feedEntry(
        source(at('2026-10-12T12:00:00Z'), {
          startTime: '18:00',
          endTime: '19:30',
        }),
        'UTC',
      );

      expect(entry.start).toEqual(at('2026-10-12T18:00:00Z'));
      expect(entry.end).toEqual(at('2026-10-12T19:30:00Z'));
    });
  });
});
