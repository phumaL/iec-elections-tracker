import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { spacing, useTheme } from '@/theme';

interface StatTileProps {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  valueColor?: string;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}

export function StatTile({
  label,
  value,
  hint,
  icon,
  valueColor,
  style,
  compact = false,
}: StatTileProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.tile,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          padding: compact ? spacing.md : spacing.lg,
        },
        style,
      ]}
    >
      <View style={styles.labelRow}>
        {icon}
        <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
      </View>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[
          styles.value,
          { color: valueColor ?? theme.text, fontSize: compact ? 20 : 24 },
        ]}
      >
        {value}
      </Text>
      {hint ? (
        <Text style={[styles.hint, { color: theme.textFaint }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  value: {
    fontWeight: '800',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  hint: {
    fontSize: 11,
    fontWeight: '500',
  },
});
