import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/Headers';
import { Screen } from '@/components/ui/Screen';
import {
  SegmentedControl,
  type SegmentedOption,
} from '@/components/ui/SegmentedControl';
import { SourceLink } from '@/components/ui/SourceFooter';
import { useResults } from '@/context/results';
import {
  useSettings,
  type RefreshInterval,
  type ThemePreference,
} from '@/context/settings';
import { useNow } from '@/hooks/useNow';
import { formatRelativeTime } from '@/lib/format';
import { radius, spacing, useTheme } from '@/theme';

const THEMES: readonly SegmentedOption<ThemePreference>[] = [
  { key: 'system', label: 'System' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
];

const REFRESH_OPTIONS: readonly {
  value: RefreshInterval;
  title: string;
  description: string;
}[] = [
  {
    value: 60,
    title: 'Live · every 60 seconds',
    description: 'Recommended. Matches the IEC edge cache refresh.',
  },
  {
    value: 120,
    title: 'Data saver · every 2 minutes',
    description: 'Fewer requests. Still checks for changed results.',
  },
  {
    value: 0,
    title: 'Manual only',
    description: 'Only refresh when you pull down or tap refresh.',
  },
];

export default function SettingsScreen() {
  const theme = useTheme();
  const now = useNow();
  const {
    settings,
    updateSettings,
    resetSettings,
  } = useSettings();
  const {
    refresh,
    refreshing,
    clearCache,
    lastFetchedAt,
    fromCache,
  } = useResults();
  const [clearing, setClearing] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);

  const clearSavedData = () => {
    setClearing(true);
    void clearCache().finally(() => {
      setClearing(false);
      setConfirmingClear(false);
    });
  };

  return (
    <Screen>
      <ScreenHeader
        eyebrow="Preferences"
        title="Settings"
        subtitle="Tune updates, appearance and stored data."
      />

      <View style={styles.content}>
        <Card style={styles.card}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Appearance</Text>
          <Text style={[styles.cardHint, { color: theme.textMuted }]}>
            Choose a theme or follow your device.
          </Text>
          <SegmentedControl
            options={THEMES}
            value={settings.theme}
            onChange={(value) => updateSettings({ theme: value })}
            style={styles.segmented}
          />
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            Live updates
          </Text>
          <Text style={[styles.cardHint, { color: theme.textMuted }]}>
            Unchanged results are confirmed with a tiny 304 response, so even the
            60-second option is light on data. Manual refreshes are limited to
            one every 15 seconds.
          </Text>

          <View style={styles.choiceList}>
            {REFRESH_OPTIONS.map((option) => {
              const selected = settings.refreshInterval === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() =>
                    updateSettings({ refreshInterval: option.value })
                  }
                  style={({ pressed }) => [
                    styles.choice,
                    {
                      backgroundColor: selected
                        ? theme.primarySoft
                        : theme.surfaceAlt,
                      borderColor: selected ? theme.primary : theme.border,
                    },
                    pressed && { opacity: 0.75 },
                  ]}
                >
                  <View
                    style={[
                      styles.radio,
                      {
                        borderColor: selected ? theme.primary : theme.borderStrong,
                        backgroundColor: selected
                          ? theme.primary
                          : 'transparent',
                      },
                    ]}
                  >
                    {selected ? <View style={styles.radioDot} /> : null}
                  </View>
                  <View style={styles.choiceText}>
                    <Text
                      style={[
                        styles.choiceTitle,
                        { color: theme.text, fontWeight: selected ? '800' : '600' },
                      ]}
                    >
                      {option.title}
                    </Text>
                    <Text
                      style={[styles.choiceDescription, { color: theme.textMuted }]}
                    >
                      {option.description}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            Why this stays light
          </Text>
          <Text style={[styles.cardHint, { color: theme.textMuted }]}>
            The IEC dashboard downloads large reference files. This app bundles
            what never changes and checks the rest conditionally.
          </Text>

          <View style={styles.factList}>
            <Fact
              icon="git-compare-outline"
              title="Conditional national feed"
              body="The ETag turns an unchanged poll into a body-less 304 response."
            />
            <Fact
              icon="people-outline"
              title="Party details bundled"
              body="2.9 KB instead of the 471 KB PartyList file."
            />
            <Fact
              icon="stats-chart-outline"
              title="History bundled"
              body="6 KB of national and provincial history instead of 1.4 MB."
            />
            <Fact
              icon="map-outline"
              title="Wards on demand"
              body="A 10–20 MB municipality file is only downloaded when you ask for ward detail."
            />
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            Stored data
          </Text>
          <View style={styles.statusRow}>
            <View style={styles.statusText}>
              <Text style={[styles.statusLabel, { color: theme.textMuted }]}>
                Last successful check
              </Text>
              <Text style={[styles.statusValue, { color: theme.text }]}>
                {lastFetchedAt
                  ? formatRelativeTime(lastFetchedAt, now)
                  : 'Not yet'}
                {fromCache ? ' · from cache' : ''}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => void refresh()}
              disabled={refreshing}
              style={({ pressed }) => [
                styles.secondaryButton,
                {
                  borderColor: theme.primary,
                  backgroundColor: theme.primarySoft,
                },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Ionicons name="refresh" size={15} color={theme.primary} />
              <Text style={[styles.secondaryLabel, { color: theme.primary }]}>
                {refreshing ? 'Checking…' : 'Refresh now'}
              </Text>
            </Pressable>
          </View>

          {confirmingClear ? (
            <View
              style={[
                styles.confirmBox,
                {
                  borderColor: theme.dangerSoft,
                  backgroundColor: theme.surfaceAlt,
                },
              ]}
            >
              <Text style={[styles.confirmText, { color: theme.textMuted }]}>
                Remove the saved national snapshot? The next refresh will
                download a fresh copy.
              </Text>
              <View style={styles.confirmActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setConfirmingClear(false)}
                  disabled={clearing}
                  style={({ pressed }) => [
                    styles.confirmButton,
                    { borderColor: theme.border },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[styles.secondaryLabel, { color: theme.text }]}>
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={clearSavedData}
                  disabled={clearing}
                  style={({ pressed }) => [
                    styles.confirmButton,
                    {
                      borderColor: theme.danger,
                      backgroundColor: theme.dangerSoft,
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Ionicons name="trash-outline" size={14} color={theme.danger} />
                  <Text style={[styles.secondaryLabel, { color: theme.danger }]}>
                    {clearing ? 'Clearing…' : 'Clear cache'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => setConfirmingClear(true)}
              style={({ pressed }) => [
                styles.dangerButton,
                { borderColor: theme.dangerSoft },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Ionicons name="trash-outline" size={15} color={theme.danger} />
              <Text style={[styles.secondaryLabel, { color: theme.danger }]}>
                Clear cached results
              </Text>
            </Pressable>
          )}
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            About this app
          </Text>
          <Text style={[styles.cardHint, { color: theme.textMuted }]}>
            An unofficial companion to the IEC 2026 municipal election dashboard.
            Results are read from the same public feeds the IEC publishes. This
            app is not affiliated with the Electoral Commission.
          </Text>
          <SourceLink />
          <Pressable
            accessibilityRole="button"
            onPress={resetSettings}
            style={({ pressed }) => [styles.resetButton, pressed && { opacity: 0.6 }]}
          >
            <Text style={[styles.resetLabel, { color: theme.textFaint }]}>
              Reset preferences
            </Text>
          </Pressable>
        </Card>
      </View>
    </Screen>
  );
}

function Fact({
  icon,
  title,
  body,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  body: string;
}) {
  const theme = useTheme();

  return (
    <View style={styles.fact}>
      <View style={[styles.factIcon, { backgroundColor: theme.primarySoft }]}>
        <Ionicons name={icon} size={15} color={theme.primary} />
      </View>
      <View style={styles.factText}>
        <Text style={[styles.factTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.factBody, { color: theme.textMuted }]}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  card: {
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  cardHint: {
    fontSize: 12,
    lineHeight: 18,
  },
  segmented: {
    marginTop: spacing.sm,
  },
  choiceList: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  choiceText: {
    flex: 1,
    gap: 2,
  },
  choiceTitle: {
    fontSize: 13,
  },
  choiceDescription: {
    fontSize: 11,
    lineHeight: 16,
  },
  factList: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  fact: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  factIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  factText: {
    flex: 1,
    gap: 1,
  },
  factTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  factBody: {
    fontSize: 11,
    lineHeight: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  statusText: {
    flex: 1,
    gap: 2,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.sm,
  },
  confirmBox: {
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  confirmText: {
    fontSize: 12,
    lineHeight: 18,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  secondaryLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  resetButton: {
    alignSelf: 'center',
    marginTop: spacing.sm,
    padding: spacing.sm,
  },
  resetLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
});
