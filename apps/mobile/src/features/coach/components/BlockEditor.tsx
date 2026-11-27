import { Button, Text, colors, radii, spacing } from '@noexcuse/ui';
import { PLAN_LIMITS } from '@noexcuse/contracts';
import { useFieldArray } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { t } from '../../../shared/i18n';
import { newWorkout, type BlockPath, type PlanControl, type WorkoutPath } from '../lib/plan-form';
import { ValueField } from './ValueField';
import { WorkoutEditor } from './WorkoutEditor';

interface BlockEditorProps {
  readonly control: PlanControl;
  readonly path: BlockPath;
  readonly onRemove: () => void;
}

export function BlockEditor({ control, path, onRemove }: BlockEditorProps) {
  const workouts = useFieldArray({ control, name: `${path}.workouts` });
  const workoutLimitReached = workouts.fields.length >= PLAN_LIMITS.workoutsPerBlockMax;

  return (
    <View style={styles.card}>
      <Text variant="heading">{t('plan.blockHeading')}</Text>
      <ValueField control={control} name={`${path}.title`} label={t('plan.blockTitle')} />
      {workouts.fields.map((workout, index) => (
        <WorkoutEditor
          key={workout.id}
          control={control}
          path={`${path}.workouts.${index}` as WorkoutPath}
          onRemove={() => workouts.remove(index)}
        />
      ))}
      <Button
        label={t('plan.addWorkout')}
        variant="secondary"
        disabled={workoutLimitReached}
        onPress={() => workouts.append(newWorkout())}
      />
      <Button label={t('plan.remove')} variant="danger" onPress={onRemove} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, padding: spacing.md, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border },
});
