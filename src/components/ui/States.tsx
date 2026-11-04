import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { radius, spacing, type as typeScale, useTheme } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

interface LoadingStateProps {
  message?: string;
  compact?: boolean;
}

export function LoadingState({
  message = 'Loading results…',
  compact = false,
}: LoadingStateProps) {
  const theme = useTheme();

  return (
    <View
      style={[styles.centered, { paddingVertical: compact ? spacing.xl : 56 }]}
      accessibilityRole="progressbar"
      accessibilityLabel={message}
    >
      <ActivityIndicator size={compact ? 'small' : 'large'} color={theme.primary} />
      <Text style={[styles.message, { color: theme.textMuted }]}>{message}</Text>
    </View>
  );
}

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  compact?: boolean;
}

export function ErrorState({
  title = 'Unable to load results',
  message,
  onRetry,
  retryLabel = 'Try again',
  compact = false,
}: ErrorStateProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.stateCard,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          paddingVertical: compact ? spacing.xl : 36,
        },
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: theme.dangerSoft }]}>
        <Ionicons name="cloud-offline-outline" size={24} color={theme.danger} />
      </View>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.message, { color: theme.textMuted }]}>{message}</Text>
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: theme.primary },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={[styles.buttonLabel, { color: theme.onPrimary }]}>
            {retryLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: IconName;
  action?: ReactNode;
  compact?: boolean;
}

export function EmptyState({
  title,
  message,
  icon = 'file-tray-outline',
  action,
  compact = false,
}: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.stateCard,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          paddingVertical: compact ? spacing.xl : 36,
        },
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: theme.surfaceAlt }]}>
        <Ionicons name={icon} size={24} color={theme.textMuted} />
      </View>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {message ? (
        <Text style={[styles.message, { color: theme.textMuted }]}>{message}</Text>
      ) : null}
      {action}
    </View>
  );
}

type NoticeTone = 'info' | 'warning' | 'danger' | 'success';

interface NoticeProps {
  message: string;
  title?: string;
  tone?: NoticeTone;
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Notice({
  message,
  title,
  tone = 'info',
  action,
  style,
}: NoticeProps) {
  const theme = useTheme();

  const palette: Record<NoticeTone, { fg: string; bg: string; icon: IconName }> = {
    info: { fg: theme.primary, bg: theme.primarySoft, icon: 'information-circle' },
    warning: { fg: theme.warning, bg: theme.warningSoft, icon: 'alert-circle' },
    danger: { fg: theme.danger, bg: theme.dangerSoft, icon: 'warning' },
    success: { fg: theme.success, bg: theme.successSoft, icon: 'checkmark-circle' },
  };

  const colors = palette[tone];

  return (
    <View
      style={[
        styles.notice,
        { backgroundColor: colors.bg, borderColor: colors.bg },
        style,
      ]}
      accessibilityRole="alert"
    >
      <Ionicons name={colors.icon} size={18} color={colors.fg} />
      <View style={styles.noticeBody}>
        {title ? (
          <Text style={[styles.noticeTitle, { color: colors.fg }]}>{title}</Text>
        ) : null}
        <Text style={[styles.noticeMessage, { color: theme.text }]}>
          {message}
        </Text>
        {action ? <View style={styles.noticeAction}>{action}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  stateCard: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: typeScale.h3,
    fontWeight: '800',
    textAlign: 'center',
  },
  message: {
    fontSize: typeScale.body,
    lineHeight: 21,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  noticeBody: {
    flex: 1,
    gap: 2,
  },
  noticeTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  noticeMessage: {
    fontSize: typeScale.small,
    lineHeight: 19,
  },
  noticeAction: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
});
