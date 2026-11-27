import { borders, colors, radii, tabBar, typography } from '@noexcuse/ui';
import type { BottomTabNavigationOptions } from 'expo-router/tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Floating capsule tab bar shared by the client and coach navigators. It stays in layout flow, so screens need no
// extra bottom padding; the safe-area inset becomes the gap under the capsule instead of padding inside it.
export function useTabBarOptions(): BottomTabNavigationOptions {
  const { bottom } = useSafeAreaInsets();
  return {
    headerShown: false,
    tabBarActiveTintColor: colors.text,
    tabBarInactiveTintColor: colors.textMuted,
    tabBarLabelStyle: { fontSize: typography.caption.fontSize, fontWeight: typography.label.fontWeight },
    tabBarStyle: {
      height: tabBar.height,
      paddingBottom: 0,
      marginHorizontal: tabBar.inset,
      marginBottom: bottom + tabBar.inset,
      borderRadius: radii.full,
      borderTopWidth: borders.hairline,
      borderWidth: borders.hairline,
      borderColor: colors.divider,
      backgroundColor: colors.surface,
    },
    tabBarItemStyle: { borderRadius: radii.full },
    tabBarActiveBackgroundColor: colors.surfaceRaised,
  };
}
