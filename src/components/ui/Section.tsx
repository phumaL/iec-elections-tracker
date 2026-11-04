import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { spacing, type, useTheme } from '@/theme';

interface SectionProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Removes the outer horizontal padding (useful inside an existing card). */
  flush?: boolean;
}

export function Section({
  title,
  subtitle,
  action,
  children,
  style,
  flush = false,
}: SectionProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.wrap,
        !flush && { paddingHorizontal: spacing.lg },
        style,
      ]}
    >
      <View style={styles.headingRow}>
        <View style={styles.headingText}>
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: theme.text }]}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {action ? <View style={styles.action}>{action}</View> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.xl,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  headingText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: type.h3,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: type.small,
    lineHeight: 18,
  },
  action: {
    flexShrink: 0,
  },
});
