import { Button, Text, colors, radii, spacing } from '@noexcuse/ui';
import { PLAN_LIMITS } from '@noexcuse/contracts';
import { Controller, useFieldArray } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { t } from '../../../shared/i18n';
import { newExercise, type ExercisePath, type PlanControl, type WorkoutPath } from '../lib/plan-form';
import { ExerciseEditor } from './ExerciseEditor';
import { ValueField } from './ValueField';

interface WorkoutEditorProps {
  readonly control: PlanControl;
  readonly path: WorkoutPath;
  readonly onRemove: () => void;
}

export function WorkoutEditor({ control, path, onRemove }: WorkoutEditorProps) {
  const exercises = useFieldArray({ control, name: `${path}.exercises` });
  const exerciseLimitReached = exercises.fields.length >= PLAN_LIMITS.exercisesPerWorkoutMax;

  return (
    <View style={styles.card}>
      <ValueField control={control} name={`${path}.title`} label={t('plan.workoutTitle')} />
      {exercises.fields.map((exercise, index) => (
        <ExerciseEditor
          key={exercise.id}
          control={control}
          path={`${path}.exercises.${index}` as ExercisePath}
          onRemove={() => exercises.remove(index)}
        />
      ))}
      <Controller
        control={control}
        name={`${path}.exercises`}
        render={({ fieldState }) =>
          fieldState.error === undefined ? <View /> : <Text tone="danger">{t('plan.exercisesRequired')}</Text>
        }
      />
      <Button
        label={t('plan.addExercise')}
        variant="secondary"
        disabled={exerciseLimitReached}
        onPress={() => exercises.append(newExercise())}
      />
      <Button label={t('plan.remove')} variant="danger" onPress={onRemove} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.surface },
});
