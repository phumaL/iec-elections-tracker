import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatPercent } from '@/lib/format';
import { spacing, useTheme } from '@/theme';
import type { PartyMeta } from '@/types/iec';
import { PartyLogo } from './PartyLogo';
import { ProgressBar } from './ProgressBar';

interface AreaRowProps {
  title: string;
  subtitle?: string;
  leadingMeta?: PartyMeta | null;
  leadingSupport?: number | null;
  percent: number;
  onPress?: () => void;
  rightHint?: string;
}

export function AreaRow({
  title,
  subtitle,
  leadingMeta,
  leadingSupport,
  percent,
  onPress,
  rightHint,
}: AreaRowProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${title}${subtitle ? `, ${subtitle}` : ''}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderColor: theme.border },
        pressed && onPress ? { opacity: 0.7 } : null,
      ]}
    >
      {leadingMeta ? <PartyLogo meta={leadingMeta} size={30} /> : null}
      <View style={styles.body}>
        <View style={styles.topLine}>
          <View style={styles.titleGroup}>
            <Text numberOfLines={1} style={[styles.title, { color: theme.text }]}>
              {title}
            </Text>
            {subtitle ? (
              <Text
                numberOfLines={1}
                style={[styles.subtitle, { color: theme.textMuted }]}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
          <View style={styles.right}>
            <Text style={[styles.percent, { color: theme.text }]}>
              {formatPercent(percent, 0)}
            </Text>
            <Text style={[styles.percentLabel, { color: theme.textFaint }]}>
              counted
            </Text>
          </View>
        </View>
        <View style={styles.barRow}>
          <ProgressBar
            value={percent}
            color={leadingMeta?.color ?? theme.primary}
            height={4}
            style={styles.bar}
          />
          {leadingMeta && leadingSupport != null ? (
            <Text
              numberOfLines={1}
              style={[styles.leading, { color: theme.textMuted }]}
            >
              {leadingMeta.abbr} {formatPercent(leadingSupport, 1)}
            </Text>
          ) : rightHint ? (
            <Text style={[styles.leading, { color: theme.textFaint }]}>
              {rightHint}
            </Text>
          ) : null}
        </View>
      </View>
      {onPress ? (
        <Ionicons name="chevron-forward" size={16} color={theme.textFaint} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  body: {
    flex: 1,
    gap: 6,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  titleGroup: {
    flex: 1,
    gap: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  right: {
    alignItems: 'flex-end',
  },
  percent: {
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  percentLabel: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bar: {
    flex: 1,
  },
  leading: {
    maxWidth: '48%',
    fontSize: 10,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
