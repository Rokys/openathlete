import type {
  HrMaxSuggestionDto,
  ImportedActivityDto,
} from '@openathlete/shared';

/** What the athlete is asked about: the suggestion and the file it came from */
export type HrMaxOffer = HrMaxSuggestionDto & { fileName: string };

/**
 * The question to ask once the files are imported. Several files can each
 * beat the registered maximum, but the athlete is asked once, about the
 * highest: registering it settles the lower ones too.
 */
export function pickHrMaxSuggestion(
  results: { fileName: string; result?: ImportedActivityDto }[] | null,
): HrMaxOffer | null {
  let best: HrMaxOffer | null = null;
  for (const { fileName, result } of results ?? []) {
    const suggestion = result?.hrMaxSuggestion;
    if (suggestion && (!best || suggestion.value > best.value)) {
      best = { ...suggestion, fileName };
    }
  }
  return best;
}
