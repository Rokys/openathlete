import { describe, expect, it } from 'vitest';

import type { ImportedActivityDto } from '@openathlete/shared';

import { pickHrMaxSuggestion } from './hr-max-suggestion';

const result = (
  hrMaxSuggestion?: ImportedActivityDto['hrMaxSuggestion'],
): ImportedActivityDto => ({
  eventId: 1,
  name: 'Run',
  startDate: '2026-09-21T19:00:00Z',
  alreadyImported: false,
  processingQueued: true,
  warnings: [],
  hrMaxSuggestion,
});

const suggestion = (value: number, date = '2026-09-21') => ({
  value,
  date,
  current: 100,
});

describe('pickHrMaxSuggestion', () => {
  it('gives nothing without results, or when no file has a suggestion', () => {
    expect(pickHrMaxSuggestion(null)).toBeNull();
    expect(pickHrMaxSuggestion([])).toBeNull();
    expect(
      pickHrMaxSuggestion([
        { fileName: 'a.tcx', result: result() },
        { fileName: 'b.tcx', result: result(null) },
        { fileName: 'c.tcx' },
      ]),
    ).toBeNull();
  });

  it('gives the suggestion with the file it came from', () => {
    expect(
      pickHrMaxSuggestion([
        { fileName: 'easy.tcx', result: result(suggestion(115)) },
      ]),
    ).toEqual({ ...suggestion(115), fileName: 'easy.tcx' });
  });

  it('gives the highest when several files have one', () => {
    expect(
      pickHrMaxSuggestion([
        { fileName: 'mon.fit', result: result(suggestion(112)) },
        { fileName: 'tue.fit', result: result(suggestion(120, '2026-09-22')) },
        { fileName: 'wed.fit', result: result(suggestion(118)) },
      ]),
    ).toEqual({ ...suggestion(120, '2026-09-22'), fileName: 'tue.fit' });
  });

  it('keeps the first of two equal ones', () => {
    expect(
      pickHrMaxSuggestion([
        { fileName: 'a.fit', result: result(suggestion(120)) },
        { fileName: 'b.fit', result: result(suggestion(120, '2026-09-22')) },
      ]),
    ).toMatchObject({ fileName: 'a.fit' });
  });

  it('skips files that failed to import', () => {
    expect(
      pickHrMaxSuggestion([
        { fileName: 'bad.fit' },
        { fileName: 'ok.fit', result: result(suggestion(130)) },
      ]),
    ).toMatchObject({ fileName: 'ok.fit', value: 130 });
  });
});
