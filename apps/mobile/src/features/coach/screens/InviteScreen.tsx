import { Button, Screen, Text } from '@noexcuse/ui';
import { ApiErrorBanner } from '../../../shared/components/ApiErrorBanner';
import { t } from '../../../shared/i18n';
import { InviteCodeCard } from '../components/InviteCodeCard';
import { useCreateInvite } from '../hooks/useCoachActions';

export function InviteScreen() {
  const invite = useCreateInvite();
  const created = invite.data;

  return (
    <Screen scroll>
      <Text variant="title">{t('coach.inviteTitle')}</Text>
      {created === undefined ? <Text tone="muted">{t('coach.inviteHint')}</Text> : null}
      {created === undefined ? (
        <Button
          label={t('coach.createInvite')}
          loading={invite.isPending}
          onPress={() => invite.mutate()}
        />
      ) : (
        <>
          <InviteCodeCard code={created.code} expiresAt={created.expiresAt} />
          <Button label={t('coach.createAnother')} variant="secondary" onPress={() => invite.reset()} />
        </>
      )}
      {invite.isError ? (
        <ApiErrorBanner error={invite.error} onRetry={() => invite.mutate()} />
      ) : null}
    </Screen>
  );
}
