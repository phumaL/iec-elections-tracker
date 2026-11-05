import { Tabs } from 'expo-router/js-tabs';

import { useTheme } from '@/theme';

/**
 * The visible tab bar is rendered by the root layout so it can stay on screen
 * for detail routes too. The navigator still owns the tab state.
 */
export default function TabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
        sceneStyle: {
          backgroundColor: theme.background,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Overview' }} />
      <Tabs.Screen name="areas" options={{ title: 'Areas' }} />
      <Tabs.Screen name="parties" options={{ title: 'Parties' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
