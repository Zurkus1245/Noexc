import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, spacing } from '@noexcuse/ui';
import type { Workout } from '@noexcuse/contracts';
import { t } from '../../../shared/i18n';
import { ExerciseDetail } from './ExerciseDetail';

interface WorkoutCollapsibleProps {
  readonly workout: Workout;
}

// Collapsed by default so a long plan stays scannable; exercises appear on tap.
export function WorkoutCollapsible({ workout }: WorkoutCollapsibleProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.workout}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((value) => !value)}
      >
        <Text variant="label">{workout.title}</Text>
        <Text variant="caption" tone="muted">
          {expanded ? t('clientPlan.hideExercises') : t('clientPlan.showExercises')}
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
  workout: { gap: spacing.sm, paddingVertical: spacing.xs },
  exercises: { gap: spacing.md, paddingTop: spacing.sm },
});
