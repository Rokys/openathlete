import { PrismaService } from 'src/modules/prisma/services/prisma.service';

import { recordActivityMaxHeartrate } from './activity-max-heartrate';

function setup({
  timeZone = 'Europe/Lisbon' as string | null,
  daily = null as { value: number } | null,
  current = null as { value: number } | null,
} = {}) {
  const db = {
    user: {
      findUnique: jest
        .fn()
        .mockResolvedValue(timeZone === null ? null : { timeZone }),
    },
    athleteMetric: {
      findUnique: jest.fn().mockResolvedValue(daily),
      upsert: jest.fn().mockResolvedValue({}),
      findFirst: jest.fn().mockResolvedValue(current),
    },
  };
  return {
    db,
    record: (start: Date, max: number | null | undefined) =>
      recordActivityMaxHeartrate(
        db as unknown as PrismaService,
        { athleteId: 7, userId: 3 },
        start,
        max,
      ),
  };
}

const START = new Date('2026-09-21T19:01:40Z');
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe('recordActivityMaxHeartrate', () => {
  describe("the day's maximum (HR_MAX_DAILY)", () => {
    it("records the activity's maximum on its day", async () => {
      const { db, record } = setup();

      await record(START, 115);

      expect(db.athleteMetric.upsert).toHaveBeenCalledWith({
        where: {
          athleteId_type_date: {
            athleteId: 7,
            type: 'HR_MAX_DAILY',
            date: day('2026-09-21'),
          },
        },
        create: {
          athleteId: 7,
          type: 'HR_MAX_DAILY',
          date: day('2026-09-21'),
          value: 115,
        },
        update: { value: 115 },
      });
    });

    it("reads the day in the athlete's time zone, not in UTC", async () => {
      // 00:30 on the 22nd in Lisbon (UTC+1 in September), still the 21st in UTC
      const lisbon = setup({ timeZone: 'Europe/Lisbon' });
      await lisbon.record(new Date('2026-09-21T23:30:00Z'), 150);
      expect(
        lisbon.db.athleteMetric.upsert.mock.calls[0][0].create.date,
      ).toEqual(day('2026-09-22'));

      // 22:30 on the 20th in New York (UTC-4), already the 21st in UTC
      const newYork = setup({ timeZone: 'America/New_York' });
      await newYork.record(new Date('2026-09-21T02:30:00Z'), 150);
      expect(
        newYork.db.athleteMetric.upsert.mock.calls[0][0].create.date,
      ).toEqual(day('2026-09-20'));
    });

    it('falls back to UTC when the athlete has no valid time zone', async () => {
      const { db, record } = setup({ timeZone: null });

      await record(new Date('2026-09-21T23:30:00Z'), 150);

      expect(db.athleteMetric.upsert.mock.calls[0][0].create.date).toEqual(
        day('2026-09-21'),
      );
    });

    it('raises a lower value already there for the day', async () => {
      const { db, record } = setup({ daily: { value: 140 } });

      await record(START, 160);

      expect(db.athleteMetric.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: { value: 160 } }),
      );
    });

    it('never lowers a higher value already there for the day', async () => {
      // A connector's daily summary, or a harder session the same day
      const { db, record } = setup({ daily: { value: 180 } });

      await record(START, 115);

      expect(db.athleteMetric.upsert).not.toHaveBeenCalled();
    });

    it('rounds to whole bpm', async () => {
      const { db, record } = setup();

      await record(START, 114.6);

      expect(db.athleteMetric.upsert.mock.calls[0][0].create.value).toBe(115);
    });

    it.each([null, undefined, NaN, 0, 29, 251, 255])(
      'ignores %s, which no heart rate sensor reports',
      async (value) => {
        const { db, record } = setup({ current: { value: 100 } });

        await expect(record(START, value)).resolves.toBeNull();

        expect(db.user.findUnique).not.toHaveBeenCalled();
        expect(db.athleteMetric.upsert).not.toHaveBeenCalled();
      },
    );

    it('accepts the ends of the plausible range', async () => {
      const low = setup();
      await low.record(START, 30);
      const high = setup();
      await high.record(START, 250);

      expect(low.db.athleteMetric.upsert).toHaveBeenCalledTimes(1);
      expect(high.db.athleteMetric.upsert).toHaveBeenCalledTimes(1);
    });
  });

  describe("the athlete's own maximum (HR_MAX)", () => {
    it('suggests it when the file is above the latest one', async () => {
      const { record } = setup({ current: { value: 100 } });

      await expect(record(START, 115)).resolves.toEqual({
        value: 115,
        date: '2026-09-21',
        current: 100,
      });
    });

    it('compares with the latest HR_MAX, the one the training load reads', async () => {
      const { db, record } = setup({ current: { value: 100 } });

      await record(START, 115);

      expect(db.athleteMetric.findFirst).toHaveBeenCalledWith({
        where: { athleteId: 7, type: 'HR_MAX' },
        orderBy: { date: 'desc' },
        select: { value: true },
      });
    });

    it.each([
      ['below', 190, 115],
      ['equal to', 115, 115],
    ])('does not ask when the file is %s it', async (_, current, file) => {
      const { record } = setup({ current: { value: current } });

      await expect(record(START, file)).resolves.toBeNull();
    });

    it('does not ask when the athlete has no HR_MAX yet', async () => {
      const { record } = setup({ current: null });

      await expect(record(START, 115)).resolves.toBeNull();
    });

    it('never writes HR_MAX by itself', async () => {
      const { db, record } = setup({ current: { value: 100 } });

      await record(START, 115);

      const types = db.athleteMetric.upsert.mock.calls.map(
        (call) => call[0].create.type,
      );
      expect(types).toEqual(['HR_MAX_DAILY']);
    });

    it('still asks when the day already holds a higher daily maximum', async () => {
      const { db, record } = setup({
        daily: { value: 180 },
        current: { value: 100 },
      });

      await expect(record(START, 115)).resolves.toMatchObject({ value: 115 });
      expect(db.athleteMetric.upsert).not.toHaveBeenCalled();
    });
  });
});
