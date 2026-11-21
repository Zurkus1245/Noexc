import { zodResolver } from '@hookform/resolvers/zod';
import {
  CONSENT_VERSIONS,
  REQUIRED_CONSENT_TYPES,
  RedeemInviteRequestSchema,
  type ConsentType,
  type RedeemInviteRequest,
} from '@noexcuse/contracts';
import { Button, Checkbox, Text, TextField, spacing } from '@noexcuse/ui';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { ApiErrorBanner } from '../../../shared/components/ApiErrorBanner';
import { t, type MessageKey } from '../../../shared/i18n';

// Order is fixed: the three required consents first, then the optional marketing consent.
const CONSENT_TYPES: readonly ConsentType[] = [...REQUIRED_CONSENT_TYPES, 'marketing'];

const CONSENT_LABEL_KEY = {
  tos: 'client.consent.tos',
  health_data: 'client.consent.health_data',
  coach_access: 'client.consent.coach_access',
  marketing: 'client.consent.marketing',
} as const satisfies Record<ConsentType, MessageKey>;

const DEFAULT_VALUES: RedeemInviteRequest = {
  code: '',
  consents: CONSENT_TYPES.map((type) => ({ type, version: CONSENT_VERSIONS[type], granted: false })),
};

interface RedeemFormProps {
  readonly pending: boolean;
  readonly error: unknown;
  readonly onSubmit: (body: RedeemInviteRequest) => void;
}

// Nothing is pre-checked: each consent is an explicit, separate decision. The schema blocks submit until the
// three required ones are granted at the current versions.
export function RedeemForm({ pending, error, onSubmit }: RedeemFormProps) {
  const form = useForm<RedeemInviteRequest>({
    resolver: zodResolver(RedeemInviteRequestSchema),
    defaultValues: DEFAULT_VALUES,
  });
  const consents = useFieldArray({ control: form.control, name: 'consents' });
  const submit = form.handleSubmit(onSubmit);
  const errors = form.formState.errors;

  return (
    <>
      <Controller
        control={form.control}
        name="code"
        render={({ field }) => (
          <TextField
            label={t('client.codeLabel')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            autoCapitalize="characters"
            autoCorrect={false}
            error={errors.code === undefined ? undefined : t('form.invalid')}
          />
        )}
      />

      <Text variant="label">{t('client.consentLegend')}</Text>
      <View style={styles.consents}>
        {consents.fields.map((item, index) => (
          <Controller
            key={item.id}
            control={form.control}
            name={`consents.${index}.granted`}
            render={({ field }) => (
              <View style={styles.consent}>
                <Checkbox
                  label={t(CONSENT_LABEL_KEY[item.type])}
                  checked={field.value}
                  onChange={field.onChange}
                />
                <Text variant="caption" tone="muted">
                  {t('client.consentVersion', { version: item.version })}
                </Text>
              </View>
            )}
          />
        ))}
      </View>
      {errors.consents === undefined ? null : <Text tone="danger">{t('client.consentRequired')}</Text>}

      {error ? <ApiErrorBanner error={error} onRetry={() => void submit()} /> : null}
      <Button label={t('client.redeem')} loading={pending} onPress={() => void submit()} />
    </>
  );
}

const styles = StyleSheet.create({
  consents: { gap: spacing.sm },
  consent: { gap: spacing.xs },
});
