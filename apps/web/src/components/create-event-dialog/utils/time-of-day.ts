import { EVENT_TIME_PATTERN, eventTimeToMinutes } from '@openathlete/shared';

const MINUTES_IN_DAY = 24 * 60;

/** What the time fields and the goal duration hold while the form is edited */
export type TimeFormState = {
  startTime?: string | null;
  endTime?: string | null;
  /** In seconds */
  goalDuration?: number | null;
};

/** What to write back to keep the three in step. Absent: leave as it is */
export type TimePatch = {
  /** '' empties the field: the end would fall on another day */
  endTime?: string;
  goalDuration?: number;
};

/** An HH:mm time as minutes since midnight, null when blank or malformed */
export function minutesOf(time: string | null | undefined): number | null {
  if (!time || !EVENT_TIME_PATTERN.test(time)) return null;
  return eventTimeToMinutes(time);
}

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/**
 * The time `seconds` after `time`, to the minute. Null when it does not end
 * on the same day (the field holds a time of day, not a date) or when the
 * length rounds to nothing.
 */
export function addSecondsToTime(
  time: string | null | undefined,
  seconds: number,
): string | null {
  const start = minutesOf(time);
  const length = Math.round(seconds / 60);
  if (start === null || length < 1) return null;
  const end = start + length;
  return end < MINUTES_IN_DAY ? formatMinutes(end) : null;
}

/** Seconds from one time to the next, null unless the end is after the start */
export function secondsBetween(
  start: string | null | undefined,
  end: string | null | undefined,
): number | null {
  const from = minutesOf(start);
  const to = minutesOf(end);
  if (from === null || to === null || to <= from) return null;
  return (to - from) * 60;
}

/**
 * A start time was typed. The session keeps its length, so the end moves
 * with it. With no end yet, the duration (if any) gives one.
 */
export function startTimeChanged(
  state: TimeFormState,
  previousStart: string | null | undefined,
  nextStart: string,
): TimePatch {
  if (minutesOf(nextStart) === null) return {};

  const goal =
    state.goalDuration && state.goalDuration > 0 ? state.goalDuration : null;
  const hasEnd = minutesOf(state.endTime) !== null;

  if (hasEnd && minutesOf(previousStart) !== null) {
    // The window on screen is what moves, even if the duration said otherwise
    const length = secondsBetween(previousStart, state.endTime) ?? goal;
    if (!length) return {};
    return {
      endTime: addSecondsToTime(nextStart, length) ?? '',
      ...(length !== goal && { goalDuration: length }),
    };
  }
  if (hasEnd) {
    // A start on a session that only had an end: the duration follows
    const length = secondsBetween(nextStart, state.endTime);
    return length ? { goalDuration: length } : {};
  }
  if (goal) {
    const end = addSecondsToTime(nextStart, goal);
    return end ? { endTime: end } : {};
  }
  return {};
}

/** An end time was typed: the duration is the distance from the start */
export function endTimeChanged(
  state: TimeFormState,
  nextEnd: string,
): TimePatch {
  const length = secondsBetween(state.startTime, nextEnd);
  return length ? { goalDuration: length } : {};
}

/**
 * The duration changed, typed or taken from the workout steps: the end is
 * the start plus the duration, or empty when that falls on another day.
 */
export function durationChanged(
  state: TimeFormState,
  seconds: number | null | undefined,
): TimePatch {
  if (!seconds || seconds <= 0 || minutesOf(state.startTime) === null) {
    return {};
  }
  return { endTime: addSecondsToTime(state.startTime, seconds) ?? '' };
}
