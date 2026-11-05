import {
  BUNDLED_MUNICIPALITIES,
  PROVINCE_NAMES,
} from '@/data/municipalities';
import { clampPercent, toFiniteNumber } from '@/lib/format';
import {
  INDEPENDENT_PARTY_ID,
  OTHER_PARTY_ID,
} from '@/lib/parties';
import type {
  CouncilStatus,
  HistoryData,
  HistoryPoint,
  HistoryRow,
  MunicipalityResult,
  NationalResult,
  PartyResult,
  ProgressFields,
  ProvinceResult,
  WardResult,
} from '@/types/iec';

export const HISTORY_YEARS = [2000, 2006, 2011, 2016, 2021] as const;

export type PartyMetric = 'support' | 'votes' | 'seats' | 'councils';

export function partyId(party: PartyResult): string {
  return String(party.ID);
}

export function partyVotes(party: PartyResult): number {
  return toFiniteNumber(party.TotalValidVotes);
}

export function partySupport(party: PartyResult): number {
  return toFiniteNumber(party.PercOfVotes);
}

export function partySeats(party: PartyResult): number {
  return toFiniteNumber(party.TotalSeatsWon);
}

export function partyCouncils(party: PartyResult): number {
  return toFiniteNumber(party.CouncilsWon);
}

export function partyMajorities(party: PartyResult): number {
  return toFiniteNumber(party.MajorityWon);
}

function resultWeight(party: PartyResult): number {
  return (
    partyVotes(party) +
    partySeats(party) * 10_000 +
    partyCouncils(party) * 100_000
  );
}

/** The feed can contain placeholder entries sharing an id; keep the fullest one. */
export function uniquePartyResults(results: PartyResult[] | undefined): PartyResult[] {
  const byId = new Map<string, PartyResult>();

  for (const party of results ?? []) {
    if (!party || party.ID == null) continue;

    const id = partyId(party);
    const current = byId.get(id);

    if (!current || resultWeight(party) > resultWeight(current)) {
      byId.set(id, party);
    }
  }

  return [...byId.values()];
}

function metricValue(party: PartyResult, metric: PartyMetric): number {
  switch (metric) {
    case 'votes':
      return partyVotes(party);
    case 'seats':
      return partySeats(party);
    case 'councils':
      return partyCouncils(party);
    case 'support':
    default:
      return partySupport(party);
  }
}

export function sortParties(
  results: PartyResult[] | undefined,
  metric: PartyMetric = 'support',
  includeOther = false,
): PartyResult[] {
  return uniquePartyResults(results)
    .filter((party) => includeOther || partyId(party) !== OTHER_PARTY_ID)
    .sort((left, right) => {
      const difference = metricValue(right, metric) - metricValue(left, metric);
      if (difference !== 0) return difference;

      const supportDifference = partySupport(right) - partySupport(left);
      if (supportDifference !== 0) return supportDifference;

      const seatsDifference = partySeats(right) - partySeats(left);
      if (seatsDifference !== 0) return seatsDifference;

      return partyVotes(right) - partyVotes(left);
    });
}

export function pickLeadingParty(
  results: PartyResult[] | undefined,
): PartyResult | null {
  const parties = uniquePartyResults(results).filter(
    (party) => partyId(party) !== OTHER_PARTY_ID,
  );

  if (parties.length === 0) return null;

  const hasSeats = parties.some((party) => partySeats(party) > 0);
  return sortParties(parties, hasSeats ? 'seats' : 'support')[0] ?? null;
}

export function findPartyResult(
  results: PartyResult[] | undefined,
  id: number | string,
): PartyResult | null {
  const key = String(id);
  return (results ?? []).find((party) => partyId(party) === key) ?? null;
}

export function getMunicipalityCouncilStatus(
  municipality: MunicipalityResult | null | undefined,
): CouncilStatus {
  if (!municipality) {
    return {
      key: 'counting',
      label: 'Counting in progress',
      seatsAllocated: 0,
      seatsAvailable: 0,
      leadingSeats: 0,
    };
  }

  const parties = uniquePartyResults(municipality.PartyBallotResults);
  const seatsAvailable = parties.reduce(
    (highest, party) => Math.max(highest, toFiniteNumber(party.AvailableSeats)),
    0,
  );
  const seatsAllocated = parties.reduce(
    (total, party) => total + partySeats(party),
    0,
  );
  const leadingSeats = parties.reduce(
    (highest, party) => Math.max(highest, partySeats(party)),
    0,
  );

  if (toFiniteNumber(municipality.MajorityCouncils) > 0) {
    return {
      key: 'controlled',
      label: 'Majority control',
      seatsAllocated,
      seatsAvailable,
      leadingSeats,
    };
  }

  if (toFiniteNumber(municipality.DeadLockDrawnCouncils) > 0) {
    return {
      key: 'drawn',
      label: 'Drawn council',
      seatsAllocated,
      seatsAvailable,
      leadingSeats,
    };
  }

  if (toFiniteNumber(municipality.HungCouncils) > 0) {
    return {
      key: 'hung',
      label: 'Hung council',
      seatsAllocated,
      seatsAvailable,
      leadingSeats,
    };
  }

  if (seatsAvailable > 0 && seatsAllocated > 0) {
    if (leadingSeats * 2 > seatsAvailable) {
      return {
        key: 'controlled',
        label: 'Majority control',
        seatsAllocated,
        seatsAvailable,
        leadingSeats,
      };
    }

    if (leadingSeats * 2 === seatsAvailable) {
      return {
        key: 'drawn',
        label: 'Drawn council',
        seatsAllocated,
        seatsAvailable,
        leadingSeats,
      };
    }

    if (seatsAllocated >= seatsAvailable) {
      return {
        key: 'hung',
        label: 'Hung council',
        seatsAllocated,
        seatsAvailable,
        leadingSeats,
      };
    }
  }

  return {
    key: 'counting',
    label: 'Counting in progress',
    seatsAllocated,
    seatsAvailable,
    leadingSeats,
  };
}

/** The dashboard treats voting-district completion as "votes counted". */
export function votesCounted(value: {
  Perc_VDsComplete?: number;
} | null | undefined): number {
  return clampPercent(value?.Perc_VDsComplete);
}

/**
 * The live 2026 feed only contains municipalities that already have counted
 * votes. Reference data from the completed 2021 election fills in the rest, so
 * the UI can show every municipality and mark the ones still waiting.
 */
const EMPTY_PROGRESS: ProgressFields = {
  ProvinceExpected: 0,
  MunicExpected: 0,
  WardExpected: 0,
  VDExpected: 0,
  SeatsExpected: 0,
  ProvincesComplete: 0,
  MuncipalitiesComplete: 0,
  WardsComplete: 0,
  VDsComplete: 0,
  SeatsComplete: 0,
  Perc_ProvinceComplete: 0,
  Perc_MunicipalityComplete: 0,
  Perc_WardsComplete: 0,
  Perc_VDsComplete: 0,
  Perc_SeatsComplete: 0,
  HungCouncils: 0,
  DeadLockDrawnCouncils: 0,
  MajorityCouncils: 0,
  TotalDrawnCouncils: 0,
  RegPop: 0,
};

function pendingMunicipality(
  municipalityId: number,
  name: string,
  provinceId: number,
): MunicipalityResult {
  return {
    ...EMPTY_PROGRESS,
    ProvinceID: provinceId,
    Province: PROVINCE_NAMES[provinceId] ?? '',
    MunicipalityID: municipalityId,
    Municipality: name,
    WardResults: [],
    PartyBallotResults: [],
  };
}

export function getAllMunicipalities(
  national: NationalResult | null | undefined,
): MunicipalityResult[] {
  if (!national) return [];

  const byId = new Map<number, MunicipalityResult>();

  for (const province of national.ProvinceResults) {
    for (const municipality of province.MunicipalityResults ?? []) {
      byId.set(Number(municipality.MunicipalityID), {
        ...municipality,
        Province: municipality.Province || province.Province,
        ProvinceID: municipality.ProvinceID || province.ProvinceID,
      });
    }
  }

  for (const [municipalityId, name, provinceId] of BUNDLED_MUNICIPALITIES) {
    if (!byId.has(municipalityId)) {
      byId.set(
        municipalityId,
        pendingMunicipality(municipalityId, name, provinceId),
      );
    }
  }

  return [...byId.values()].sort((left, right) =>
    left.Municipality.localeCompare(right.Municipality, 'en', {
      sensitivity: 'base',
    }),
  );
}

export function getMunicipalitiesForProvince(
  national: NationalResult | null | undefined,
  provinceId: number | string,
): MunicipalityResult[] {
  return getAllMunicipalities(national).filter(
    (municipality) => String(municipality.ProvinceID) === String(provinceId),
  );
}

/** True once a municipality has at least one counted party result. */
export function hasMunicipalityResults(
  municipality: MunicipalityResult,
): boolean {
  return (municipality.PartyBallotResults?.length ?? 0) > 0;
}

/** How many municipalities already have results in the live feed. */
export function municipalitiesReporting(
  national: NationalResult | null | undefined,
): number {
  return (national?.ProvinceResults ?? []).reduce(
    (total, province) => total + (province.MunicipalityResults?.length ?? 0),
    0,
  );
}

export function getProvinces(
  national: NationalResult | null | undefined,
): ProvinceResult[] {
  return [...(national?.ProvinceResults ?? [])].sort((left, right) =>
    left.Province.localeCompare(right.Province, 'en', { sensitivity: 'base' }),
  );
}

export function getWardNumber(wardId: number | string): string {
  const numeric = toFiniteNumber(wardId);
  const number = numeric % 1000;
  return String(number).padStart(3, '0');
}

export function sortWards(wards: WardResult[] | undefined): WardResult[] {
  return [...(wards ?? [])].sort(
    (left, right) => toFiniteNumber(left.WardID) - toFiniteNumber(right.WardID),
  );
}

export interface HistoryIndex {
  national: Map<string, Map<number, number>>;
  provinces: Map<string, Map<number, number>>;
  municipalities: Map<string, Map<number, number>>;
}

function addHistoryRows(
  rows: HistoryRow[] | undefined,
  target: Map<string, Map<number, number>>,
  withArea: boolean,
): void {
  for (const row of rows ?? []) {
    if (!row || row.lPartyId == null || row.lYear == null) continue;

    const areaId = withArea
      ? String(row.lProvinceId ?? row.lMunicipalityId ?? '')
      : '';
    const key = areaId ? `${areaId}:${row.lPartyId}` : String(row.lPartyId);
    let years = target.get(key);

    if (!years) {
      years = new Map<number, number>();
      target.set(key, years);
    }

    years.set(
      toFiniteNumber(row.lYear),
      toFiniteNumber(row.iPercentageSupport),
    );
  }
}

export function buildHistoryIndex(
  history: HistoryData | null | undefined,
): HistoryIndex | null {
  if (!history) return null;

  const national = new Map<string, Map<number, number>>();
  const provinces = new Map<string, Map<number, number>>();
  const municipalities = new Map<string, Map<number, number>>();

  addHistoryRows(history.National, national, false);
  addHistoryRows(history.Provinces, provinces, true);
  addHistoryRows(history.Municipalities, municipalities, true);

  return { national, provinces, municipalities };
}

/**
 * Builds the same index from the compact tuples bundled in
 * `src/data/history.ts`, avoiding a 1.4 MB download at runtime.
 */
export function buildBundledHistoryIndex(
  nationalRows: readonly (readonly [number, number, number])[],
  provinceRows: readonly (readonly [number, number, number, number])[],
): HistoryIndex {
  const national = new Map<string, Map<number, number>>();
  const provinces = new Map<string, Map<number, number>>();

  for (const [year, party, percentage] of nationalRows) {
    const key = String(party);
    let years = national.get(key);
    if (!years) {
      years = new Map<number, number>();
      national.set(key, years);
    }
    years.set(year, percentage);
  }

  for (const [year, party, province, percentage] of provinceRows) {
    const key = `${province}:${party}`;
    let years = provinces.get(key);
    if (!years) {
      years = new Map<number, number>();
      provinces.set(key, years);
    }
    years.set(year, percentage);
  }

  return { national, provinces, municipalities: new Map() };
}

function historyMapFor(
  index: HistoryIndex,
  scope: 'national' | 'province' | 'municipality',
  areaId?: number | string,
): Map<string, Map<number, number>> {
  if (scope === 'province') return index.provinces;
  if (scope === 'municipality') return index.municipalities;
  return index.national;
}

function historyKey(
  scope: 'national' | 'province' | 'municipality',
  partyIdValue: number | string,
  areaId?: number | string,
): string {
  const id = String(partyIdValue);
  return scope === 'national' ? id : `${areaId ?? ''}:${id}`;
}

export function getHistorySeries(
  index: HistoryIndex | null | undefined,
  scope: 'national' | 'province' | 'municipality',
  partyIdValue: number | string,
  areaId?: number | string,
): HistoryPoint[] {
  if (!index) return [];

  const map = historyMapFor(index, scope, areaId);
  const years = map.get(historyKey(scope, partyIdValue, areaId));

  if (!years) return [];

  return HISTORY_YEARS.map((year) => ({
    year,
    value: years.get(year) ?? 0,
  }));
}

export function getPreviousSupport(
  index: HistoryIndex | null | undefined,
  partyIdValue: number | string,
  scope: 'national' | 'province' | 'municipality' = 'national',
  areaId?: number | string,
): { year: number; value: number } | null {
  if (!index) return null;

  const map = historyMapFor(index, scope, areaId);
  const years = map.get(historyKey(scope, partyIdValue, areaId));

  if (!years) return null;

  const value2021 = years.get(2021);
  if (value2021 != null) return { year: 2021, value: value2021 };

  const value2016 = years.get(2016);
  if (value2016 != null) return { year: 2016, value: value2016 };

  return null;
}

export function deltaFromPrevious(
  current: number,
  previous: { value: number } | null | undefined,
): number | null {
  if (!previous) return null;
  return current - previous.value;
}

export function isIndependentParty(id: number | string): boolean {
  return String(id) === INDEPENDENT_PARTY_ID;
}

export function isOtherParty(id: number | string): boolean {
  return String(id) === OTHER_PARTY_ID;
}
