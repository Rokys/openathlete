import { useGetMyEquipmentQuery } from '@/api/equipment';
import { SportIcon } from '@/components/sport-icon/sport-icon';
import { m } from '@/paraglide/messages';
import { sportTypeLabelMap } from '@/utils/label-map/core';
import { UseFormSetValue } from 'react-hook-form';

import { EVENT_TYPE, SPORT_TYPE, formatSpeed } from '@openathlete/shared';

import {
  RHFDatePicker,
  RHFDistance,
  RHFDuration,
  RHFSelect,
  RHFTextField,
} from '../../hook-form';
import { RHFCheckbox } from '../../hook-form/rhf-checkbox';
import { RHFDateTimePicker } from '../../hook-form/rhf-datetime-picker';
import { RHFElevation } from '../../hook-form/rhf-elevation';
import { RHFRpe } from '../../hook-form/rhf-rpe';
import { RHFTextarea } from '../../hook-form/rhf-textarea';
import { RHFTimeField } from '../../hook-form/rhf-time-field';
import { SelectItem } from '../../ui/select';
import { useTimeCoupling } from '../hooks/use-time-coupling';
import {
  type EventFormValues,
  NO_EQUIPMENT,
} from '../utils/event-form-schemas';
import {
  durationChanged,
  endTimeChanged,
  startTimeChanged,
} from '../utils/time-of-day';
import { CompetitionPriorityField } from './competition-priority-field';

type Props = {
  type: EVENT_TYPE;
  hasStepsWithDuration: boolean;
  startDateValue?: Date;
  endDateValue?: Date;
  /** Equipment can only be chosen among the user's own */
  canChooseEquipment?: boolean;
  goalDistanceValue?: number | null;
  goalDurationValue?: number | null;
  setValue: UseFormSetValue<EventFormValues>;
  isTemplate?: boolean;
  /** A new activity logged by hand: its duration, distance and elevation */
  logging?: boolean;
};

export function EventFormFields({
  type,
  hasStepsWithDuration,
  startDateValue,
  endDateValue,
  canChooseEquipment,
  goalDistanceValue,
  goalDurationValue,
  setValue,
  isTemplate,
  logging,
}: Props) {
  const { state: timeState, apply: applyTimes } = useTimeCoupling();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
      <RHFTextField
        name="name"
        type="text"
        placeholder={m.morning_run()}
        label={m.event_name()}
        required
      />
      {type === EVENT_TYPE.TRAINING ||
      type === EVENT_TYPE.COMPETITION ||
      type === EVENT_TYPE.ACTIVITY ? (
        <RHFSelect
          name="sport"
          label={m.sport()}
          required
          placeholder={m.select_a_sport()}
        >
          {Object.values(SPORT_TYPE).map((sport) => (
            <SelectItem key={sport} value={sport}>
              <SportIcon sport={sport} /> {sportTypeLabelMap[sport]}
            </SelectItem>
          ))}
        </RHFSelect>
      ) : (
        <div className="hidden md:block" />
      )}
      {!isTemplate &&
        (type === EVENT_TYPE.TRAINING || type === EVENT_TYPE.COMPETITION) && (
          <div className="col-span-1 md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            <RHFDatePicker
              name="startDate"
              label={m.start_date()}
              onChange={(date) => {
                if (date && !hasStepsWithDuration) {
                  const duration = goalDurationValue || 3600; // 1 hour default
                  const end = new Date(date);
                  end.setSeconds(end.getSeconds() + duration);
                  setValue('endDate', end);
                }
              }}
            />
            <TimeOfDayFields hasStepsWithDuration={hasStepsWithDuration} />
          </div>
        )}
      {isTemplate &&
        (type === EVENT_TYPE.TRAINING || type === EVENT_TYPE.COMPETITION) && (
          // A template has no date, but the sessions made from it keep its time
          <div className="col-span-1 md:col-span-2 sm:max-w-[50%]">
            <TimeOfDayFields hasStepsWithDuration={hasStepsWithDuration} />
          </div>
        )}
      {!isTemplate && type === EVENT_TYPE.ACTIVITY && (
        <div className="col-span-1 md:col-span-2">
          <RHFDateTimePicker
            name="startDate"
            label={m.start_date()}
            onChange={(date) => {
              // The recorded duration stays: only the time moves
              if (date && startDateValue && endDateValue) {
                const duration =
                  new Date(endDateValue).getTime() -
                  new Date(startDateValue).getTime();
                setValue('endDate', new Date(date.getTime() + duration));
              }
            }}
          />
        </div>
      )}
      <div className="col-span-1 md:col-span-2">
        <RHFTextarea
          name="description"
          label={m.description()}
          className="h-24"
          required={type === EVENT_TYPE.NOTE}
        />
      </div>
      {(type === EVENT_TYPE.TRAINING || type === EVENT_TYPE.COMPETITION) && (
        <>
          <RHFDistance name="goalDistance" label={m.goal_distance()} />
          <RHFDuration
            name="goalDuration"
            label={m.goal_duration()}
            disabled={hasStepsWithDuration}
            onChange={(value) => {
              if (!hasStepsWithDuration && startDateValue) {
                const start = new Date(startDateValue);
                const duration = value || 3600; // Default 1 hour
                const end = new Date(start);
                end.setSeconds(start.getSeconds() + duration);
                setValue('endDate', end);
              }
              // The end time follows the duration typed
              if (!hasStepsWithDuration) {
                applyTimes(durationChanged(timeState(), value));
              }
            }}
          />
          {!!goalDistanceValue && !!goalDurationValue && (
            <div className="text-xs md:text-sm text-gray-500 flex flex-col md:flex-row md:items-center gap-1 md:gap-0 col-span-1 md:col-span-2">
              <span>
                {m.pace()}:{' '}
                {formatSpeed(
                  Number(goalDistanceValue) / Number(goalDurationValue),
                  'min/km',
                )}{' '}
                {m.per_km()}
              </span>
              <span className="hidden md:inline"> - </span>
              <span>
                {formatSpeed(
                  Number(goalDistanceValue) / Number(goalDurationValue),
                  'km/h',
                )}{' '}
                {m.kilometers_per_hour()}
              </span>
            </div>
          )}
          <RHFElevation
            name="goalElevationGain"
            label={m.goal_elevation_gain()}
          />
          <RHFRpe name="goalRpe" label={m.goal_rpe()} />
          {type === EVENT_TYPE.COMPETITION && <CompetitionPriorityField />}
        </>
      )}
      {type === EVENT_TYPE.ACTIVITY && logging && (
        <>
          <RHFDuration
            name="duration"
            label={m.duration()}
            onChange={(seconds) => {
              // The end follows: the API reads the duration from it
              if (startDateValue && seconds) {
                setValue(
                  'endDate',
                  new Date(new Date(startDateValue).getTime() + seconds * 1000),
                );
              }
            }}
          />
          <RHFDistance name="distance" label={m.distance()} />
          <RHFElevation name="elevationGain" label={m.elevation_gain()} />
        </>
      )}
      {type === EVENT_TYPE.ACTIVITY && (
        <>
          {canChooseEquipment && <ActivityEquipmentSelect />}
          <div className="flex items-end pb-2">
            <RHFCheckbox name="isRace" label={m.activity_is_race()} />
          </div>
          <div className="col-span-1 md:col-span-2">
            <RHFRpe name="rpe" label={m.rpe()} />
          </div>
        </>
      )}
    </div>
  );
}

/**
 * The planned start and end of the day, next to the date. They move together
 * with the goal duration: a new end sets the duration, a new start carries the
 * end with it, and the duration (typed, or added up from the workout steps)
 * gives the end. Nothing changes until one of them is touched.
 */
export function TimeOfDayFields({
  hasStepsWithDuration,
}: {
  hasStepsWithDuration: boolean;
}) {
  const { state, apply } = useTimeCoupling();

  return (
    <div className="grid grid-cols-2 gap-4">
      <RHFTimeField
        name="startTime"
        label={m.start_time()}
        onValueChange={(value, previous) =>
          apply(startTimeChanged(state(), previous, value))
        }
      />
      <RHFTimeField
        name="endTime"
        label={m.end_time()}
        // The workout steps decide the duration, and so the end
        disabled={hasStepsWithDuration}
        onValueChange={(value) => apply(endTimeChanged(state(), value))}
      />
    </div>
  );
}

function ActivityEquipmentSelect() {
  const { data: equipment = [] } = useGetMyEquipmentQuery();
  return (
    <RHFSelect name="equipment" label={m.equipment()}>
      <SelectItem value={NO_EQUIPMENT}>{m.no_equipment()}</SelectItem>
      {equipment.map((item) => (
        <SelectItem key={item.equipmentId} value={String(item.equipmentId)}>
          {item.name}
        </SelectItem>
      ))}
    </RHFSelect>
  );
}
