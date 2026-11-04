import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AreaRow } from '@/components/ui/AreaRow';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { DetailHeader } from '@/components/ui/Headers';
import { HistoryBars } from '@/components/ui/HistoryBars';
import { PartyLogo } from '@/components/ui/PartyLogo';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Screen } from '@/components/ui/Screen';
import { Section } from '@/components/ui/Section';
import { SourceFooter } from '@/components/ui/SourceFooter';
import { StatTile } from '@/components/ui/StatTile';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/components/ui/States';
import { useResults } from '@/context/results';
import {
  deltaFromPrevious,
  findPartyResult,
  getAllMunicipalities,
  getHistorySeries,
  getPreviousSupport,
  getProvinces,
  isIndependentParty,
  isOtherParty,
  partyCouncils,
  partyMajorities,
  partySeats,
  partySupport,
  partyVotes,
  pickLeadingParty,
  votesCounted,
} from '@/lib/derive';
import {
  formatCompact,
  formatNumber,
  formatPercent,
  formatSignedPercent,
  pluralise,
} from '@/lib/format';
import { getPartyMeta } from '@/lib/parties';
import { spacing, useTheme } from '@/theme';

export default function PartyScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const {
    national,
    partyIndex,
    historyIndex,
    loading,
    refreshing,
    error,
    refresh,
  } = useResults();

  const party = useMemo(
    () => findPartyResult(national?.PartyBallotResults, id ?? ''),
    [national, id],
  );

  const meta = useMemo(
    () => getPartyMeta(partyIndex, id, party?.Name),
    [partyIndex, id, party],
  );

  const provinces = useMemo(() => getProvinces(national), [national]);
  const municipalities = useMemo(
    () => getAllMunicipalities(national),
    [national],
  );

  const provinceSupport = useMemo(
    () =>
      provinces
        .map((province) => {
          const result = findPartyResult(
            province.PartyBallotResults,
            id ?? '',
          );
          return {
            province,
            result,
            support: result ? partySupport(result) : 0,
            votes: result ? partyVotes(result) : 0,
          };
        })
        .filter((entry) => entry.result)
        .sort((left, right) => right.support - left.support),
    [provinces, id],
  );

  const ledMunicipalities = useMemo(
    () =>
      municipalities
        .filter((municipality) => {
          const leading = pickLeadingParty(municipality.PartyBallotResults);
          return leading && String(leading.ID) === String(id);
        })
        .sort((left, right) => {
          const leftParty = findPartyResult(left.PartyBallotResults, id ?? '');
          const rightParty = findPartyResult(right.PartyBallotResults, id ?? '');
          return (
            (rightParty ? partySupport(rightParty) : 0) -
            (leftParty ? partySupport(leftParty) : 0)
          );
        }),
    [municipalities, id],
  );

  if (!national && loading) {
    return (
      <Screen>
        <DetailHeader title="Party" eyebrow="Loading" />
        <LoadingState message="Loading party results…" />
      </Screen>
    );
  }

  if (!national && error) {
    return (
      <Screen>
        <DetailHeader title="Party" eyebrow="Results" />
        <View style={styles.padded}>
          <ErrorState message={error} onRetry={() => void refresh()} />
        </View>
      </Screen>
    );
  }

  if (!party) {
    return (
      <Screen>
        <DetailHeader title="Party" eyebrow="Not found" />
        <View style={styles.padded}>
          <EmptyState
            icon="flag-outline"
            title="Party result not found"
            message="This party is not in the current national result feed."
            action={
              <Pressable
                accessibilityRole="button"
                onPress={() => router.navigate('/parties')}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: theme.primary },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={[styles.primaryLabel, { color: theme.onPrimary }]}>
                  Browse parties
                </Text>
              </Pressable>
            }
          />
        </View>
      </Screen>
    );
  }

  const support = partySupport(party);
  const previous = getPreviousSupport(historyIndex, id ?? '');
  const delta = deltaFromPrevious(support, previous);
  const history = getHistorySeries(historyIndex, 'national', id ?? '');
  const seats = partySeats(party);
  const councils = partyCouncils(party);
  const special = isIndependentParty(id ?? '') || isOtherParty(id ?? '');

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <DetailHeader
        eyebrow={special ? 'Candidate group' : 'Party'}
        title={meta.abbr}
        subtitle={meta.name}
        right={
          <View style={[styles.colorChip, { backgroundColor: meta.color }]}>
            <PartyLogo meta={meta} size={28} />
          </View>
        }
      />

      <View style={styles.padded}>
        <Card style={styles.heroCard}>
          <View style={[styles.accent, { backgroundColor: meta.color }]} />
          <View style={styles.heroTop}>
            <PartyLogo meta={meta} size={58} />
            <View style={styles.heroText}>
              <Text
                accessibilityRole="header"
                style={[styles.heroName, { color: theme.text }]}
              >
                {meta.name}
              </Text>
              <Text style={[styles.heroAbbr, { color: theme.textMuted }]}>
                {meta.abbr}
              </Text>
            </View>
          </View>

          <View style={styles.supportRow}>
            <Text style={[styles.supportValue, { color: theme.text }]}>
              {formatPercent(support, 1)}
            </Text>
            {delta != null && previous ? (
              <Badge
                tone={delta >= 0 ? 'success' : 'danger'}
                label={`${formatSignedPercent(delta, 1)} pts vs ${previous.year}`}
              />
            ) : (
              <Badge tone="neutral" label="No prior comparison" />
            )}
          </View>

          <View style={styles.supportMeta}>
            <Text style={[styles.supportMetaText, { color: theme.textMuted }]}>
              {pluralise(partyVotes(party), 'valid vote')} ·{' '}
              {formatPercent(support, 1)} of the national vote
            </Text>
          </View>

          <View style={styles.statGrid}>
            <StatTile
              compact
              label="Seats"
              value={formatNumber(seats)}
              hint="Total won"
              valueColor={meta.color}
            />
            <StatTile
              compact
              label="Councils"
              value={formatNumber(councils)}
              hint="Won outright"
              valueColor={meta.color}
            />
            <StatTile
              compact
              label="Majorities"
              value={formatNumber(partyMajorities(party))}
              hint="Council majorities"
              valueColor={meta.color}
            />
          </View>
        </Card>
      </View>

      <Section
        title="Historical support"
        subtitle="National share at each municipal election"
      >
        <Card style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={[styles.chartTitle, { color: theme.text }]}>
                {formatPercent(support, 1)} now
              </Text>
              <Text style={[styles.chartHint, { color: theme.textMuted }]}>
                {previous
                  ? `${formatPercent(previous.value, 1)} in ${previous.year}`
                  : 'No previous result on record'}
              </Text>
            </View>
            <Ionicons name="stats-chart" size={18} color={theme.textFaint} />
          </View>
          <HistoryBars
            data={history}
            current={{ year: 2026, value: support }}
            color={meta.color}
          />
          <Text style={[styles.chartFootnote, { color: theme.textFaint }]}>
            Bars show the party&apos;s share of the national vote. 2026 is the
            live count.
          </Text>
        </Card>
      </Section>

      <Section
        title="Support by province"
        subtitle={`${provinceSupport.length} provinces reporting`}
      >
        <Card style={styles.provinceCard}>
          {provinceSupport.length === 0 ? (
            <EmptyState
              compact
              title="No provincial results yet"
              message="Provincial support will appear as votes are counted."
            />
          ) : (
            provinceSupport.map((entry, index) => (
              <Pressable
                key={entry.province.ProvinceID}
                accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: '/province/[id]',
                    params: { id: String(entry.province.ProvinceID) },
                  })
                }
                style={({ pressed }) => [
                  styles.supportLine,
                  index < provinceSupport.length - 1 && {
                    borderBottomColor: theme.border,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                  },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={styles.supportLineText}>
                  <Text
                    numberOfLines={1}
                    style={[styles.supportLineName, { color: theme.text }]}
                  >
                    {entry.province.Province}
                  </Text>
                  <Text
                    style={[styles.supportLineVotes, { color: theme.textFaint }]}
                  >
                    {formatCompact(entry.votes)} votes ·{' '}
                    {formatPercent(votesCounted(entry.province), 0)} counted
                  </Text>
                </View>
                <ProgressBar
                  value={entry.support}
                  color={meta.color}
                  height={5}
                  style={styles.supportLineBar}
                />
                <Text style={[styles.supportLineValue, { color: theme.text }]}>
                  {formatPercent(entry.support, 1)}
                </Text>
              </Pressable>
            ))
          )}
        </Card>
      </Section>

      <Section
        title="Leading in municipalities"
        subtitle={
          ledMunicipalities.length > 0
            ? `${pluralise(ledMunicipalities.length, 'council')} currently led`
            : 'No council leadership yet'
        }
      >
        <Card padded={false} style={styles.listCard}>
          {ledMunicipalities.length === 0 ? (
            <EmptyState
              compact
              icon="location-outline"
              title="Not leading anywhere yet"
              message="This list fills in as municipal counts progress."
            />
          ) : (
            ledMunicipalities.slice(0, 12).map((municipality) => {
              const result = findPartyResult(
                municipality.PartyBallotResults,
                id ?? '',
              );
              return (
                <View
                  key={municipality.MunicipalityID}
                  style={styles.areaWrap}
                >
                  <AreaRow
                    title={municipality.Municipality}
                    subtitle={municipality.Province}
                    leadingMeta={meta}
                    leadingSupport={result ? partySupport(result) : null}
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
            })
          )}
        </Card>
      </Section>

      <SourceFooter />
    </Screen>
  );
}

const styles = StyleSheet.create({
  padded: {
    paddingHorizontal: spacing.lg,
  },
  colorChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    gap: spacing.md,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  accent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  heroText: {
    flex: 1,
    gap: 2,
  },
  heroName: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  heroAbbr: {
    fontSize: 12,
    fontWeight: '700',
  },
  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  supportValue: {
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
    lineHeight: 48,
  },
  supportMeta: {
    marginTop: -spacing.sm,
  },
  supportMetaText: {
    fontSize: 11,
    fontWeight: '500',
  },
  statGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  chartCard: {
    gap: spacing.lg,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  chartHint: {
    fontSize: 11,
    marginTop: 1,
  },
  chartFootnote: {
    fontSize: 10,
    lineHeight: 15,
  },
  provinceCard: {
    paddingVertical: spacing.xs,
  },
  supportLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  supportLineText: {
    width: 120,
    gap: 2,
  },
  supportLineName: {
    fontSize: 12,
    fontWeight: '800',
  },
  supportLineVotes: {
    fontSize: 9,
    fontWeight: '600',
  },
  supportLineBar: {
    flex: 1,
  },
  supportLineValue: {
    width: 48,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  listCard: {
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
