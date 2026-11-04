import type { ReactNode } from 'react';
import {
  RefreshControl,
  ScrollView,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

interface ScreenProps {
  children: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Leaves room for the floating tab bar on the four top-level screens. */
  tabBar?: boolean;
}

export function Screen({
  children,
  onRefresh,
  refreshing = false,
  contentContainerStyle,
  tabBar = false,
}: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={[
        {
          paddingBottom: insets.bottom + (tabBar ? 108 : 36),
          flexGrow: 1,
        },
        contentContainerStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
            progressBackgroundColor={theme.surface}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}
