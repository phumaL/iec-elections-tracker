import Ionicons from '@expo/vector-icons/Ionicons';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { IEC_DASHBOARD_URL } from '@/api/iec';
import { spacing, useTheme } from '@/theme';

export function SourceFooter() {
  const theme = useTheme();

  return (
    <View style={[styles.wrap, { borderColor: theme.border }]}>
      <Ionicons name="information-circle-outline" size={15} color={theme.textFaint} />
      <Text style={[styles.text, { color: theme.textFaint }]}>
        Unofficial app. Results from the{' '}
        <Text
          accessibilityRole="link"
          style={{ color: theme.primary, fontWeight: '700' }}
          onPress={() => void Linking.openURL(IEC_DASHBOARD_URL)}
        >
          IEC results dashboard
        </Text>
        . Always verify with the IEC.
      </Text>
    </View>
  );
}

export function SourceLink({ label = 'Open IEC dashboard' }: { label?: string }) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => void Linking.openURL(IEC_DASHBOARD_URL)}
      style={({ pressed }) => [
        styles.link,
        {
          backgroundColor: theme.primarySoft,
          borderColor: theme.primarySoft,
        },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Ionicons name="open-outline" size={15} color={theme.primary} />
      <Text style={[styles.linkLabel, { color: theme.primary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.xl,
    marginHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  text: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
  },
  linkLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
});
