import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AreaRow } from '@/components/ui/AreaRow';
import { Card } from '@/components/ui/Card';
import { LiveBadge } from '@/components/ui/LiveBadge';
import { PartyRow } from '@/components/ui/PartyRow';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Screen } from '@/components/ui/Screen';
import { Section } from '@/components/ui/Section';
import { SourceFooter } from '@/components/ui/SourceFooter';
import { StatTile } from '@/components/ui/StatTile';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  Notice,
} from '@/components/ui/States';
import { useResults } from '@/context/results';
import { useNow } from '@/hooks/useNow';
import {
  deltaFromPrevious,
  getAllMunicipalities,
  getPreviousSupport,
  getProvinces,
  municipalitiesReporting,
  partySupport,
  partyVotes,
  pickLeadingParty,
  sortParties,
  votesCounted,
} from '@/lib/derive';
import {
  formatClockTime,
  formatNumber,
  formatPercent,
  formatRelativeTime,
  pluralise,
} from '@/lib/format';
import { getPartyMeta } from '@/lib/parties';
import { radius, spacing, type as typeScale, useTheme } from '@/theme';

export default function OverviewScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const now = useNow();
  const {
    national,
    partyIndex,
    historyIndex,
    loading,
    refreshing,
    error,
    lastFetchedAt,
    fromCache,
    refresh,
  } = useResults();

  const provinces = useMemo(() => getProvinces(national), [national]);
  const municipalities = useMemo(
    () => getAllMunicipalities(national),
    [national],
  );
  const parties = useMemo(
    () => sortParties(national?.PartyBallotResults, 'support'),
    [national],
  );
  const counted = votesCounted(national);
  const totalVotes = useMemo(
    () =>
      (national?.PartyBallotResults ?? []).reduce(
        (total, party) => total + partyVotes(party),
        0,
      ),
    [national],
  );

  const syncLabel = lastFetchedAt
    ? `Checked ${formatRelativeTime(lastFetchedAt, now)}`
    : 'Not checked yet';
  const reportTime = formatClockTime(national?.ReportDate);

  return (
    <Screen
      onRefresh={refresh}
      refreshing={refreshing}
      contentContainerStyle={{ paddingTop: 0 }}
    >
      <View
        style={[
          styles.hero,
          {
            backgroundColor: theme.hero,
            paddingTop: insets.top + spacing.md,
          },
        ]}
      >
        <View style={styles.heroOrbLarge} />
        <View style={styles.heroOrbSmall} />

        <View style={styles.heroTopRow}>
          <View>
            <Text style={styles.heroEyebrow}>South Africa · 5 November 2026</Text>
            <Text style={styles.heroTitle}>Municipal Elections</Text>
          </View>
          <LiveBadge onHero paused={!refreshing && Boolean(error)} />
        </View>

        <View style={styles.heroCount}>
          <Text style={styles.heroPercent}>{formatPercent(counted, 0)}</Text>
          <View style={styles.heroCountLabel}>
            <Text style={styles.heroCountTitle}>voting districts counted</Text>
            <Text style={styles.heroCountDetail}>
              {formatNumber(national?.VDsComplete)} of{' '}
              {formatNumber(national?.VDExpected)}
            </Text>
          </View>
        </View>

        <ProgressBar
          value={counted}
          height={7}
          color="#FFFFFF"
          trackColor="rgba(255,255,255,0.22)"
        />

        <View style={styles.heroStats}>
          <HeroStat
            label="Wards"
            value={`${formatNumber(national?.WardsComplete)}/${formatNumber(
              national?.WardExpected,
            )}`}
          />
          <HeroStat
            label="Municipalities"
            value={`${formatNumber(
              national?.MuncipalitiesComplete,
            )}/${formatNumber(national?.MunicExpected)}`}
          />
          <HeroStat
            label="Seats"
            value={`${formatNumber(national?.SeatsComplete)}/${formatNumber(
              national?.SeatsExpected,
            )}`}
          />
        </View>

        <View style={styles.heroSync}>
          <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.8)" />
          <Text style={styles.heroSyncText}>
            {syncLabel}
            {reportTime !== '—' ? ` · feed ${reportTime}` : ''}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Refresh results now"
            onPress={() => void refresh()}
            disabled={refreshing}
            hitSlop={8}
            style={({ pressed }) => [
              styles.refreshButton,
              pressed && { opacity: 0.65 },
            ]}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="refresh" size={16} color="#FFFFFF" />
            )}
          </Pressable>
        </View>
      </View>

      <View style={styles.noticeWrap}>
        {error ? (
          <Notice
            tone="danger"
            title="Live updates interrupted"
            message={error}
          />
        ) : fromCache ? (
          <Notice
            tone="info"
            title="Showing saved results"
            message="The latest live check has not completed yet. Pull down to try again."
          />
        ) : national && counted === 0 ? (
          <Notice
            tone="warning"
            title="Waiting for the first results"
            message="Counting has not started reporting yet. Pull down to check again."
          />
        ) : null}
      </View>

      {!national && loading ? (
        <LoadingState message="Contacting the IEC results service…" />
      ) : !national && error ? (
        <View style={styles.errorWrap}>
          <ErrorState message={error} onRetry={() => void refresh()} />
        </View>
      ) : national ? (
        <>
          <Section
            title="National standings"
            subtitle={`${pluralise(totalVotes, 'valid vote')} counted so far`}
            action={
              <Pressable
                accessibilityRole="button"
                onPress={() => router.navigate('/parties')}
                hitSlop={8}
              >
                <Text style={[styles.link, { color: theme.primary }]}>
                  All parties
                </Text>
              </Pressable>
            }
          >
            <Card padded={false} style={styles.listCard}>
              {parties.length === 0 ? (
                <EmptyState
                  compact
                  icon="hourglass-outline"
                  title="No party results yet"
                  message="Party standings will appear as voting districts report."
                />
              ) : (
                parties.slice(0, 8).map((party, index, shown) => {
                  const meta = getPartyMeta(partyIndex, party.ID, party.Name);
                  const previous = getPreviousSupport(historyIndex, party.ID);
                  const delta = deltaFromPrevious(partySupport(party), previous);

                  return (
                    <View
                      key={party.ID}
                      style={[
                        styles.partyWrap,
                        index < shown.length - 1 && {
                          borderBottomColor: theme.border,
                          borderBottomWidth: StyleSheet.hairlineWidth,
                        },
                      ]}
                    >
                      <PartyRow
                        party={party}
                        meta={meta}
                        rank={index + 1}
                        delta={delta}
                        showSeats
                        onPress={() =>
                          router.push({
                            pathname: '/party/[id]',
                            params: { id: String(party.ID) },
                          })
                        }
                      />
                    </View>
                  );
                })
              )}
            </Card>
          </Section>

          <Section
            title="Council control"
            subtitle="Councils already decided by a majority"
          >
            <View style={styles.tileGrid}>
              <StatTile
                label="Majority"
                value={formatNumber(national.MajorityCouncils)}
                hint={`of ${formatNumber(national.MunicExpected)} councils`}
                valueColor={theme.success}
              />
              <StatTile
                label="Hung"
                value={formatNumber(national.HungCouncils)}
                hint="No outright majority"
                valueColor={theme.warning}
              />
              <StatTile
                label="Drawn"
                value={formatNumber(national.DeadLockDrawnCouncils)}
                hint="Deadlock"
                valueColor={theme.danger}
              />
            </View>
          </Section>

          <Section
            title="Provinces"
            subtitle={`${formatNumber(
              municipalitiesReporting(national),
            )} of ${formatNumber(municipalities.length)} municipalities reporting`}
          >
            <Card padded={false} style={styles.listCard}>
              {provinces.map((province) => {
                const leading = pickLeadingParty(province.PartyBallotResults);
                const meta = leading
                  ? getPartyMeta(partyIndex, leading.ID, leading.Name)
                  : null;

                return (
                  <View key={province.ProvinceID} style={styles.areaWrap}>
                    <AreaRow
                      title={province.Province}
                      subtitle={`${formatNumber(
                        province.MunicipalityResults.length,
                      )} of ${formatNumber(
                        province.MunicExpected,
                      )} municipalities reporting`}
                      leadingMeta={meta}
                      leadingSupport={leading ? partySupport(leading) : null}
                      percent={votesCounted(province)}
                      onPress={() =>
                        router.push({
                          pathname: '/province/[id]',
                          params: { id: String(province.ProvinceID) },
                        })
                      }
                    />
                  </View>
                );
              })}
            </Card>
          </Section>
        </>
      ) : null}

      <SourceFooter />
    </Screen>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.heroStat}>
      <Text style={styles.heroStatValue}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    gap: spacing.md,
  },
  heroOrbLarge: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -90,
    right: -70,
  },
  heroOrbSmall: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.045)',
    bottom: -50,
    left: -30,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  heroEyebrow: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: typeScale.h1,
    fontWeight: '900',
    letterSpacing: -0.9,
    marginTop: 2,
  },
  heroCount: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  heroPercent: {
    color: '#FFFFFF',
    fontSize: 56,
    fontWeight: '900',
    letterSpacing: -3,
    fontVariant: ['tabular-nums'],
    lineHeight: 60,
  },
  heroCountLabel: {
    flex: 1,
    paddingBottom: 8,
    gap: 1,
  },
  heroCountTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  heroCountDetail: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  heroStats: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  heroStat: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.11)',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    gap: 1,
  },
  heroStatValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  heroStatLabel: {
    color: 'rgba(255,255,255,0.66)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  heroSync: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xs,
  },
  heroSyncText: {
    flex: 1,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '600',
  },
  refreshButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  noticeWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  errorWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  listCard: {
    paddingHorizontal: spacing.lg,
  },
  partyWrap: {
    paddingVertical: 1,
  },
  areaWrap: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  tileGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  link: {
    fontSize: 12,
    fontWeight: '800',
  },
});
