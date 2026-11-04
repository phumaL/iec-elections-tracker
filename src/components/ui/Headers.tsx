import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing, type as typeScale, useTheme } from '@/theme';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  right?: ReactNode;
}

export function ScreenHeader({
  title,
  subtitle,
  eyebrow,
  right,
}: ScreenHeaderProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.screenHeader,
        { paddingTop: insets.top + spacing.lg },
      ]}
    >
      <View style={styles.screenHeaderText}>
        {eyebrow ? (
          <Text style={[styles.eyebrow, { color: theme.primary }]}>
            {eyebrow}
          </Text>
        ) : null}
        <Text
          accessibilityRole="header"
          style={[styles.screenTitle, { color: theme.text }]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.screenSubtitle, { color: theme.textMuted }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

interface DetailHeaderProps {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
}

export function DetailHeader({
  title,
  eyebrow,
  subtitle,
  onBack,
  right,
}: DetailHeaderProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const goBack = onBack ?? (() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  });

  return (
    <View style={[styles.detailHeader, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.detailTopRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={goBack}
          hitSlop={8}
          style={({ pressed }) => [
            styles.backButton,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Ionicons name="chevron-back" size={20} color={theme.text} />
        </Pressable>
        {right}
      </View>
      <View style={styles.detailText}>
        {eyebrow ? (
          <Text style={[styles.eyebrow, { color: theme.primary }]}>
            {eyebrow}
          </Text>
        ) : null}
        <Text
          accessibilityRole="header"
          style={[styles.detailTitle, { color: theme.text }]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.screenSubtitle, { color: theme.textMuted }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  screenHeaderText: {
    flex: 1,
    gap: 3,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  screenTitle: {
    fontSize: typeScale.h1,
    fontWeight: '900',
    letterSpacing: -0.9,
  },
  screenSubtitle: {
    fontSize: typeScale.body,
    lineHeight: 21,
  },
  detailHeader: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.lg,
  },
  detailTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  detailText: {
    gap: 3,
  },
  detailTitle: {
    fontSize: typeScale.h2,
    fontWeight: '900',
    letterSpacing: -0.7,
  },
});
