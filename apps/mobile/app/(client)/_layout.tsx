import { Tabs } from 'expo-router';
import { RoleGate } from '../../src/features/account/components/RoleGate';
import { t } from '../../src/shared/i18n';

export default function ClientLayout() {
  return (
    <RoleGate role="client">
      <Tabs screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="links" options={{ title: t('tabs.links') }} />
        <Tabs.Screen name="redeem" options={{ title: t('tabs.redeem') }} />
        <Tabs.Screen name="settings" options={{ title: t('tabs.settings') }} />
      </Tabs>
    </RoleGate>
  );
}
