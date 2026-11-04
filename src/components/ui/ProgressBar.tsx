import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { clampPercent } from '@/lib/format';
import { useTheme } from '@/theme';

interface ProgressBarProps {
  value: number;
  color?: string;
  trackColor?: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

export function ProgressBar({
  value,
  color,
  trackColor,
  height = 6,
  style,
}: ProgressBarProps) {
  const theme = useTheme();
  const percent = clampPercent(value);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(percent) }}
      style={[
        styles.track,
        {
          height,
          borderRadius: height / 2,
          backgroundColor: trackColor ?? theme.surfaceAlt,
        },
        style,
      ]}
    >
      <View
        style={{
          width: `${percent}%`,
          height: '100%',
          borderRadius: height / 2,
          backgroundColor: color ?? theme.primary,
          minWidth: percent > 0 ? height : 0,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    overflow: 'hidden',
    width: '100%',
  },
});
