import { describe, expect, it, vi } from 'vitest';

import {
  NO_EQUIPMENT,
  eventFormSchema,
  timeOfDayOrNull,
  withEquipmentId,
} from './event-form-schemas';

vi.mock('@/paraglide/messages', () => ({
  m: new Proxy({}, { get: (_, key) => () => String(key) }),
}));

describe('activity equipment', () => {
  it('sends the chosen equipment as an id, or null to detach it', () => {
    expect(withEquipmentId({ name: 'Run', equipment: '12' })).toEqual({
      name: 'Run',
      equipmentId: 12,
    });
    expect(withEquipmentId({ name: 'Run', equipment: NO_EQUIPMENT })).toEqual({
      name: 'Run',
      equipmentId: null,
    });
  });

  it('leaves events without equipment as they are', () => {
    expect(withEquipmentId({ name: 'Intervals' })).toEqual({
      name: 'Intervals',
    });
  });
});

describe('time of day', () => {
  const note = (times: {
    startTime?: string | null;
    endTime?: string | null;
  }) =>
    eventFormSchema.safeParse({
      type: 'NOTE',
      name: 'Long run',
      description: 'Easy pace',
      startDate: new Date('2026-10-12T12:00:00Z'),
      endDate: new Date('2026-10-12T13:00:00Z'),
      ...times,
    });

  it('accepts a session without times, or with blank ones', () => {
    expect(note({}).success).toBe(true);
    expect(note({ startTime: '', endTime: '' }).success).toBe(true);
    expect(note({ startTime: null, endTime: null }).success).toBe(true);
  });

  it('accepts a start alone, an end alone, or both in order', () => {
    expect(note({ startTime: '07:30' }).success).toBe(true);
    expect(note({ endTime: '09:00' }).success).toBe(true);
    expect(note({ startTime: '07:30', endTime: '09:00' }).success).toBe(true);
  });

  it('refuses an end that is not after the start, on the end field', () => {
    for (const times of [
      { startTime: '09:00', endTime: '08:00' },
      { startTime: '09:00', endTime: '09:00' },
    ]) {
      const result = note(times);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['endTime']);
      }
    }
  });

  it('refuses what is not an HH:mm time', () => {
    for (const startTime of ['7:30', '24:00', '07:60', '07:30:00', 'noon']) {
      expect(note({ startTime }).success).toBe(false);
    }
  });

  it('sends a blank field as null, to clear a time set before', () => {
    expect(timeOfDayOrNull('')).toBeNull();
    expect(timeOfDayOrNull(undefined)).toBeNull();
    expect(timeOfDayOrNull('07:30')).toBe('07:30');
  });
});
