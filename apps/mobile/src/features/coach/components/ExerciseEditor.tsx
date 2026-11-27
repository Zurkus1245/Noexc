import { Button, spacing } from '@noexcuse/ui';
import { StyleSheet, View } from 'react-native';
import { t } from '../../../shared/i18n';
import type { ExercisePath, PlanControl } from '../lib/plan-form';
import { ValueField } from './ValueField';

interface ExerciseEditorProps {
  readonly control: PlanControl;
  readonly path: ExercisePath;
  readonly onRemove: () => void;
}

export function ExerciseEditor({ control, path, onRemove }: ExerciseEditorProps) {
  return (
    <View style={styles.card}>
      <ValueField control={control} name={`${path}.name`} label={t('plan.exerciseName')} />
      <View style={styles.row}>
        <View style={styles.cell}>
          <ValueField control={control} name={`${path}.sets`} label={t('plan.sets')} keyboardType="number-pad" />
        </View>
        <View style={styles.cell}>
          <ValueField control={control} name={`${path}.repsMin`} label={t('plan.repsMin')} keyboardType="number-pad" />
        </View>
        <View style={styles.cell}>
          <ValueField control={control} name={`${path}.repsMax`} label={t('plan.repsMax')} keyboardType="number-pad" />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.cell}>
          <ValueField control={control} name={`${path}.weightKg`} label={t('plan.weightKg')} keyboardType="decimal-pad" />
        </View>
        <View style={styles.cell}>
          <ValueField control={control} name={`${path}.restSec`} label={t('plan.restSec')} keyboardType="number-pad" />
        </View>
      </View>
      <ValueField control={control} name={`${path}.note`} label={t('plan.note')} />
      <Button label={t('plan.remove')} variant="danger" onPress={onRemove} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  cell: { flex: 1 },
});
