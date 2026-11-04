import { useEffect, useState } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

interface LiveBadgeProps {
  label?: string;
  /** Use the translucent treatment that sits on the blue hero. */
  onHero?: boolean;
  paused?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function LiveBadge({
  label = 'Live',
  onHero = false,
  paused = false,
  style,
}: LiveBadgeProps) {
  const theme = useTheme();
  const [pulse] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (paused) {
      pulse.stopAnimation();
      pulse.setValue(1);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.35,
          duration: 900,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [paused, pulse]);

  const foreground = onHero ? '#FFFFFF' : theme.live;
  const background = onHero ? 'rgba(255,255,255,0.16)' : theme.liveSoft;

  return (
    <View
      style={[styles.badge, { backgroundColor: background }, style]}
      accessibilityLabel={paused ? 'Updates paused' : `${label}, updating`}
    >
      <Animated.View
        style={[
          styles.dot,
          {
            backgroundColor: paused ? theme.textFaint : foreground,
            opacity: paused ? 0.6 : pulse,
          },
        ]}
      />
      <Text style={[styles.label, { color: foreground }]}>
        {paused ? 'Paused' : label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
