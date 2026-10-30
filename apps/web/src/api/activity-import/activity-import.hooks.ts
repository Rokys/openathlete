import { eventKeys } from '@/api/event/event.keys';
import { metricKeys } from '@/api/metric/metric.keys';
import { trainingLoadKeys } from '@/api/training-load/training-load.keys';
import {
  QueryClient,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import { ImportedActivityDto, SPORT_TYPE } from '@openathlete/shared';

import { ActivityImportAPI } from './activity-import.api';

const refreshImported = (
  queryClient: QueryClient,
  result: ImportedActivityDto,
) =>
  Promise.allSettled([
    queryClient.invalidateQueries({ queryKey: [eventKeys.getMyEvents] }),
    queryClient.invalidateQueries({
      queryKey: [eventKeys.getEventStream, result.eventId],
    }),
    queryClient.invalidateQueries({
      queryKey: [trainingLoadKeys.getWeeklyLoadSummary],
    }),
    // The import records the day's maximum heart rate among the metrics
    queryClient.invalidateQueries({ queryKey: [metricKeys.getMetrics] }),
    queryClient.invalidateQueries({ queryKey: [metricKeys.getLatestMetrics] }),
    queryClient.invalidateQueries({ queryKey: [metricKeys.getMetricHistory] }),
  ]);

export function useImportFitMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, name }: { file: File; name: string }) =>
      ActivityImportAPI.importFit(file, name),
    onSuccess: (result) => refreshImported(queryClient, result),
  });
}

export function useImportGpxMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      file,
      name,
      sport,
    }: {
      file: File;
      name: string;
      sport?: SPORT_TYPE;
    }) => ActivityImportAPI.importGpx(file, name, sport),
    onSuccess: (result) => refreshImported(queryClient, result),
  });
}

export function useImportTcxMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      file,
      name,
      sport,
    }: {
      file: File;
      name: string;
      sport?: SPORT_TYPE;
    }) => ActivityImportAPI.importTcx(file, name, sport),
    onSuccess: (result) => refreshImported(queryClient, result),
  });
}
