import { StyleSheet, Text, View } from 'react-native';

import { formatPercent } from '@/lib/format';
import { useTheme } from '@/theme';
import type { HistoryPoint } from '@/types/iec';

interface HistoryBarsProps {
  data: HistoryPoint[];
  current?: HistoryPoint | null;
  color: string;
  height?: number;
}

export function HistoryBars({
  data,
  current,
  color,
  height = 132,
}: HistoryBarsProps) {
  const theme = useTheme();
  const points = [...data, ...(current ? [current] : [])];
  const max = Math.max(...points.map((point) => point.value), 1);

  if (points.length === 0) return null;

  return (
    <View>
      <View style={[styles.chart, { height }]}>
        {points.map((point) => {
          const isCurrent = current?.year === point.year;
          const barHeight = Math.max(
            point.value > 0 ? 4 : 0,
            Math.round((point.value / max) * (height - 30)),
          );

          return (
            <View key={point.year} style={styles.column}>
              <Text
                numberOfLines={1}
                style={[
                  styles.value,
                  {
                    color: isCurrent ? theme.text : theme.textFaint,
                    fontWeight: isCurrent ? '800' : '600',
                  },
                ]}
              >
                {point.value > 0 ? formatPercent(point.value, 0) : '—'}
              </Text>
              <View
                style={[
                  styles.bar,
                  {
                    height: barHeight,
                    backgroundColor: isCurrent ? color : theme.surfaceAlt,
                    borderColor: isCurrent ? color : theme.border,
                  },
                ]}
              />
              <Text
                style={[
                  styles.year,
                  {
                    color: isCurrent ? theme.text : theme.textFaint,
                    fontWeight: isCurrent ? '800' : '600',
                  },
                ]}
              >
                {point.year}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 3,
  },
  value: {
    fontSize: 9,
    fontVariant: ['tabular-nums'],
  },
  bar: {
    width: '100%',
    maxWidth: 40,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
  year: {
    fontSize: 9,
    fontVariant: ['tabular-nums'],
  },
});
