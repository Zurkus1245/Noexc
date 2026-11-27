import { Tabs } from 'expo-router';
import { RoleGate } from '../../src/features/account/components/RoleGate';
import { t } from '../../src/shared/i18n';
import { useTabBarOptions } from '../../src/shared/theme/tab-bar';

export default function ClientLayout() {
  const tabBarOptions = useTabBarOptions();
  return (
    <RoleGate role="client">
      <Tabs screenOptions={tabBarOptions}>
        <Tabs.Screen name="links" options={{ title: t('tabs.links') }} />
        <Tabs.Screen name="plan" options={{ title: t('tabs.plan') }} />
        <Tabs.Screen name="calendar" options={{ title: t('tabs.calendar') }} />
        <Tabs.Screen name="redeem" options={{ title: t('tabs.redeem') }} />
        <Tabs.Screen name="settings" options={{ title: t('tabs.settings') }} />
      </Tabs>
    </RoleGate>
  );
}
