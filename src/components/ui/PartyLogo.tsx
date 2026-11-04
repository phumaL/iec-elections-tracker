import { Image } from 'expo-image';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { initials } from '@/lib/format';
import { partyImageUrl } from '@/lib/parties';
import { useTheme } from '@/theme';
import type { PartyMeta } from '@/types/iec';

interface PartyLogoProps {
  meta: PartyMeta;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function PartyLogo({ meta, size = 36, style }: PartyLogoProps) {
  const theme = useTheme();
  const uri = partyImageUrl(meta.image);
  const radius = size / 2;
  const label = initials(meta.abbr || meta.name).slice(0, 3);

  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: radius,
          borderColor: theme.border,
          backgroundColor: uri ? '#FFFFFF' : meta.color,
        },
        style,
      ]}
      accessibilityLabel={meta.name}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: size * 0.72, height: size * 0.72 }}
          contentFit="contain"
          transition={120}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Text
          numberOfLines={1}
          style={{
            color: '#FFFFFF',
            fontWeight: '900',
            fontSize: Math.max(9, Math.round(size * 0.3)),
            letterSpacing: -0.3,
          }}
        >
          {label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
