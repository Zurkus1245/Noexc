import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, colors, radii, spacing } from '@noexcuse/ui';
import type { CalendarEntry } from '@noexcuse/contracts';
import { t } from '../../../shared/i18n';
import { ExerciseDetail } from './ExerciseDetail';

interface CalendarEntryCardProps {
  readonly entry: CalendarEntry;
}

// Read-only: the workout is shown as stored in the plan; the exercises expand on tap.
export function CalendarEntryCard({ entry }: CalendarEntryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { workout } = entry;
  const coachLabel = entry.coachId === null ? t('clientCalendar.coachUnavailable') : t('clientCalendar.fromCoach');

  const summary = (
    <View style={styles.summary}>
      <Text variant="heading">{workout?.title ?? t('clientCalendar.workoutUnavailable')}</Text>
      {entry.blockTitle === null ? null : <Text variant="caption" tone="muted">{entry.blockTitle}</Text>}
      <Text variant="caption" tone="muted">{coachLabel}</Text>
    </View>
  );

  if (workout === null) return <View style={styles.card}>{summary}</View>;

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((value) => !value)}
      >
        {summary}
        <Text variant="label" tone="muted">
          {expanded ? t('clientCalendar.hideExercises') : t('clientCalendar.showExercises')}
        </Text>
      </Pressable>
      {expanded ? (
        <View style={styles.exercises}>
          {workout.exercises.map((exercise) => (
            <ExerciseDetail key={exercise.key} exercise={exercise} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  summary: { gap: spacing.xs },
  exercises: { gap: spacing.md, paddingTop: spacing.sm },
});
