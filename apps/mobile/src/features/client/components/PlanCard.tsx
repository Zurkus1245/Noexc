import { StyleSheet, View } from 'react-native';
import { Text, colors, radii, spacing } from '@noexcuse/ui';
import type { Plan } from '@noexcuse/contracts';
import { t } from '../../../shared/i18n';
import { WorkoutCollapsible } from './WorkoutCollapsible';

interface PlanCardProps {
  readonly plan: Plan;
  readonly coachName: string | undefined;
}

export function PlanCard({ plan, coachName }: PlanCardProps) {
  const planTitle = t('clientPlan.planTitle', { version: String(plan.version) });
  const title = coachName === undefined ? planTitle : t('clientPlan.titleWithCoach', { coach: coachName, plan: planTitle });
  const { blocks } = plan.content;

  return (
    <View style={styles.card}>
      <Text variant="heading">{title}</Text>
      {blocks.length === 0 ? <Text tone="muted">{t('clientPlan.empty')}</Text> : null}
      {blocks.map((block) => (
        <View key={block.key} style={styles.block}>
          <Text variant="label" tone="muted">{block.title}</Text>
          {block.workouts.map((workout) => (
            <WorkoutCollapsible key={workout.key} workout={workout} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  block: { gap: spacing.sm },
});
