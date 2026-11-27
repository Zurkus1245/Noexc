import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Button, ErrorBanner, Text, spacing } from '@noexcuse/ui';
import { PLAN_LIMITS, type Plan } from '@noexcuse/contracts';
import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { ApiErrorBanner } from '../../../shared/components/ApiErrorBanner';
import { isVersionConflictError } from '../../../shared/api/api-error';
import { t } from '../../../shared/i18n';
import { usePutPlan } from '../hooks/useCoachPlan';
import {
  PlanFormSchema,
  fromPlan,
  newBlock,
  type BlockPath,
  type PlanFormOutput,
  type PlanFormValues,
} from '../lib/plan-form';
import { BlockEditor } from './BlockEditor';

interface PlanEditorProps {
  readonly clientId: string;
  readonly plan: Plan;
  readonly onReload: () => void;
}

// The loaded plan is the form baseline: a save or a reload replaces the prop and the form restarts from it.
export function PlanEditor({ clientId, plan, onReload }: PlanEditorProps) {
  const router = useRouter();
  const save = usePutPlan(clientId);
  const [showCheckFields, setShowCheckFields] = useState(false);
  const form = useForm<PlanFormValues, unknown, PlanFormOutput>({
    resolver: zodResolver(PlanFormSchema),
    defaultValues: fromPlan(plan),
  });
  const { reset } = form;
  const { isDirty } = form.formState;
  const blocks = useFieldArray({ control: form.control, name: 'content.blocks' });
  const blockLimitReached = blocks.fields.length >= PLAN_LIMITS.blocksMax;
  const isSaved = save.isSuccess && !isDirty;
  const hasWorkouts = plan.content.blocks.some((block) => block.workouts.length > 0);

  // Keyed by version: a refetch with the same version must not wipe the user's unsaved edits.
  useEffect(() => {
    reset(fromPlan(plan));
  }, [plan.version, reset]);

  const submit = form.handleSubmit(
    (body) => {
      setShowCheckFields(false);
      save.mutate(body);
    },
    () => setShowCheckFields(true),
  );

  const reload = () => {
    save.reset();
    onReload();
  };

  return (
    <>
      {showCheckFields ? <ErrorBanner message={t('plan.checkFields')} /> : null}
      {save.isError ? <ApiErrorBanner error={save.error} /> : null}
      {save.isError && isVersionConflictError(save.error) ? (
        <Button label={t('plan.reload')} variant="secondary" onPress={reload} />
      ) : null}
      {blocks.fields.length === 0 ? <Text tone="muted">{t('plan.empty')}</Text> : null}
      {blocks.fields.map((block, index) => (
        <BlockEditor
          key={block.id}
          control={form.control}
          path={`content.blocks.${index}` as BlockPath}
          onRemove={() => blocks.remove(index)}
        />
      ))}
      <View style={styles.actions}>
        <Button
          label={t('plan.addBlock')}
          variant="secondary"
          disabled={blockLimitReached}
          onPress={() => blocks.append(newBlock())}
        />
        <Button
          label={t('plan.save')}
          loading={save.isPending}
          disabled={!isDirty}
          onPress={() => void submit()}
        />
        {isSaved ? (
          <Text variant="label" accessibilityLiveRegion="polite">
            {t('plan.saved', { version: String(plan.version) })}
          </Text>
        ) : null}
        {isSaved && hasWorkouts ? (
          <>
            <Text tone="muted">{t('plan.assignHint')}</Text>
            <Button
              label={t('plan.assignToCalendar')}
              variant="secondary"
              onPress={() => router.push({ pathname: '/clients/[clientId]/calendar', params: { clientId } })}
            />
          </>
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm },
});
