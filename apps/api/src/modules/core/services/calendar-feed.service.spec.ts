import { EventType } from '@openathlete/database';

import { PrismaService } from 'src/modules/prisma/services/prisma.service';

import { CalendarFeedService } from './calendar-feed.service';

const TOKEN = 'A'.repeat(43);
const HOUR = 3600_000;

function feedOf(
  events: Array<{
    eventId: number;
    name: string;
    startDate: Date;
    endDate: Date;
    startTime: string | null;
    endTime: string | null;
  }>,
  timeZone = 'Europe/Lisbon',
) {
  const prisma = {
    athlete: {
      findUnique: jest
        .fn()
        .mockResolvedValue({ athleteId: 1, user: { timeZone } }),
    },
    event: {
      findMany: jest
        .fn()
        .mockResolvedValue(
          events.map((e) => ({ ...e, type: EventType.TRAINING })),
        ),
    },
  };
  return new CalendarFeedService(prisma as unknown as PrismaService);
}

// Noon in Lisbon on 12 October 2026 (UTC+1)
const NOON = new Date('2026-10-12T11:00:00Z');

describe('CalendarFeedService.renderFeed', () => {
  it('gives an event without a time as a whole day that ends on the next', async () => {
    const feed = await feedOf([
      {
        eventId: 1,
        name: 'Tempo',
        startDate: NOON,
        endDate: new Date(NOON.getTime() + HOUR),
        startTime: null,
        endTime: null,
      },
    ]).renderFeed(TOKEN);

    expect(feed).toContain('DTSTART;VALUE=DATE:20261012');
    expect(feed).toContain('DTEND;VALUE=DATE:20261013');
  });

  it('gives an event with times as a timed event, in UTC', async () => {
    const feed = await feedOf([
      {
        eventId: 2,
        name: 'Intervals',
        startDate: NOON,
        endDate: new Date(NOON.getTime() + HOUR),
        startTime: '07:30',
        endTime: '08:45',
      },
    ]).renderFeed(TOKEN);

    expect(feed).toContain('DTSTART:20261012T063000Z');
    expect(feed).toContain('DTEND:20261012T074500Z');
    expect(feed).not.toContain('VALUE=DATE');
  });

  it("follows the athlete's time zone", async () => {
    const feed = await feedOf(
      [
        {
          eventId: 3,
          name: 'Tempo',
          startDate: new Date('2026-10-12T12:00:00Z'),
          endDate: new Date('2026-10-12T13:00:00Z'),
          startTime: '07:30',
          endTime: '08:45',
        },
      ],
      'America/New_York',
    ).renderFeed(TOKEN);

    // New York is UTC-4 in October
    expect(feed).toContain('DTSTART:20261012T113000Z');
  });
});
