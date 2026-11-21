import { Alert } from 'react-native';
import { Button, ErrorBanner, Screen, Text } from '@noexcuse/ui';
import { ApiErrorBanner } from '../../../shared/components/ApiErrorBanner';
import { t } from '../../../shared/i18n';
import { ConsentSettings } from '../../consent/components/ConsentSettings';
import { useMe } from '../hooks/useMe';
import { useDeleteAccount, useExportData, useShareExport, useSignOut } from '../hooks/useAccountActions';

const EXPORT_INDENT = 2;

export function SettingsScreen() {
  const role = useMe(true).data?.role;
  const exportData = useExportData();
  const shareExport = useShareExport();
  const deleteAccount = useDeleteAccount();
  const signOut = useSignOut();
  const exportedJson = exportData.data === undefined ? null : JSON.stringify(exportData.data, null, EXPORT_INDENT);

  const confirmDelete = () => {
    Alert.alert(t('account.deleteTitle'), t('account.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteAccount.mutate() },
    ]);
  };

  return (
    <Screen scroll>
      <Text variant="title">{t('account.settingsTitle')}</Text>

      <Text tone="muted">{t('account.exportHint')}</Text>
      <Button
        label={t('account.exportData')}
        variant="secondary"
        loading={exportData.isPending}
        onPress={() => exportData.mutate()}
      />
      {exportData.isError ? (
        <ApiErrorBanner error={exportData.error} onRetry={() => exportData.mutate()} />
      ) : null}
      {exportedJson === null ? null : (
        <>
          <Text variant="caption" selectable>
            {exportedJson}
          </Text>
          <Button label={t('common.share')} variant="secondary" onPress={() => shareExport.mutate(exportedJson)} />
          {shareExport.isError ? <ErrorBanner message={t('account.shareFailed')} /> : null}
        </>
      )}

      {role === 'coach' || role === 'client' ? <ConsentSettings role={role} /> : null}

      <Button label={t('common.signOut')} variant="secondary" loading={signOut.isPending} onPress={() => signOut.mutate()} />

      <Button label={t('account.deleteAccount')} variant="danger" loading={deleteAccount.isPending} onPress={confirmDelete} />
      {deleteAccount.isError ? (
        <ApiErrorBanner error={deleteAccount.error} onRetry={() => deleteAccount.mutate()} />
      ) : null}
    </Screen>
  );
}
