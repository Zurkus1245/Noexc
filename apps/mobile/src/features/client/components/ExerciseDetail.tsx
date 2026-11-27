import { StyleSheet, View } from 'react-native';
import { Text, spacing } from '@noexcuse/ui';
import type { Exercise } from '@noexcuse/contracts';
import { t } from '../../../shared/i18n';

interface ExerciseDetailProps {
  readonly exercise: Exercise;
}

// Read-only exercise row shared by the calendar and the plan; optional fields are shown only when set.
export function ExerciseDetail({ exercise }: ExerciseDetailProps) {
  const meta = [
    exercise.weightKg === null ? null : t('clientCalendar.weight', { value: String(exercise.weightKg) }),
    exercise.restSec === null ? null : t('clientCalendar.rest', { seconds: String(exercise.restSec) }),
  ].filter((part): part is string => part !== null);

  return (
    <View style={styles.exercise}>
      <Text variant="label">{exercise.name}</Text>
      <Text variant="caption" tone="muted">
        {t('clientCalendar.setsReps', {
          sets: String(exercise.sets),
          repsMin: String(exercise.repsMin),
          repsMax: String(exercise.repsMax),
        })}
      </Text>
      {meta.length === 0 ? null : <Text variant="caption" tone="muted">{meta.join(' · ')}</Text>}
      {exercise.note === null ? null : (
        <Text variant="caption">{t('clientCalendar.note', { note: exercise.note })}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  exercise: { gap: spacing.xs },
});
