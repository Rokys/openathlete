import { cn } from '@/utils/shadcn';
import { ComponentProps } from 'react';
import { Controller, useFormContext } from 'react-hook-form';

import { Input } from '../ui/input';
import { Label } from '../ui/label';

type Props = Omit<ComponentProps<'input'>, 'onChange' | 'type'> & {
  name: string;
  label?: string;
  /** Called after the form took the new time, with the one it replaced */
  onValueChange?: (value: string, previous: string | null | undefined) => void;
};

/** A time of day (HH:mm) that lets the caller react to what was typed */
export const RHFTimeField = ({
  name,
  label,
  onValueChange,
  ...other
}: Props) => {
  const { control } = useFormContext();

  return (
    <div className="grid gap-3">
      {label && <Label htmlFor={name}>{label}</Label>}
      <Controller
        name={name}
        control={control}
        render={({ field, fieldState: { error } }) => (
          <>
            <Input
              {...field}
              {...other}
              id={name}
              type="time"
              value={field.value ?? ''}
              onChange={(event) => {
                const previous = field.value as string | null | undefined;
                field.onChange(event.target.value);
                onValueChange?.(event.target.value, previous);
              }}
              className={cn(other.className, error && 'border-red-500')}
              aria-invalid={!!error}
            />
            {error?.message && (
              <p role="alert" className="text-sm text-red-500">
                {error.message}
              </p>
            )}
          </>
        )}
      />
    </div>
  );
};
