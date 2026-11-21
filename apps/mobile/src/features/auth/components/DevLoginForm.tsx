import { zodResolver } from '@hookform/resolvers/zod';
import { LocalTokenRequestSchema, type LocalTokenRequest } from '@noexcuse/contracts';
import { Button, TextField } from '@noexcuse/ui';
import { Controller, useForm } from 'react-hook-form';
import { ApiErrorBanner } from '../../../shared/components/ApiErrorBanner';
import { t } from '../../../shared/i18n';
import { useDevLogin } from '../hooks/useDevLogin';

// Dev builds with the local issuer only: rendered by SignInScreen when isDevLoginEnabled() holds.
export function DevLoginForm() {
  const login = useDevLogin();
  const form = useForm<LocalTokenRequest>({
    resolver: zodResolver(LocalTokenRequestSchema),
    defaultValues: { subject: '' },
  });
  const submit = form.handleSubmit(({ subject }) => login.mutate(subject));

  return (
    <>
      <Controller
        control={form.control}
        name="subject"
        render={({ field }) => (
          <TextField
            label={t('auth.devLoginSubject')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            autoCapitalize="none"
            autoCorrect={false}
            error={form.formState.errors.subject === undefined ? undefined : t('form.invalid')}
          />
        )}
      />
      {login.isError ? <ApiErrorBanner error={login.error} onRetry={() => void submit()} /> : null}
      <Button label={t('auth.devLoginSubmit')} loading={login.isPending} onPress={() => void submit()} />
    </>
  );
}
