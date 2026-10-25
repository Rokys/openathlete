// @vitest-environment jsdom
import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';
import { FormProvider, type UseFormReturn, useForm } from 'react-hook-form';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { EventFormValues } from '../utils/event-form-schemas';
import { TimeOfDayFields } from './event-form-fields';

vi.mock('@/paraglide/messages', () => ({
  m: new Proxy({}, { get: (_, key) => () => String(key) }),
}));

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type Defaults = {
  startTime?: string;
  endTime?: string;
  goalDuration?: number;
};

let container: HTMLDivElement;
let root: Root;
let form: UseFormReturn<EventFormValues>;

function Harness({
  defaults,
  hasStepsWithDuration,
}: {
  defaults: Defaults;
  hasStepsWithDuration: boolean;
}) {
  const methods = useForm<EventFormValues>({
    defaultValues: defaults as unknown as EventFormValues,
  });
  form = methods;
  return (
    <FormProvider {...methods}>
      <TimeOfDayFields hasStepsWithDuration={hasStepsWithDuration} />
    </FormProvider>
  );
}

function render(defaults: Defaults, hasStepsWithDuration = false) {
  act(() => {
    root.render(
      <Harness
        defaults={defaults}
        hasStepsWithDuration={hasStepsWithDuration}
      />,
    );
  });
}

function input(name: string): HTMLInputElement {
  return container.querySelector(`#${name}`) as HTMLInputElement;
}

/** Types into an input the way a user does, so React sees a change */
function type(name: string, value: string) {
  const field = input(name);
  const setValue = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )!.set!;
  act(() => {
    setValue.call(field, value);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

const values = () => ({
  startTime: form.getValues('startTime'),
  endTime: form.getValues('endTime'),
  goalDuration: form.getValues('goalDuration'),
});

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('TimeOfDayFields', () => {
  it('changes nothing when it opens, whatever the times and duration say', () => {
    render({ startTime: '12:00', endTime: '15:00' });

    expect(values()).toEqual({
      startTime: '12:00',
      endTime: '15:00',
      goalDuration: undefined,
    });
    expect(input('startTime').value).toBe('12:00');
    expect(input('endTime').value).toBe('15:00');
  });

  it('gives the duration when the end is typed after a start', () => {
    render({ startTime: '07:00' });

    type('endTime', '08:30');

    expect(values()).toMatchObject({ endTime: '08:30', goalDuration: 5400 });
  });

  it('keeps the length of the session when the start moves', () => {
    render({ startTime: '08:00', endTime: '09:30', goalDuration: 5400 });

    type('startTime', '07:00');

    expect(values()).toEqual({
      startTime: '07:00',
      endTime: '08:30',
      goalDuration: 5400,
    });
    expect(input('endTime').value).toBe('08:30');
  });

  it('gives an end to a start typed when a duration is set', () => {
    render({ goalDuration: 3600 });

    type('startTime', '07:30');

    expect(values()).toMatchObject({ startTime: '07:30', endTime: '08:30' });
  });

  it('leaves the end alone when only the end is typed', () => {
    render({ goalDuration: 3600 });

    type('endTime', '09:00');

    expect(values()).toMatchObject({ endTime: '09:00', goalDuration: 3600 });
  });

  it('shows the end as derived when the workout steps set the duration', () => {
    render({ startTime: '07:00', endTime: '08:00' }, true);

    expect(input('endTime').disabled).toBe(true);
    expect(input('startTime').disabled).toBe(false);
  });
});
