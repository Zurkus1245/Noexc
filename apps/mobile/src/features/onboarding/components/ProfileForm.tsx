import { zodResolver } from '@hookform/resolvers/zod';
import { getCalendars } from 'expo-localization';
import { CreateProfileRequestSchema, type CreateProfileRequest, type Role } from '@noexcuse/contracts';
import { Button, Text, TextField, spacing } from '@noexcuse/ui';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { ApiErrorBanner } from '../../../shared/components/ApiErrorBanner';
import { t, type MessageKey } from '../../../shared/i18n';

const FALLBACK_TIMEZONE = 'UTC';

const deviceTimezone = (): string => getCalendars()[0]?.timeZone ?? FALLBACK_TIMEZONE;

const ROLE_OPTIONS: readonly { readonly role: Role; readonly labelKey: MessageKey }[] = [
  { role: 'coach', labelKey: 'onboarding.roleCoach' },
  { role: 'client', labelKey: 'onboarding.roleClient' },
];

interface ProfileFormProps {
  readonly pending: boolean;
  readonly error: unknown;
  readonly onSubmit: (body: CreateProfileRequest) => void;
}

export function ProfileForm({ pending, error, onSubmit }: ProfileFormProps) {
  const form = useForm<CreateProfileRequest>({
    resolver: zodResolver(CreateProfileRequestSchema),
    defaultValues: { role: 'client', displayName: '', timezone: deviceTimezone() },
  });
  const submit = form.handleSubmit(onSubmit);
  const selectedRole = form.watch('role');
  const errors = form.formState.errors;

  return (
    <>
      <Text variant="label">{t('onboarding.role')}</Text>
      <View style={styles.row}>
        {ROLE_OPTIONS.map((option) => (
          <View key={option.role} style={styles.cell}>
            <Button
              label={t(option.labelKey)}
              variant={selectedRole === option.role ? 'primary' : 'secondary'}
              onPress={() => form.setValue('role', option.role)}
            />
          </View>
        ))}
      </View>
      <Controller
        control={form.control}
        name="displayName"
        render={({ field }) => (
          <TextField
            label={t('onboarding.displayName')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.displayName === undefined ? undefined : t('form.invalid')}
          />
        )}
      />
      <Controller
        control={form.control}
        name="timezone"
        render={({ field }) => (
          <TextField
            label={t('onboarding.timezone')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.timezone === undefined ? undefined : t('form.invalid')}
          />
        )}
      />
      {error ? <ApiErrorBanner error={error} onRetry={() => void submit()} /> : null}
      <Button label={t('common.submit')} loading={pending} onPress={() => void submit()} />
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  cell: { flex: 1 },
});
