import { describe, expect, it } from 'vitest';

import {
  addSecondsToTime,
  durationChanged,
  endTimeChanged,
  minutesOf,
  secondsBetween,
  startTimeChanged,
} from './time-of-day';

const HOUR = 3600;

describe('minutesOf', () => {
  it('reads an HH:mm time as minutes since midnight', () => {
    expect(minutesOf('00:00')).toBe(0);
    expect(minutesOf('07:30')).toBe(450);
    expect(minutesOf('23:59')).toBe(1439);
  });

  it('refuses a blank or malformed time', () => {
    for (const time of ['', null, undefined, '7:30', '24:00', '07:60', 'x']) {
      expect(minutesOf(time)).toBeNull();
    }
  });
});

describe('addSecondsToTime', () => {
  it('adds a length to a time of day', () => {
    expect(addSecondsToTime('07:30', 90 * 60)).toBe('09:00');
    expect(addSecondsToTime('23:00', 59 * 60)).toBe('23:59');
  });

  it('rounds to the minute', () => {
    // 45 min 45 s, as a workout can add up to
    expect(addSecondsToTime('07:00', 2745)).toBe('07:46');
  });

  it('gives nothing when the end falls on another day', () => {
    expect(addSecondsToTime('23:00', HOUR)).toBeNull();
    expect(addSecondsToTime('22:00', 3 * HOUR)).toBeNull();
  });

  it('gives nothing without a start or a length', () => {
    expect(addSecondsToTime('', HOUR)).toBeNull();
    expect(addSecondsToTime('07:00', 0)).toBeNull();
    expect(addSecondsToTime('07:00', 20)).toBeNull();
  });
});

describe('secondsBetween', () => {
  it('measures from the start to a later end', () => {
    expect(secondsBetween('07:00', '08:30')).toBe(5400);
  });

  it('gives nothing unless the end is after the start', () => {
    expect(secondsBetween('08:00', '08:00')).toBeNull();
    expect(secondsBetween('09:00', '08:00')).toBeNull();
    expect(secondsBetween('', '08:00')).toBeNull();
    expect(secondsBetween('07:00', null)).toBeNull();
  });
});

describe('startTimeChanged', () => {
  it('moves the end with the start, keeping the length', () => {
    // 08:00-09:30 (90 min) moved to start at 07:00
    expect(
      startTimeChanged(
        { startTime: '07:00', endTime: '09:30', goalDuration: 5400 },
        '08:00',
        '07:00',
      ),
    ).toEqual({ endTime: '08:30' });
    // 07:00-08:30 moved to start at 09:00
    expect(
      startTimeChanged(
        { startTime: '09:00', endTime: '08:30', goalDuration: 5400 },
        '07:00',
        '09:00',
      ),
    ).toEqual({ endTime: '10:30' });
  });

  it('follows the window on screen when the duration disagrees', () => {
    // 07:00-10:00 is 3 h, whatever the duration said
    expect(
      startTimeChanged(
        { startTime: '08:00', endTime: '10:00', goalDuration: HOUR },
        '07:00',
        '08:00',
      ),
    ).toEqual({ endTime: '11:00', goalDuration: 3 * HOUR });
  });

  it('sets the duration of a session that had times but no duration', () => {
    expect(
      startTimeChanged(
        { startTime: '13:00', endTime: '15:00', goalDuration: null },
        '12:00',
        '13:00',
      ),
    ).toEqual({ endTime: '16:00', goalDuration: 3 * HOUR });
  });

  it('empties the end when the move pushes it to another day', () => {
    expect(
      startTimeChanged(
        { startTime: '23:30', endTime: '21:00', goalDuration: HOUR },
        '20:00',
        '23:30',
      ),
    ).toEqual({ endTime: '' });
  });

  it('gives the duration when a start meets an end alone', () => {
    expect(
      startTimeChanged(
        { startTime: '07:30', endTime: '09:00', goalDuration: null },
        '',
        '07:30',
      ),
    ).toEqual({ goalDuration: 5400 });
  });

  it('gives an end when there is a duration and no end', () => {
    expect(
      startTimeChanged(
        { startTime: '07:30', endTime: '', goalDuration: 5400 },
        '',
        '07:30',
      ),
    ).toEqual({ endTime: '09:00' });
  });

  it('leaves things alone when there is nothing to derive', () => {
    expect(
      startTimeChanged({ startTime: '07:30', endTime: '' }, '', '07:30'),
    ).toEqual({});
    expect(
      startTimeChanged(
        { startTime: '', endTime: '09:00', goalDuration: HOUR },
        '07:00',
        '',
      ),
    ).toEqual({});
    // A duration that does not fit in the day gives no end
    expect(
      startTimeChanged(
        { startTime: '23:30', endTime: '', goalDuration: HOUR },
        '',
        '23:30',
      ),
    ).toEqual({});
  });

  it('does not set a duration from an end before the start', () => {
    expect(
      startTimeChanged(
        { startTime: '10:00', endTime: '09:00', goalDuration: null },
        '',
        '10:00',
      ),
    ).toEqual({});
  });
});

describe('endTimeChanged', () => {
  it('sets the duration to the distance from the start', () => {
    expect(
      endTimeChanged({ startTime: '07:00', goalDuration: HOUR }, '08:30'),
    ).toEqual({ goalDuration: 5400 });
  });

  it('leaves the duration when the end is not after the start', () => {
    expect(
      endTimeChanged({ startTime: '07:00', goalDuration: HOUR }, '06:00'),
    ).toEqual({});
  });

  it('leaves the duration when there is no start', () => {
    expect(
      endTimeChanged({ startTime: '', goalDuration: HOUR }, '08:30'),
    ).toEqual({});
  });
});

describe('durationChanged', () => {
  it('gives the end as the start plus the duration', () => {
    expect(durationChanged({ startTime: '07:00' }, 5400)).toEqual({
      endTime: '08:30',
    });
  });

  it('empties the end when it would fall on another day', () => {
    expect(durationChanged({ startTime: '23:00' }, 2 * HOUR)).toEqual({
      endTime: '',
    });
  });

  it('leaves the end alone with no start, or no duration', () => {
    expect(durationChanged({ startTime: '' }, HOUR)).toEqual({});
    expect(durationChanged({ startTime: '07:00' }, undefined)).toEqual({});
    expect(durationChanged({ startTime: '07:00' }, 0)).toEqual({});
  });
});
