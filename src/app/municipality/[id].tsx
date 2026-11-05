import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Card } from '@/components/ui/Card';
import { DetailHeader } from '@/components/ui/Headers';
import { LiveBadge } from '@/components/ui/LiveBadge';
import { PartyLogo } from '@/components/ui/PartyLogo';
import { PartyRow } from '@/components/ui/PartyRow';
import { ProgressBar } from '@/components/ui/ProgressBar';
import {
  SegmentedControl,
  type SegmentedOption,
} from '@/components/ui/SegmentedControl';
import { Screen } from '@/components/ui/Screen';
import { SearchField } from '@/components/ui/SearchField';
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
import { useMunicipalityDetail } from '@/hooks/useMunicipalityDetail';
import { useNow } from '@/hooks/useNow';
import {
  deltaFromPrevious,
  getAllMunicipalities,
  getMunicipalityCouncilStatus,
  getPreviousSupport,
  hasMunicipalityResults,
  municipalityVotesCast,
  getWardNumber,
  partySeats,
  partySupport,
  sortParties,
  sortWards,
  type PartyMetric,
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
import { radius, spacing, useTheme } from '@/theme';
import type { PartyMeta, WardResult } from '@/types/iec';

const WARD_PAGE_SIZE = 25;

type PartySort = Extract<PartyMetric, 'support' | 'votes' | 'name'>;
type WardSort = 'number' | 'votes' | 'progress';

const PARTY_SORTS: readonly SegmentedOption<PartySort>[] = [
  { key: 'support', label: 'Support' },
  { key: 'votes', label: 'Votes' },
  { key: 'name', label: 'Name' },
];

const WARD_SORTS: readonly SegmentedOption<WardSort>[] = [
  { key: 'number', label: 'Number' },
  { key: 'votes', label: 'Votes' },
  { key: 'progress', label: 'Progress' },
];

export default function MunicipalityScreen() {
  const theme = useTheme();
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
  const wards = useMunicipalityDetail(id);
  const [wardSearch, setWardSearch] = useState('');
  const [wardLimit, setWardLimit] = useState(WARD_PAGE_SIZE);
  const [expandedWards, setExpandedWards] = useState<Set<string>>(new Set());
  const [partySort, setPartySort] = useState<PartySort>('support');
  const [wardSort, setWardSort] = useState<WardSort>('number');

  // Automatically fetch the full municipal file so the party standings show
  // every contestant, not just the leading party from the national snapshot.
  useEffect(() => {
    if (!id) return;
    if (wards.data && String(wards.data.MunicipalityID) === String(id)) return;
    if (wards.loading) return;
    void wards.load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, wards.data, wards.loading, wards.load]);

  const municipality = useMemo(() => {
    // Prefer the fetched municipality file: it carries the ward breakdown,
    // while the national snapshot only has the aggregate. Bundled reference
    // data means a stub can exist before the municipality has any results.
    if (wards.data && String(wards.data.MunicipalityID) === String(id)) {
      return wards.data;
    }

    return (
      getAllMunicipalities(national).find(
        (item) => String(item.MunicipalityID) === String(id),
      ) ?? null
    );
  }, [national, id, wards.data]);

  const parties = useMemo(
    () => sortParties(municipality?.PartyBallotResults, partySort),
    [municipality, partySort],
  );

  const council = useMemo(
    () => getMunicipalityCouncilStatus(municipality),
    [municipality],
  );

  const wardList = useMemo(() => {
    const search = wardSearch.trim();
    const sorted = sortWards(wards.data?.WardResults, wardSort);

    if (!search) return sorted;

    const digits = search.replace(/\D/g, '');

    return sorted.filter((ward) => {
      const number = getWardNumber(ward.WardID);
      if (!digits) return true;
      return number.includes(digits) || String(ward.WardID).includes(digits);
    });
  }, [wards.data, wardSearch, wardSort]);

  const visibleWards = wardList.slice(0, wardLimit);

  const toggleWard = (wardId: number) => {
    const key = String(wardId);
    setExpandedWards((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (!municipality && loading) {
    return (
      <Screen>
        <DetailHeader title="Municipality" eyebrow="Loading" />
        <LoadingState message="Loading municipal results…" />
      </Screen>
    );
  }

  if (!municipality && error) {
    return (
      <Screen>
        <DetailHeader title="Municipality" eyebrow="Results" />
        <View style={styles.padded}>
          <ErrorState message={error} onRetry={() => void refresh()} />
        </View>
      </Screen>
    );
  }

  if (!municipality) {
    return (
      <Screen>
        <DetailHeader title="Municipality" eyebrow="Not found" />
        <View style={styles.padded}>
          <EmptyState
            icon="business-outline"
            title="Municipality not found"
            message="This municipality is not in the current IEC feed."
          />
        </View>
      </Screen>
    );
  }

  const counted = votesCounted(municipality);
  const statusLabel = council.label;

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <DetailHeader
        eyebrow="Municipality"
        title={municipality.Municipality}
        subtitle={`${municipality.Province} · ${
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

      {!hasMunicipalityResults(municipality) ? (
        <View style={styles.padded}>
          <Notice
            tone="warning"
            title="No votes counted yet"
            message="This municipality is on the ballot but has not reported any voting districts. Results will appear here automatically."
          />
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
                {formatNumber(municipality.VDsComplete)} of{' '}
                {formatNumber(municipality.VDExpected)}
                {municipality.ReportDate
                  ? ` · feed ${formatClockTime(municipality.ReportDate)}`
                  : ''}
              </Text>
            </View>
          </View>
          <ProgressBar value={counted} height={7} />
          <View style={styles.statGrid}>
            <StatTile
              compact
              label="Wards"
              value={`${formatNumber(municipality.WardsComplete)}/${formatNumber(
                municipality.WardExpected,
              )}`}
            />
            <StatTile
              compact
              label="Seats"
              value={`${formatNumber(municipality.SeatsComplete)}/${formatNumber(
                municipality.SeatsExpected,
              )}`}
            />
            <StatTile
              compact
              label="Votes cast"
              value={formatNumber(municipalityVotesCast(municipality))}
            />
          </View>
        </Card>
      </View>

      <Section title="Council status" subtitle={statusLabel}>
        <View style={styles.tileGrid}>
          <StatTile
            label="Status"
            value={statusLabel}
            hint={
              council.seatsAvailable > 0
                ? `${formatNumber(council.seatsAllocated)} of ${formatNumber(
                    council.seatsAvailable,
                  )} seats`
                : 'Awaiting seat allocation'
            }
            valueColor={
              council.key === 'controlled'
                ? theme.success
                : council.key === 'hung'
                  ? theme.warning
                  : council.key === 'drawn'
                    ? theme.danger
                    : theme.text
            }
          />
          <StatTile
            label="Leading seats"
            value={formatNumber(council.leadingSeats)}
            hint="Largest single party"
          />
        </View>
      </Section>

      {!wards.data && !wards.loading && parties.length > 0 ? (
        <View style={styles.padded}>
          <Notice
            tone="info"
            title="Leading party shown"
            message="The IEC feed only includes the leading party here. Downloading the full breakdown…"
          />
        </View>
      ) : null}

      {wards.loading ? (
        <View style={styles.padded}>
          <LoadingState message="Downloading full party standings…" />
        </View>
      ) : null}

      <View style={styles.controls}>
        <SegmentedControl
          options={PARTY_SORTS}
          value={partySort}
          onChange={setPartySort}
        />
      </View>

      <Section
        title="Party standings"
        subtitle={pluralise(
          municipalityVotesCast(municipality),
          'valid vote',
        )}
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
            parties.map((party, index, shown) => {
              const meta = getPartyMeta(partyIndex, party.ID, party.Name);
              const previous = getPreviousSupport(
                historyIndex,
                party.ID,
                'municipality',
                municipality.MunicipalityID,
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
                  />
                </View>
              );
            })
          )}
        </Card>
      </Section>

      <Section
        title="Ward detail"
        subtitle="Downloads the full municipal file"
      >
        {!wards.data ? (
          <Card style={styles.downloadCard}>
            <View style={[styles.downloadIcon, { backgroundColor: theme.primarySoft }]}>
              <Ionicons name="cloud-download-outline" size={24} color={theme.primary} />
            </View>
            <Text style={[styles.downloadTitle, { color: theme.text }]}>
              Ward-by-ward results
            </Text>
            <Text style={[styles.downloadBody, { color: theme.textMuted }]}>
              The IEC publishes ward and voting-district detail in a separate
              file of up to 20 MB. It is only downloaded when you ask for it, and
              it is never polled.
            </Text>

            {wards.error ? (
              <Notice
                tone="danger"
                title="Download failed"
                message={wards.error}
                style={styles.downloadNotice}
              />
            ) : null}

            <Pressable
              accessibilityRole="button"
              onPress={() => void wards.load()}
              disabled={wards.loading}
              style={({ pressed }) => [
                styles.downloadButton,
                { backgroundColor: theme.primary },
                pressed && { opacity: 0.8 },
              ]}
            >
              {wards.loading ? (
                <ActivityIndicator size="small" color={theme.onPrimary} />
              ) : (
                <Ionicons name="download-outline" size={18} color={theme.onPrimary} />
              )}
              <Text style={[styles.downloadLabel, { color: theme.onPrimary }]}>
                {wards.loading ? 'Downloading ward detail…' : 'Download ward detail'}
              </Text>
            </Pressable>

            <Text style={[styles.downloadHint, { color: theme.textFaint }]}>
              Largest download in the app. Use Wi-Fi if you can.
            </Text>
          </Card>
        ) : (
          <>
            <View style={styles.wardMetaRow}>
              <Text style={[styles.wardCount, { color: theme.textMuted }]}>
                {pluralise(wards.data.WardResults.length, 'ward')}
                {wards.cachedAt
                  ? ` · saved ${formatRelativeTime(wards.cachedAt, now)}`
                  : ''}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => void wards.refresh()}
                disabled={wards.loading}
                style={({ pressed }) => [
                  styles.reloadButton,
                  { borderColor: theme.border },
                  pressed && { opacity: 0.65 },
                ]}
              >
                {wards.loading ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <Ionicons name="refresh" size={14} color={theme.primary} />
                )}
                <Text style={[styles.reloadLabel, { color: theme.primary }]}>
                  Reload
                </Text>
              </Pressable>
            </View>

            <View style={styles.controls}>
              <SegmentedControl
                options={WARD_SORTS}
                value={wardSort}
                onChange={setWardSort}
              />
            </View>

            <SearchField
              value={wardSearch}
              onChangeText={(value) => {
                setWardSearch(value);
                setWardLimit(WARD_PAGE_SIZE);
              }}
              placeholder="Search ward number"
              style={styles.wardSearch}
            />

            {wards.error ? (
              <Notice tone="warning" title="Reload failed" message={wards.error} />
            ) : null}

            {wardList.length === 0 ? (
              <EmptyState
                compact
                icon="search-outline"
                title="No wards match"
                message={
                  wardSearch
                    ? 'Try another ward number.'
                    : 'This file does not contain ward results yet.'
                }
              />
            ) : (
              <>
                <View style={styles.wardList}>
                  {visibleWards.map((ward) => (
                    <WardCard
                      key={ward.WardID}
                      ward={ward}
                      partyIndex={partyIndex}
                      expanded={expandedWards.has(String(ward.WardID))}
                      onToggle={() => toggleWard(ward.WardID)}
                    />
                  ))}
                </View>

                {wardList.length > visibleWards.length ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      setWardLimit((limit) => limit + WARD_PAGE_SIZE)
                    }
                    style={({ pressed }) => [
                      styles.showMore,
                      { borderColor: theme.border },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text style={[styles.showMoreLabel, { color: theme.primary }]}>
                      Show {Math.min(WARD_PAGE_SIZE, wardList.length - visibleWards.length)}{' '}
                      more wards
                    </Text>
                  </Pressable>
                ) : null}
              </>
            )}
          </>
        )}
      </Section>

      <SourceFooter />
    </Screen>
  );
}

function WardCard({
  ward,
  partyIndex,
  expanded,
  onToggle,
}: {
  ward: WardResult;
  partyIndex: Map<string, PartyMeta>;
  expanded: boolean;
  onToggle: () => void;
}) {
  const theme = useTheme();
  const parties = sortParties(ward.PartyBallotResults, 'support');
  const shown = expanded ? parties : parties.slice(0, 3);
  const counted = votesCounted(ward);

  return (
    <Card style={styles.wardCard}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={onToggle}
        style={({ pressed }) => [styles.wardHeader, pressed && { opacity: 0.7 }]}
      >
        <View style={styles.wardTitleGroup}>
          <Text style={[styles.wardTitle, { color: theme.text }]}>
            Ward {getWardNumber(ward.WardID)}
          </Text>
          <Text style={[styles.wardSubtitle, { color: theme.textMuted }]}>
            {formatNumber(ward.VDsComplete)} of {formatNumber(ward.VDExpected)}{' '}
            districts · {formatPercent(counted, 0)}
          </Text>
        </View>
        <View style={styles.wardRight}>
          {ward.ReportDate ? (
            <Text style={[styles.wardTime, { color: theme.textFaint }]}>
              {formatClockTime(ward.ReportDate)}
            </Text>
          ) : null}
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={theme.textFaint}
          />
        </View>
      </Pressable>

      <ProgressBar value={counted} height={4} style={styles.wardProgress} />

      <View style={styles.wardParties}>
        {shown.map((party) => {
          const meta = getPartyMeta(partyIndex, party.ID, party.Name);
          const seats = partySeats(party);

          return (
            <View key={party.ID} style={styles.wardParty}>
              <PartyLogo meta={meta} size={22} />
              <Text
                numberOfLines={1}
                style={[styles.wardPartyName, { color: theme.text }]}
              >
                {meta.abbr}
              </Text>
              <Text style={[styles.wardPartyVotes, { color: theme.textMuted }]}>
                {formatNumber(party.TotalValidVotes)}
              </Text>
              <Text style={[styles.wardPartySupport, { color: theme.text }]}>
                {formatPercent(partySupport(party), 1)}
              </Text>
              {seats > 0 ? (
                <Text style={[styles.wardPartySeats, { color: theme.success }]}>
                  {formatNumber(seats)} seats
                </Text>
              ) : null}
            </View>
          );
        })}
        {parties.length > 3 && !expanded ? (
          <Pressable
            accessibilityRole="button"
            onPress={onToggle}
            style={({ pressed }) => [
              styles.showAllParties,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Text style={[styles.showAllLabel, { color: theme.primary }]}>
              Show all {parties.length} parties
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Card>
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
  listCard: {
    paddingHorizontal: spacing.lg,
  },
  rowWrap: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  downloadCard: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  downloadIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  downloadTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  downloadBody: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  downloadNotice: {
    alignSelf: 'stretch',
    marginTop: spacing.sm,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
  },
  downloadLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  downloadHint: {
    fontSize: 10,
    fontWeight: '600',
  },
  wardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  wardCount: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  reloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  reloadLabel: {
    fontSize: 11,
    fontWeight: '800',
  },
  wardSearch: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  wardList: {
    gap: spacing.sm,
  },
  wardCard: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  wardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  wardTitleGroup: {
    flex: 1,
    gap: 1,
  },
  wardTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  wardSubtitle: {
    fontSize: 10,
    fontWeight: '500',
  },
  wardRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  wardTime: {
    fontSize: 9,
    fontWeight: '600',
  },
  wardProgress: {
    marginTop: -2,
  },
  wardParties: {
    gap: 6,
  },
  wardParty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  wardPartyName: {
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
  },
  wardPartyVotes: {
    fontSize: 10,
    fontVariant: ['tabular-nums'],
  },
  wardPartySupport: {
    width: 46,
    textAlign: 'right',
    fontSize: 11,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  wardPartySeats: {
    fontSize: 9,
    fontWeight: '700',
  },
  showAllParties: {
    paddingTop: 2,
  },
  showAllLabel: {
    fontSize: 10,
    fontWeight: '800',
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
});
