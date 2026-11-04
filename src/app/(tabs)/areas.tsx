import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AreaRow } from '@/components/ui/AreaRow';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/Headers';
import { SearchField } from '@/components/ui/SearchField';
import {
  SegmentedControl,
  type SegmentedOption,
} from '@/components/ui/SegmentedControl';
import { SourceFooter } from '@/components/ui/SourceFooter';
import { EmptyState, ErrorState, LoadingState, Notice } from '@/components/ui/States';
import { useResults } from '@/context/results';
import {
  getAllMunicipalities,
  getProvinces,
  partySupport,
  pickLeadingParty,
  votesCounted,
} from '@/lib/derive';
import { formatNumber } from '@/lib/format';
import { getPartyMeta } from '@/lib/parties';
import { radius, spacing, useTheme } from '@/theme';

type AreaMode = 'provinces' | 'municipalities';

const MODES: readonly SegmentedOption<AreaMode>[] = [
  { key: 'provinces', label: 'Provinces' },
  { key: 'municipalities', label: 'Municipalities' },
];

export default function AreasScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { national, partyIndex, loading, refreshing, error, refresh } = useResults();
  const [mode, setMode] = useState<AreaMode>('provinces');
  const [query, setQuery] = useState('');

  const provinces = useMemo(() => getProvinces(national), [national]);
  const municipalities = useMemo(
    () => getAllMunicipalities(national),
    [national],
  );

  const search = query.trim().toLowerCase();

  const filteredProvinces = useMemo(
    () =>
      provinces.filter((province) =>
        province.Province.toLowerCase().includes(search),
      ),
    [provinces, search],
  );

  const filteredMunicipalities = useMemo(
    () =>
      municipalities.filter(
        (municipality) =>
          municipality.Municipality.toLowerCase().includes(search) ||
          municipality.Province.toLowerCase().includes(search),
      ),
    [municipalities, search],
  );

  return (
    <Screen tabBar onRefresh={refresh} refreshing={refreshing}>
      <ScreenHeader
        eyebrow="Explore"
        title="Areas"
        subtitle="Drill down from a province to a municipality."
      />

      <View style={styles.controls}>
        <SegmentedControl options={MODES} value={mode} onChange={setMode} />
        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder={
            mode === 'provinces'
              ? 'Search provinces'
              : 'Search municipality or province'
          }
        />
      </View>

      {!national && loading ? (
        <LoadingState message="Loading areas…" />
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
          <Text style={[styles.count, { color: theme.textMuted }]}>
            {mode === 'provinces'
              ? `${formatNumber(filteredProvinces.length)} provinces`
              : `${formatNumber(filteredMunicipalities.length)} of ${formatNumber(
                  municipalities.length,
                )} municipalities`}
          </Text>

          <Card padded={false} style={styles.card}>
            {mode === 'provinces' ? (
              filteredProvinces.length === 0 ? (
                <EmptyState
                  compact
                  icon="search-outline"
                  title="No provinces match"
                  message="Try a different search."
                />
              ) : (
                filteredProvinces.map((province) => {
                  const leading = pickLeadingParty(province.PartyBallotResults);
                  const meta = leading
                    ? getPartyMeta(partyIndex, leading.ID, leading.Name)
                    : null;

                  return (
                    <View key={province.ProvinceID} style={styles.rowWrap}>
                      <AreaRow
                        title={province.Province}
                        subtitle={`${formatNumber(
                          province.MunicipalityResults.length,
                        )} municipalities`}
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
                })
              )
            ) : filteredMunicipalities.length === 0 ? (
              <EmptyState
                compact
                icon="search-outline"
                title="No municipalities match"
                message="Try a different name or province."
              />
            ) : (
              filteredMunicipalities.map((municipality) => {
                const leading = pickLeadingParty(
                  municipality.PartyBallotResults,
                );
                const meta = leading
                  ? getPartyMeta(partyIndex, leading.ID, leading.Name)
                  : null;

                return (
                  <View
                    key={municipality.MunicipalityID}
                    style={styles.rowWrap}
                  >
                    <AreaRow
                      title={municipality.Municipality}
                      subtitle={municipality.Province}
                      leadingMeta={meta}
                      leadingSupport={leading ? partySupport(leading) : null}
                      percent={votesCounted(municipality)}
                      onPress={() =>
                        router.push({
                          pathname: '/municipality/[id]',
                          params: { id: String(municipality.MunicipalityID) },
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
  count: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: spacing.sm,
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
