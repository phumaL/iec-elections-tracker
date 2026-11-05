import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/Headers';
import { PartyRow } from '@/components/ui/PartyRow';
import { Screen } from '@/components/ui/Screen';
import { SearchField } from '@/components/ui/SearchField';
import {
  SegmentedControl,
  type SegmentedOption,
} from '@/components/ui/SegmentedControl';
import { SourceFooter } from '@/components/ui/SourceFooter';
import { EmptyState, ErrorState, LoadingState, Notice } from '@/components/ui/States';
import { useResults } from '@/context/results';
import {
  deltaFromPrevious,
  getPreviousSupport,
  partyCouncils,
  partySeats,
  partySupport,
  sortParties,
  type PartyMetric,
} from '@/lib/derive';
import { formatNumber, pluralise } from '@/lib/format';
import { getPartyMeta } from '@/lib/parties';
import { radius, spacing, useTheme } from '@/theme';

type SortMetric = Extract<PartyMetric, 'support' | 'seats' | 'councils'>;

const SORTS: readonly SegmentedOption<SortMetric>[] = [
  { key: 'support', label: 'Support' },
  { key: 'seats', label: 'Seats' },
  { key: 'councils', label: 'Councils' },
];

export default function PartiesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const {
    national,
    partyIndex,
    historyIndex,
    loading,
    refreshing,
    error,
    refresh,
  } = useResults();
  const [sort, setSort] = useState<SortMetric>('support');
  const [query, setQuery] = useState('');

  const parties = useMemo(
    () => sortParties(national?.PartyBallotResults, sort),
    [national, sort],
  );

  const maxSupport = useMemo(
    () => Math.max(...parties.map((party) => partySupport(party)), 1),
    [parties],
  );

  const search = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      parties.filter((party) => {
        const meta = getPartyMeta(partyIndex, party.ID, party.Name);
        return (
          meta.name.toLowerCase().includes(search) ||
          meta.abbr.toLowerCase().includes(search)
        );
      }),
    [parties, partyIndex, search],
  );

  const totalSeats = useMemo(
    () => parties.reduce((total, party) => total + partySeats(party), 0),
    [parties],
  );
  const totalCouncils = useMemo(
    () => parties.reduce((total, party) => total + partyCouncils(party), 0),
    [parties],
  );

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <ScreenHeader
        eyebrow="National"
        title="Parties"
        subtitle="Compare support, seats and councils won. Parties appear as soon as they record a vote."
      />

      <View style={styles.controls}>
        <SegmentedControl options={SORTS} value={sort} onChange={setSort} />
        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder="Search parties"
        />
      </View>

      {!national && loading ? (
        <LoadingState message="Loading party results…" />
      ) : !national && error ? (
        <View style={styles.content}>
          <ErrorState message={error} onRetry={() => void refresh()} />
        </View>
      ) : (
        <View style={styles.content}>
          {error ? (
            <Notice
              tone="warning"
              title="Live updates interrupted"
              message={error}
              style={styles.notice}
            />
          ) : null}
          <View style={styles.summaryRow}>
            <Text style={[styles.count, { color: theme.textMuted }]}>
              {pluralise(parties.length, 'party', 'parties')} with counted votes
            </Text>
            <Text style={[styles.count, { color: theme.textFaint }]}>
              {formatNumber(totalSeats)} seats · {formatNumber(totalCouncils)}{' '}
              councils
            </Text>
          </View>

          <Card padded={false} style={styles.card}>
            {filtered.length === 0 ? (
              <EmptyState
                compact
                icon="search-outline"
                title={parties.length === 0 ? 'No party results yet' : 'No parties match'}
                message={
                  parties.length === 0
                    ? 'Standings will appear as voting districts report.'
                    : 'Try a different name or abbreviation.'
                }
              />
            ) : (
              filtered.map((party, index, shown) => {
                const meta = getPartyMeta(partyIndex, party.ID, party.Name);
                const previous = getPreviousSupport(historyIndex, party.ID);
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
                      maxSupport={maxSupport}
                      delta={delta}
                      showSeats
                      showCouncils={sort === 'councils'}
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
        </View>
      )}

      <SourceFooter />
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  content: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  notice: {
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  count: {
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
  },
  rowWrap: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
});
