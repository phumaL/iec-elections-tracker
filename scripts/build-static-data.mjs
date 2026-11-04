#!/usr/bin/env node
/**
 * Regenerates the small, static reference data bundled with the app.
 *
 * Two IEC files are large but almost entirely static:
 *   - PartyList.js           ~470 KB (2,336 parties across all elections)
 *   - HistoryYearsNational   ~1.4 MB (2000-2021, including every municipality)
 *
 * The app only needs the parties contesting 2026 and their national/provincial
 * history, which is a few kilobytes. Bundling that removes two large downloads
 * from the first run and from every cold start.
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

async function main() {
  console.log('Reading the live IEC feeds…');
  const [national, partyList, history] = await Promise.all([
    getJson(NATIONAL),
    getJson(PARTY_LIST),
    getJson(HISTORY),
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

  const generatedAt = new Date().toISOString();

  const partiesFile = `/**
 * GENERATED FILE — do not edit by hand.
 *
 * Regenerate with: node scripts/build-static-data.mjs
 *
 * Only the ${parties.length} parties contesting the 2026 municipal election are
 * bundled, rather than all 2,336 entries in the IEC's 470 KB PartyList.js.
 * Generated ${generatedAt}.
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

  await Promise.all([
    writeFile(path.join(root, 'src/data/parties.ts'), partiesFile, 'utf8'),
    writeFile(path.join(root, 'src/data/history.ts'), historyFile, 'utf8'),
  ]);

  console.log(
    `Wrote ${parties.length} parties, ${nationalHistory.length} national history rows and ${provinceHistory.length} provincial history rows.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
