import { Athlete, MetricType } from '@openathlete/database';
import type { HrMaxSuggestionDto } from '@openathlete/shared';

import { validTimeZone, zonedClock } from 'src/common/utils/time-zone';
import { PrismaService } from 'src/modules/prisma/services/prisma.service';

/** What a heart rate sensor can report: a maximum outside it is a glitch */
export const MIN_PLAUSIBLE_MAX_HEARTRATE = 30;
export const MAX_PLAUSIBLE_MAX_HEARTRATE = 250;

/**
 * Takes the highest heart rate of an imported activity to the metrics, the
 * way the device connectors fill them:
 *
 * - HR_MAX_DAILY, the day's highest, always. A value already there for the
 *   day (another activity, a connector's daily summary) is never lowered.
 * - HR_MAX, the athlete's own maximum, never by itself: it drives the training
 *   load (TRIMP) and the "% of max heart rate" targets, and an easy session
 *   says nothing about it. When the file beats the latest HR_MAX, it is
 *   returned as a suggestion for the athlete to accept or not.
 *
 * Writing the same file again changes nothing more, so a repeated import can
 * stand in for a backfill.
 */
export async function recordActivityMaxHeartrate(
  prisma: PrismaService,
  athlete: Pick<Athlete, 'athleteId' | 'userId'>,
  startDate: Date,
  maxHeartrate: number | null | undefined,
): Promise<HrMaxSuggestionDto | null> {
  const value = Math.round(maxHeartrate ?? NaN);
  if (
    !Number.isFinite(value) ||
    value < MIN_PLAUSIBLE_MAX_HEARTRATE ||
    value > MAX_PLAUSIBLE_MAX_HEARTRATE
  ) {
    return null;
  }

  // Metrics are daily, and the day is the athlete's, not UTC's
  const user = await prisma.user.findUnique({
    where: { userId: athlete.userId },
    select: { timeZone: true },
  });
  const day = zonedClock(startDate, validTimeZone(user?.timeZone)).date;
  const date = new Date(`${day}T00:00:00Z`);

  const where = {
    athleteId_type_date: {
      athleteId: athlete.athleteId,
      type: MetricType.HR_MAX_DAILY,
      date,
    },
  };
  const daily = await prisma.athleteMetric.findUnique({
    where,
    select: { value: true },
  });
  if (!daily || daily.value < value) {
    await prisma.athleteMetric.upsert({
      where,
      create: {
        athleteId: athlete.athleteId,
        type: MetricType.HR_MAX_DAILY,
        date,
        value,
      },
      update: { value },
    });
  }

  // The latest, as the training load reads it
  const current = await prisma.athleteMetric.findFirst({
    where: { athleteId: athlete.athleteId, type: MetricType.HR_MAX },
    orderBy: { date: 'desc' },
    select: { value: true },
  });
  return current && value > current.value
    ? { value, date: day, current: current.value }
    : null;
}
