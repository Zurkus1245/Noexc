import { Tabs } from 'expo-router';
import { RoleGate } from '../../src/features/account/components/RoleGate';
import { t } from '../../src/shared/i18n';
import { useTabBarOptions } from '../../src/shared/theme/tab-bar';

export default function CoachLayout() {
  const tabBarOptions = useTabBarOptions();
  return (
    <RoleGate role="coach">
      <Tabs screenOptions={tabBarOptions}>
        <Tabs.Screen name="invite" options={{ title: t('tabs.invite') }} />
        <Tabs.Screen name="clients" options={{ title: t('tabs.clients') }} />
        <Tabs.Screen name="settings" options={{ title: t('tabs.settings') }} />
      </Tabs>
    </RoleGate>
  );
}
