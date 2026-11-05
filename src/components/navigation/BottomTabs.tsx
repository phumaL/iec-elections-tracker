import Ionicons from '@expo/vector-icons/Ionicons';
import { usePathname, useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing, useTheme } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

interface TabItem {
  href: '/' | '/areas' | '/parties' | '/settings';
  title: string;
  icon: IconName;
  activeIcon: IconName;
  isActive: (pathname: string) => boolean;
}

const TABS: readonly TabItem[] = [
  {
    href: '/',
    title: 'Overview',
    icon: 'home-outline',
    activeIcon: 'home',
    isActive: (pathname) => pathname === '/' || pathname === '/index',
  },
  {
    href: '/areas',
    title: 'Areas',
    icon: 'map-outline',
    activeIcon: 'map',
    isActive: (pathname) =>
      pathname.startsWith('/areas') ||
      pathname.startsWith('/province') ||
      pathname.startsWith('/municipality'),
  },
  {
    href: '/parties',
    title: 'Parties',
    icon: 'flag-outline',
    activeIcon: 'flag',
    isActive: (pathname) =>
      pathname.startsWith('/parties') || pathname.startsWith('/party'),
  },
  {
    href: '/settings',
    title: 'Settings',
    icon: 'settings-outline',
    activeIcon: 'settings',
    isActive: (pathname) => pathname.startsWith('/settings'),
  },
];

/**
 * The tab bar lives outside the root stack so it stays visible on every
 * screen, including province, municipality and party detail pages.
 */
export function BottomTabs() {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bar,
        {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          height: 58 + insets.bottom,
          paddingTop: spacing.xs,
          paddingBottom: insets.bottom + spacing.xs,
        },
      ]}
    >
      {TABS.map((tab) => {
        const active = tab.isActive(pathname);
        const color = active ? theme.primary : theme.tabInactive;

        return (
          <Pressable
            key={tab.href}
            accessibilityRole="tab"
            accessibilityLabel={tab.title}
            accessibilityState={{ selected: active }}
            onPress={() => router.navigate(tab.href)}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          >
            <Ionicons
              name={active ? tab.activeIcon : tab.icon}
              size={24}
              color={color}
            />
            <Text style={[styles.label, { color }]}>{tab.title}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  pressed: {
    opacity: 0.65,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
    marginTop: 2,
  },
});
