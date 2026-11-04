import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padded?: boolean;
  accessibilityLabel?: string;
}

export function Card({
  children,
  style,
  onPress,
  padded = true,
  accessibilityLabel,
}: CardProps) {
  const theme = useTheme();
  const base = [
    styles.card,
    {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      shadowColor: theme.isDark ? '#000000' : '#15306B',
    },
    padded && { padding: spacing.lg },
    style,
  ] as StyleProp<ViewStyle>;

  if (!onPress) return <View style={base}>{children}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [base, pressed && { opacity: 0.82 }]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 2,
  },
});
