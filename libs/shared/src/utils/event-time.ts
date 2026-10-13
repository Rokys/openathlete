import { z } from 'zod';

/** HH:mm on a 24-hour clock */
export const EVENT_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * The planned time of day of an event: HH:mm on the wall clock of the
 * athlete's time zone. Null clears it, undefined leaves it as it is.
 */
export const eventTimeSchema = z
  .string()
  .regex(EVENT_TIME_PATTERN, 'Expected a time as HH:mm')
  .nullable()
  .optional();

/** Minutes since midnight of an HH:mm time */
export function eventTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Whether an end time comes after the start time. A session with only one
 * of them, or none, is always consistent.
 */
export function isEventEndAfterStart(
  startTime: string | null | undefined,
  endTime: string | null | undefined,
): boolean {
  if (!startTime || !endTime) return true;
  return eventTimeToMinutes(endTime) > eventTimeToMinutes(startTime);
}
