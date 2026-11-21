import { Alert } from 'react-native';
import { CONSENT_VERSIONS, type ConsentType, type Role } from '@noexcuse/contracts';
import { hasValidConsent } from '@noexcuse/domain';
import { Checkbox, Text } from '@noexcuse/ui';
import { ApiErrorBanner } from '../../../shared/components/ApiErrorBanner';
import { t } from '../../../shared/i18n';
import { useConsents, useGrantConsents } from '../hooks/useConsentActions';
import { CONSENT_LABEL_KEY } from '../lib/consent-labels';

// Coaches grant nothing about coach access, so the toggle is offered to clients only.
const reviewableConsents = (role: Role): readonly ConsentType[] =>
  role === 'client' ? ['coach_access', 'marketing'] : ['marketing'];

interface ConsentSettingsProps {
  readonly role: Role;
}

export function ConsentSettings({ role }: ConsentSettingsProps) {
  const consents = useConsents(true);
  const grant = useGrantConsents();

  const change = (type: ConsentType, granted: boolean) => {
    const request = { type, version: CONSENT_VERSIONS[type], granted };
    if (type !== 'coach_access' || granted) {
      grant.mutate([request]);
      return;
    }
    Alert.alert(t('settings.withdrawCoachTitle'), t('settings.withdrawCoachBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.withdraw'), style: 'destructive', onPress: () => grant.mutate([request]) },
    ]);
  };

  if (consents.isError) return <ApiErrorBanner error={consents.error} onRetry={() => void consents.refetch()} />;
  const records = consents.data;
  if (records === undefined) return <Text tone="muted">{t('common.loading')}</Text>;

  return (
    <>
      <Text variant="label">{t('client.consentLegend')}</Text>
      {reviewableConsents(role).map((type) => (
        <Checkbox
          key={type}
          label={t(CONSENT_LABEL_KEY[type])}
          checked={hasValidConsent(records, type)}
          disabled={grant.isPending}
          onChange={(granted) => change(type, granted)}
        />
      ))}
      {grant.isError ? <ApiErrorBanner error={grant.error} /> : null}
    </>
  );
}
