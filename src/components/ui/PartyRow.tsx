import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  formatCompact,
  formatPercent,
  formatSignedPercent,
} from '@/lib/format';
import {
  partyCouncils,
  partySeats,
  partySupport,
  partyVotes,
} from '@/lib/derive';
import { spacing, useTheme } from '@/theme';
import type { PartyMeta, PartyResult } from '@/types/iec';
import { PartyLogo } from './PartyLogo';
import { ProgressBar } from './ProgressBar';

interface PartyRowProps {
  party: PartyResult;
  meta: PartyMeta;
  rank?: number;
  maxSupport?: number;
  delta?: number | null;
  onPress?: () => void;
  showSeats?: boolean;
  showCouncils?: boolean;
  barColor?: string;
}

export function PartyRow({
  party,
  meta,
  rank,
  maxSupport,
  delta,
  onPress,
  showSeats = true,
  showCouncils = false,
  barColor,
}: PartyRowProps) {
  const theme = useTheme();
  const support = partySupport(party);
  const votes = partyVotes(party);
  const seats = partySeats(party);
  const councils = partyCouncils(party);
  const relative = maxSupport && maxSupport > 0 ? (support / maxSupport) * 100 : support;

  const details = [
    votes > 0 ? `${formatCompact(votes)} votes` : null,
    showSeats && seats > 0 ? `${formatCompact(seats)} seats` : null,
    showCouncils && councils > 0 ? `${formatCompact(councils)} councils` : null,
  ].filter(Boolean);

  const content = (
    <>
      {rank != null ? (
        <Text style={[styles.rank, { color: theme.textFaint }]}>{rank}</Text>
      ) : null}
      <PartyLogo meta={meta} size={36} />
      <View style={styles.body}>
        <View style={styles.topLine}>
          <Text numberOfLines={1} style={[styles.abbr, { color: theme.text }]}>
            {meta.abbr}
          </Text>
          <View style={styles.valueGroup}>
            <Text style={[styles.support, { color: theme.text }]}>
              {formatPercent(support, 1)}
            </Text>
            {delta != null && Math.abs(delta) >= 0.05 ? (
              <Text
                style={[
                  styles.delta,
                  { color: delta >= 0 ? theme.success : theme.danger },
                ]}
              >
                {formatSignedPercent(delta, 1)}
              </Text>
            ) : null}
          </View>
        </View>
        <ProgressBar
          value={relative}
          color={barColor ?? meta.color}
          height={5}
          style={styles.bar}
        />
        <View style={styles.bottomLine}>
          <Text numberOfLines={1} style={[styles.name, { color: theme.textMuted }]}>
            {meta.name}
          </Text>
          {details.length > 0 ? (
            <Text style={[styles.details, { color: theme.textFaint }]}>
              {details.join(' · ')}
            </Text>
          ) : null}
        </View>
      </View>
    </>
  );

  if (!onPress) return <View style={styles.row}>{content}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${meta.name}, ${formatPercent(support, 1)} support`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.72 }]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  rank: {
    width: 16,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  body: {
    flex: 1,
    gap: 5,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  abbr: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  valueGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  support: {
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  delta: {
    fontSize: 11,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  bar: {
    marginTop: 1,
  },
  bottomLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  name: {
    flex: 1,
    fontSize: 11,
  },
  details: {
    fontSize: 10,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
