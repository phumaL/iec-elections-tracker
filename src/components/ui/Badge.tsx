import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

export type BadgeTone =
  | 'neutral'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'live';

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}

export function Badge({
  label,
  tone = 'neutral',
  icon,
  style,
  compact = false,
}: BadgeProps) {
  const theme = useTheme();

  const palette: Record<BadgeTone, { fg: string; bg: string; border: string }> = {
    neutral: {
      fg: theme.textMuted,
      bg: theme.surfaceAlt,
      border: theme.border,
    },
    primary: {
      fg: theme.primary,
      bg: theme.primarySoft,
      border: theme.primarySoft,
    },
    success: {
      fg: theme.success,
      bg: theme.successSoft,
      border: theme.successSoft,
    },
    warning: {
      fg: theme.warning,
      bg: theme.warningSoft,
      border: theme.warningSoft,
    },
    danger: {
      fg: theme.danger,
      bg: theme.dangerSoft,
      border: theme.dangerSoft,
    },
    live: {
      fg: theme.live,
      bg: theme.liveSoft,
      border: theme.liveSoft,
    },
  };

  const colors = palette[tone];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          paddingVertical: compact ? 3 : 5,
          paddingHorizontal: compact ? spacing.sm : spacing.md,
        },
        style,
      ]}
    >
      {icon}
      <Text
        style={[
          styles.label,
          { color: colors.fg, fontSize: compact ? 10 : 11 },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});
