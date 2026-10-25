import { useCallback } from 'react';
import { useFormContext } from 'react-hook-form';

import type { EventFormValues } from '../utils/event-form-schemas';
import type { TimeFormState, TimePatch } from '../utils/time-of-day';

/**
 * Reads the times and the duration of the form, and writes back what the
 * coupling rules (utils/time-of-day) ask for
 */
export function useTimeCoupling() {
  const { getValues, setValue } = useFormContext<EventFormValues>();

  const state = useCallback(
    (): TimeFormState => ({
      startTime: getValues('startTime'),
      endTime: getValues('endTime'),
      goalDuration: getValues('goalDuration'),
    }),
    [getValues],
  );

  const apply = useCallback(
    (patch: TimePatch) => {
      if (patch.endTime !== undefined) setValue('endTime', patch.endTime);
      if (patch.goalDuration !== undefined) {
        setValue('goalDuration', patch.goalDuration);
      }
    },
    [setValue],
  );

  return { state, apply };
}
