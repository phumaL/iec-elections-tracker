import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

export interface SegmentedOption<T extends string> {
  key: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
}: SegmentedControlProps<T>) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.track,
        { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
        style,
      ]}
      accessibilityRole="tablist"
    >
      {options.map((option) => {
        const active = option.key === value;

        return (
          <Pressable
            key={option.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.key)}
            style={({ pressed }) => [
              styles.segment,
              active && {
                backgroundColor: theme.surface,
                borderColor: theme.borderStrong,
              },
              pressed && !active && { opacity: 0.65 },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                {
                  color: active ? theme.text : theme.textMuted,
                  fontWeight: active ? '800' : '600',
                },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm + 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  label: {
    fontSize: 12,
    letterSpacing: 0.1,
  },
});
