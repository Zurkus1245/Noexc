import { Button, Text, spacing } from '@noexcuse/ui';
import type { LocalDate } from '@noexcuse/contracts';
import { randomUUID } from 'expo-crypto';
import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { ApiErrorBanner } from '../../../shared/components/ApiErrorBanner';
import { t } from '../../../shared/i18n';
import { useCreateCalendarEntry } from '../hooks/useCoachCalendar';
import { useCoachPlan } from '../hooks/useCoachPlan';

interface WorkoutPickerProps {
  readonly clientId: string;
  readonly date: LocalDate;
  readonly onDone: () => void;
}

interface PendingPick {
  readonly workoutKey: string;
  readonly entryId: string;
}

export function WorkoutPicker({ clientId, date, onDone }: WorkoutPickerProps) {
  const pending = useRef<PendingPick | null>(null);
  const plan = useCoachPlan(clientId);
  const create = useCreateCalendarEntry(clientId);
  const workouts = plan.data?.content.blocks.flatMap((block) =>
    block.workouts.map((workout) => ({ key: workout.key, label: `${block.title} · ${workout.title}` })),
  );

  // A retry of the same workout keeps its id; picking another workout starts a new assignment with a new id.
  const entryIdFor = (workoutKey: string): string => {
    const current = pending.current;
    if (current?.workoutKey === workoutKey) return current.entryId;
    const next = { workoutKey, entryId: randomUUID() };
    pending.current = next;
    return next.entryId;
  };

  const assign = (workoutKey: string) =>
    create.mutate({ id: entryIdFor(workoutKey), date, workoutKey }, { onSuccess: onDone });

  return (
    <View style={styles.panel}>
      <Text variant="label">{t('coachCalendar.pickWorkout')}</Text>
      {plan.isError ? <ApiErrorBanner error={plan.error} onRetry={() => void plan.refetch()} /> : null}
      {create.isError ? <ApiErrorBanner error={create.error} /> : null}
      {workouts?.length === 0 ? <Text tone="muted">{t('coachCalendar.noWorkouts')}</Text> : null}
      {workouts?.map((workout) => (
        <Button
          key={workout.key}
          label={workout.label}
          variant="secondary"
          loading={create.isPending && create.variables?.workoutKey === workout.key}
          disabled={create.isPending}
          onPress={() => assign(workout.key)}
        />
      ))}
      <Button label={t('common.cancel')} variant="secondary" onPress={onDone} />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: spacing.sm },
});
