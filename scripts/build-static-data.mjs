#!/usr/bin/env node
/**
 * Regenerates the small, static reference data bundled with the app.
 *
 * Three IEC files are large but almost entirely static:
 *   - PartyList.js           ~470 KB (2,336 parties across all elections)
 *   - HistoryYearsNational   ~1.4 MB (2000-2021, including every municipality)
 *   - 2021 LiteMapsNational   ~250 KB (all 213 municipalities, completed count)
 *
 * The app only needs party metadata, national/provincial history and the
 * municipality list, which is a few kilobytes. Bundling that removes three
 * large downloads from the first run and from every cold start.
 *
 * The 2026 feed itself is sparse: it only contains municipalities and parties
 * that already have counted votes. The completed 2021 feed is used as the
 * reference list so the UI can show every municipality, including those still
 * waiting for their first result.
 *
 * Usage:
 *   node scripts/build-static-data.mjs
 *
 * Re-run only if the 2026 candidate lists or historical files change. The
 * script reads the live national feed to discover the 2026 party ids, so it
 * must run after nominations are published.
 */

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const BASE = 'https://results.elections.org.za/dashboards/lge';
const NATIONAL = `${BASE}/MapsJason/2026/EEID1887LiteMapsNational.js`;
const PARTY_LIST = `${BASE}/MapsJason/2016/PartyList.js`;
const HISTORY = `${BASE}/MapsJason/HistoryYears/HistoryYearsNational.js`;
/** The 2021 election is complete, so this lists all 213 municipalities. */
const MUNICIPALITY_REFERENCE = `${BASE}/MapsJason/2021/EEID1091LiteMapsNational.js`;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function getJson(url) {
  const response = await fetch(url, {
    headers: { Accept: 'application/javascript, application/json, */*' },
  });

  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }

  return JSON.parse((await response.text()).replace(/^\uFEFF/, '').trim());
}

function collectPartyIds(national) {
  const ids = new Set();

  const add = (parties) => {
    for (const party of parties ?? []) {
      if (party?.ID != null) ids.add(String(party.ID));
    }
  };

  add(national.PartyBallotResults);

  for (const province of national.ProvinceResults ?? []) {
    add(province.PartyBallotResults);
    for (const municipality of province.MunicipalityResults ?? []) {
      add(municipality.PartyBallotResults);
    }
  }

  return ids;
}

function pickBestPartyEntries(list) {
  const best = new Map();

  for (const entry of list ?? []) {
    if (!entry || entry.ID == null) continue;

    const score =
      (entry.PartyFullName ? 2 : 0) +
      (entry.PartyImage ? 2 : 0) +
      (entry.sWebColour ? 1 : 0);
    const current = best.get(String(entry.ID));

    if (!current || score > current.score) {
      best.set(String(entry.ID), { score, entry });
    }
  }

  return best;
}

function format(value) {
  return JSON.stringify(value);
}

function collectMunicipalities(reference) {
  const provinces = new Map();
  const municipalities = [];

  for (const province of reference.ProvinceResults ?? []) {
    provinces.set(province.ProvinceID, province.Province);

    for (const municipality of province.MunicipalityResults ?? []) {
      municipalities.push([
        municipality.MunicipalityID,
        municipality.Municipality,
        municipality.ProvinceID ?? province.ProvinceID,
      ]);
    }
  }

  municipalities.sort((left, right) =>
    String(left[1]).localeCompare(String(right[1]), 'en', {
      sensitivity: 'base',
    }),
  );

  return { provinces, municipalities };
}

async function main() {
  console.log('Reading the live IEC feeds…');
  const [national, partyList, history, municipalityReference] = await Promise.all([
    getJson(NATIONAL),
    getJson(PARTY_LIST),
    getJson(HISTORY),
    getJson(MUNICIPALITY_REFERENCE),
  ]);

  const ids = collectPartyIds(national);
  const best = pickBestPartyEntries(partyList);

  const parties = [...ids]
    .map((id) => best.get(id)?.entry)
    .filter(Boolean)
    .map((entry) => ({
      ID: entry.ID,
      Name: entry.Name,
      PartyFullName: entry.PartyFullName,
      sWebColour: entry.sWebColour,
      PartyImage: entry.PartyImage,
    }))
    .sort((left, right) => left.ID - right.ID);

  const nationalHistory = (history.National ?? [])
    .filter((row) => ids.has(String(row.lPartyId)) && row.iPercentageSupport > 0)
    .map((row) => [row.lYear, row.lPartyId, row.iPercentageSupport]);

  const provinceHistory = (history.Provinces ?? [])
    .filter((row) => ids.has(String(row.lPartyId)) && row.iPercentageSupport > 0)
    .map((row) => [
      row.lYear,
      row.lPartyId,
      row.lProvinceId,
      row.iPercentageSupport,
    ]);

  const { provinces, municipalities } = collectMunicipalities(
    municipalityReference,
  );

  const generatedAt = new Date().toISOString();

  const partiesFile = `/**
 * GENERATED FILE — do not edit by hand.
 *
 * Regenerate with: node scripts/build-static-data.mjs
 *
 * The ${parties.length} parties that have appeared in the 2026 results feed are
 * bundled, rather than all 2,336 entries in the IEC's 470 KB PartyList.js.
 * Parties are added here as soon as they record a vote somewhere. Generated ${generatedAt}.
 */
import type { PartyInfo } from '@/types/iec';

export const BUNDLED_PARTIES: PartyInfo[] = ${format(parties)};
`;

  const historyFile = `/**
 * GENERATED FILE — do not edit by hand.
 *
 * Regenerate with: node scripts/build-static-data.mjs
 *
 * National and provincial history for the 2026 parties only. Stored as compact
 * tuples instead of the IEC's 1.4 MB file:
 *   national: [year, partyId, percentage]
 *   province: [year, partyId, provinceId, percentage]
 * Generated ${generatedAt}.
 */

export type NationalHistoryTuple = [year: number, partyId: number, percentage: number];
export type ProvinceHistoryTuple = [
  year: number,
  partyId: number,
  provinceId: number,
  percentage: number,
];

export const BUNDLED_NATIONAL_HISTORY: NationalHistoryTuple[] = ${format(
    nationalHistory,
  )};

export const BUNDLED_PROVINCE_HISTORY: ProvinceHistoryTuple[] = ${format(
    provinceHistory,
  )};
`;

  const municipalitiesFile = `/**
 * GENERATED FILE — do not edit by hand.
 *
 * Regenerate with: node scripts/build-static-data.mjs
 *
 * All ${municipalities.length} municipalities, taken from the completed 2021
 * feed. The live 2026 feed only includes municipalities that have counted
 * votes, so this reference list lets the app show the ones still pending.
 *
 *   municipality: [municipalityId, name, provinceId]
 *
 * Generated ${generatedAt}.
 */

export type MunicipalityRefTuple = [
  municipalityId: number,
  name: string,
  provinceId: number,
];

export const PROVINCE_NAMES: Record<number, string> = ${format(
    Object.fromEntries([...provinces.entries()].sort((left, right) => left[0] - right[0])),
  )};

export const BUNDLED_MUNICIPALITIES: MunicipalityRefTuple[] = ${format(
    municipalities,
  )};
`;

  await Promise.all([
    writeFile(path.join(root, 'src/data/parties.ts'), partiesFile, 'utf8'),
    writeFile(path.join(root, 'src/data/history.ts'), historyFile, 'utf8'),
    writeFile(
      path.join(root, 'src/data/municipalities.ts'),
      municipalitiesFile,
      'utf8',
    ),
  ]);

  console.log(
    `Wrote ${parties.length} parties, ${nationalHistory.length} national history rows, ${provinceHistory.length} provincial history rows and ${municipalities.length} municipalities.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
