import { Button } from '@/components/ui/button';
import { m } from '@/paraglide/messages';

import type { HrMaxOffer } from './hr-max-suggestion';

type Props = {
  offer: HrMaxOffer;
  saving: boolean;
  /** The last attempt to register it failed */
  failed: boolean;
  onAccept: () => void;
  onDecline: () => void;
};

/**
 * Asks whether the highest heart rate of an imported file, above the athlete's
 * registered maximum, becomes the new one. Never answered for them: the
 * maximum drives the training load and the % of max heart rate targets, and a
 * file can hold a sensor glitch.
 */
export function HrMaxPrompt({
  offer,
  saving,
  failed,
  onAccept,
  onDecline,
}: Props) {
  return (
    <section
      aria-labelledby="hr-max-prompt-title"
      data-hr-max-prompt
      className="space-y-3 rounded-md border border-primary/40 bg-muted/40 p-3 text-sm"
    >
      <p id="hr-max-prompt-title" className="font-medium">
        {m.fit_import_hr_max_title()}
      </p>
      <p>
        {m.fit_import_hr_max_question({
          file: offer.fileName,
          value: offer.value,
          current: offer.current,
        })}
      </p>
      <p className="text-muted-foreground">{m.fit_import_hr_max_hint()}</p>
      {failed && (
        <p role="alert" className="text-destructive">
          {m.fit_import_hr_max_failed()}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button className="min-h-11" disabled={saving} onClick={onAccept}>
          {m.fit_import_hr_max_accept({ value: offer.value })}
        </Button>
        <Button
          variant="outline"
          className="min-h-11"
          disabled={saving}
          onClick={onDecline}
        >
          {m.fit_import_hr_max_decline()}
        </Button>
      </div>
    </section>
  );
}
