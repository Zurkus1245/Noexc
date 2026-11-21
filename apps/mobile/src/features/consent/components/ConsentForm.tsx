import { CONSENT_VERSIONS, type ConsentType, type GrantConsentRequest, type Role } from '@noexcuse/contracts';
import { Button, Checkbox, Screen, Text, spacing } from '@noexcuse/ui';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ApiErrorBanner } from '../../../shared/components/ApiErrorBanner';
import { t } from '../../../shared/i18n';
import { useGrantConsents } from '../hooks/useConsentActions';
import { CONSENT_LABEL_KEY } from '../lib/consent-labels';
import { requiredConsentTypes } from '../lib/required-consents';

const OPTIONAL_CONSENT: ConsentType = 'marketing';

const toGrant = (type: ConsentType): GrantConsentRequest => ({
  type,
  version: CONSENT_VERSIONS[type],
  granted: true,
});

interface ConsentFormProps {
  readonly role: Role;
}

// Nothing is pre-checked: each consent is an explicit decision. Continue stays blocked until the mandatory ones
// are checked; only checked consents are sent, each at the current version.
export function ConsentForm({ role }: ConsentFormProps) {
  const required = requiredConsentTypes(role);
  const [checked, setChecked] = useState<Partial<Record<ConsentType, boolean>>>({});
  const grant = useGrantConsents();
  const canContinue = required.every((type) => checked[type] === true);

  const submit = () => {
    const granted = [...required, ...(checked[OPTIONAL_CONSENT] === true ? [OPTIONAL_CONSENT] : [])];
    grant.mutate(granted.map(toGrant));
  };

  return (
    <Screen scroll>
      <Text variant="title">{t('consent.title')}</Text>
      <Text tone="muted">{t('consent.body')}</Text>
      {[...required, OPTIONAL_CONSENT].map((type) => (
        <View key={type} style={styles.consent}>
          <Checkbox
            label={t(CONSENT_LABEL_KEY[type])}
            checked={checked[type] === true}
            onChange={(value) => setChecked((previous) => ({ ...previous, [type]: value }))}
          />
          <Text variant="caption" tone="muted">
            {t('client.consentVersion', { version: CONSENT_VERSIONS[type] })}
          </Text>
        </View>
      ))}
      {canContinue ? null : <Text tone="muted">{t('consent.requiredHint')}</Text>}
      {grant.isError ? <ApiErrorBanner error={grant.error} onRetry={submit} /> : null}
      <Button label={t('common.submit')} disabled={!canContinue} loading={grant.isPending} onPress={submit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  consent: { gap: spacing.xs },
});
