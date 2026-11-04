import AsyncStorage from '@react-native-async-storage/async-storage';

import type { HistoryData, NationalResult } from '@/types/iec';

export interface CacheEnvelope<T> {
  savedAt: number;
  data: T;
}

/**
 * The national file is polled, so it also carries the HTTP validators needed
 * to turn an unchanged poll into a body-less 304 response.
 */
export interface NationalCacheEnvelope extends CacheEnvelope<NationalResult> {
  etag?: string | null;
  lastModified?: string | null;
  checkedAt?: number;
}

export const STORAGE_KEYS = {
  settings: 'iec.settings.v1',
  national: 'iec.national.v1',
  partyList: 'iec.partyList.v1',
  history: 'iec.history.v1',
  historySavedAt: 'iec.history.savedAt.v1',
} as const;

export async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function writeJson(key: string, value: unknown): Promise<boolean> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export async function removeKey(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // Cache removal is best effort; never block the UI on it.
  }
}

/**
 * The national feed carries empty WardResults arrays, but stripping them
 * keeps the offline snapshot comfortably inside AsyncStorage limits.
 */
export function compactNational(national: NationalResult): NationalResult {
  return {
    ...national,
    ProvinceResults: national.ProvinceResults.map((province) => ({
      ...province,
      MunicipalityResults: province.MunicipalityResults.map((municipality) => ({
        ...municipality,
        WardResults: [],
      })),
    })),
  };
}

/**
 * Only the national and provincial history is used by the app. Storing the
 * 8 000+ municipal rows would triple the cache for no visible benefit.
 */
export function compactHistory(history: HistoryData): HistoryData {
  return {
    National: history.National ?? [],
    Provinces: history.Provinces ?? [],
    Municipalities: [],
  };
}
