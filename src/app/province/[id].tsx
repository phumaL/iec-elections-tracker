import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AreaRow } from '@/components/ui/AreaRow';
import { Card } from '@/components/ui/Card';
import {
  SegmentedControl,
  type SegmentedOption,
} from '@/components/ui/SegmentedControl';
import { DetailHeader } from '@/components/ui/Headers';
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
import {
  deltaFromPrevious,
  getMunicipalitiesForProvince,
  getPreviousSupport,
  hasMunicipalityResults,
  partySupport,
  pickLeadingParty,
  sortMunicipalities,
  sortParties,
  type MunicipalitySortMetric,
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
import { useNow } from '@/hooks/useNow';
import { radius, spacing, useTheme } from '@/theme';

export default function ProvinceScreen() {
  const theme = useTheme();
  const router = useRouter();
  const now = useNow();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const {
    national,
    partyIndex,
    historyIndex,
    loading,
    refreshing,
    error,
    lastFetchedAt,
    refresh,
  } = useResults();
  const [showAll, setShowAll] = useState(false);
  const [municipalitySort, setMunicipalitySort] =
    useState<MunicipalitySortMetric>('name');
  const [municipalityLimit, setMunicipalityLimit] = useState(10);

  const MUNICIPALITY_SORTS: readonly SegmentedOption<MunicipalitySortMetric>[] = [
    { key: 'name', label: 'Name' },
    { key: 'progress', label: 'Progress' },
    { key: 'votes', label: 'Votes' },
  ];

  const province = useMemo(
    () =>
      national?.ProvinceResults.find(
        (item) => String(item.ProvinceID) === String(id),
      ) ?? null,
    [national, id],
  );

  const parties = useMemo(
    () => sortParties(province?.PartyBallotResults, 'support'),
    [province],
  );

  const municipalities = useMemo(
    () =>
      sortMunicipalities(
        getMunicipalitiesForProvince(national, id ?? ''),
        municipalitySort,
      ),
    [national, id, municipalitySort],
  );

  const counted = votesCounted(province);
  const visibleParties = showAll ? parties : parties.slice(0, 12);

  if (!national && loading) {
    return (
      <Screen>
        <DetailHeader title="Province" eyebrow="Loading" />
        <LoadingState message="Loading provincial results…" />
      </Screen>
    );
  }

  if (!national && error) {
    return (
      <Screen>
        <DetailHeader title="Province" eyebrow="Results" />
        <View style={styles.padded}>
          <ErrorState message={error} onRetry={() => void refresh()} />
        </View>
      </Screen>
    );
  }

  if (!province) {
    return (
      <Screen>
        <DetailHeader title="Province" eyebrow="Not found" />
        <View style={styles.padded}>
          <EmptyState
            icon="map-outline"
            title="Province not found"
            message="This province is not in the current IEC feed."
            action={
              <Pressable
                accessibilityRole="button"
                onPress={() => router.navigate('/areas')}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: theme.primary },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={[styles.primaryLabel, { color: theme.onPrimary }]}>
                  Browse areas
                </Text>
              </Pressable>
            }
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <DetailHeader
        eyebrow="Province"
        title={province.Province}
        subtitle={`${formatNumber(municipalities.length)} municipalities · ${
          lastFetchedAt
            ? `checked ${formatRelativeTime(lastFetchedAt, now)}`
            : 'awaiting check'
        }`}
        right={<LiveBadge paused={Boolean(error)} />}
      />

      {error ? (
        <View style={styles.padded}>
          <Notice tone="danger" title="Live updates interrupted" message={error} />
        </View>
      ) : null}

      <View style={styles.padded}>
        <Card style={styles.countCard}>
          <View style={styles.countRow}>
            <Text style={[styles.countPercent, { color: theme.primary }]}>
              {formatPercent(counted, 0)}
            </Text>
            <View style={styles.countText}>
              <Text style={[styles.countTitle, { color: theme.text }]}>
                voting districts counted
              </Text>
              <Text style={[styles.countDetail, { color: theme.textMuted }]}>
                {formatNumber(province.VDsComplete)} of{' '}
                {formatNumber(province.VDExpected)}
                {province.ReportDate
                  ? ` · feed ${formatClockTime(province.ReportDate)}`
                  : ''}
              </Text>
            </View>
          </View>
          <ProgressBar value={counted} height={7} />
          <View style={styles.statGrid}>
            <StatTile
              compact
              label="Wards"
              value={`${formatNumber(province.WardsComplete)}/${formatNumber(
                province.WardExpected,
              )}`}
            />
            <StatTile
              compact
              label="Municipalities completed"
              value={`${formatNumber(
                province.MuncipalitiesComplete,
              )}/${formatNumber(province.MunicExpected)}`}
            />
            <StatTile
              compact
              label="Seats"
              value={`${formatNumber(province.SeatsComplete)}/${formatNumber(
                province.SeatsExpected,
              )}`}
            />
          </View>
        </Card>
      </View>

      <Section
        title="Council control"
        subtitle="Municipal councils in this province"
      >
        <View style={styles.tileGrid}>
          <StatTile
            label="Majority"
            value={formatNumber(province.MajorityCouncils)}
            valueColor={theme.success}
          />
          <StatTile
            label="Hung"
            value={formatNumber(province.HungCouncils)}
            valueColor={theme.warning}
          />
          <StatTile
            label="Drawn"
            value={formatNumber(province.DeadLockDrawnCouncils)}
            valueColor={theme.danger}
          />
        </View>
      </Section>

      <Section
        title="Party standings"
        subtitle={pluralise(
          parties.reduce((total, party) => total + (party.TotalValidVotes ?? 0), 0),
          'valid vote',
        )}
        action={
          parties.length > 12 ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowAll((value) => !value)}
              hitSlop={8}
            >
              <Text style={[styles.link, { color: theme.primary }]}>
                {showAll ? 'Show top 12' : `Show all ${parties.length}`}
              </Text>
            </Pressable>
          ) : null
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
            visibleParties.map((party, index, shown) => {
              const meta = getPartyMeta(partyIndex, party.ID, party.Name);
              const previous = getPreviousSupport(
                historyIndex,
                party.ID,
                'province',
                province.ProvinceID,
              );
              const delta = deltaFromPrevious(partySupport(party), previous);

              return (
                <View
                  key={party.ID}
                  style={[
                    styles.rowWrap,
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

      <View style={styles.controls}>
        <SegmentedControl
          options={MUNICIPALITY_SORTS}
          value={municipalitySort}
          onChange={(value) => {
            setMunicipalitySort(value);
            setMunicipalityLimit(10);
          }}
        />
      </View>

      <Section
        title="Municipalities"
        subtitle="Tap for ward and council detail"
      >
        <Card padded={false} style={styles.listCard}>
          {municipalities
            .slice(0, municipalityLimit)
            .map((municipality) => {
            const leading = pickLeadingParty(municipality.PartyBallotResults);
            const meta = leading
              ? getPartyMeta(partyIndex, leading.ID, leading.Name)
              : null;

            return (
              <View
                key={municipality.MunicipalityID}
                style={styles.areaWrap}
              >
                <AreaRow
                  title={municipality.Municipality}
                  subtitle={
                    hasMunicipalityResults(municipality)
                      ? municipality.Province
                      : 'No results yet'
                  }
                  leadingMeta={meta}
                  leadingSupport={leading ? partySupport(leading) : null}
                  percent={votesCounted(municipality)}
                  onPress={() =>
                    router.push({
                      pathname: '/municipality/[id]',
                      params: {
                        id: String(municipality.MunicipalityID),
                      },
                    })
                  }
                />
              </View>
            );
          })}
        </Card>
        {municipalities.length > municipalityLimit ? (
          <View style={styles.padded}>
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                setMunicipalityLimit((limit) => limit + 10)
              }
              style={({ pressed }) => [
                styles.showMore,
                { borderColor: theme.border },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[styles.showMoreLabel, { color: theme.primary }]}>
                Show {Math.min(10, municipalities.length - municipalityLimit)}{' '}
                more municipalities
              </Text>
            </Pressable>
          </View>
        ) : null}
      </Section>

      <SourceFooter />
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  padded: {
    paddingHorizontal: spacing.lg,
  },
  showMore: {
    alignItems: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  showMoreLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  countCard: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  countPercent: {
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: -2.2,
    fontVariant: ['tabular-nums'],
    lineHeight: 48,
  },
  countText: {
    flex: 1,
    paddingBottom: 4,
    gap: 2,
  },
  countTitle: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  countDetail: {
    fontSize: 11,
    fontWeight: '500',
  },
  statGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tileGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  link: {
    fontSize: 12,
    fontWeight: '800',
  },
  listCard: {
    paddingHorizontal: spacing.lg,
  },
  rowWrap: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  areaWrap: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  primaryButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 999,
  },
  primaryLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
});
