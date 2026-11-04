import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { describeError, fetchNationalResults } from '@/api/iec';
import { useSettings } from '@/context/settings';
import { BUNDLED_NATIONAL_HISTORY, BUNDLED_PROVINCE_HISTORY } from '@/data/history';
import { BUNDLED_PARTIES } from '@/data/parties';
import { buildBundledHistoryIndex, type HistoryIndex } from '@/lib/derive';
import { buildPartyIndex } from '@/lib/parties';
import {
  compactNational,
  readJson,
  removeKey,
  STORAGE_KEYS,
  writeJson,
  type NationalCacheEnvelope,
} from '@/lib/storage';
import type { NationalResult, PartyInfo, PartyMeta } from '@/types/iec';

const PARTY_INDEX = buildPartyIndex(BUNDLED_PARTIES);
const HISTORY_INDEX: HistoryIndex = buildBundledHistoryIndex(
  BUNDLED_NATIONAL_HISTORY,
  BUNDLED_PROVINCE_HISTORY,
);

/** Don't do a redundant network round-trip when returning to the app quickly. */
const FOREGROUND_REFRESH_MIN_AGE = 15_000;
const MAX_BACKOFF_MS = 5 * 60_000;

interface ResultsContextValue {
  national: NationalResult | null;
  partyList: PartyInfo[];
  partyIndex: Map<string, PartyMeta>;
  historyIndex: HistoryIndex | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  /** Last successful check, including a body-less 304. */
  lastFetchedAt: number | null;
  /** True while showing the on-device snapshot and no successful sync yet. */
  fromCache: boolean;
  refresh: () => Promise<void>;
  clearCache: () => Promise<void>;
}

const ResultsContext = createContext<ResultsContextValue | null>(null);

export function ResultsProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();

  const [national, setNational] = useState<NationalResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCount, setErrorCount] = useState(0);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [appActive, setAppActive] = useState(
    AppState.currentState === 'active',
  );
  const [pollTick, setPollTick] = useState(0);

  const mountedRef = useRef(true);
  const nationalRef = useRef<NationalResult | null>(null);
  const etagRef = useRef<string | null>(null);
  const lastModifiedRef = useRef<string | null>(null);
  const lastCheckedRef = useRef(0);
  const refreshInFlightRef = useRef(false);

  const refresh = useCallback(async () => {
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;

    if (mountedRef.current) {
      setRefreshing(true);
      setError(null);
    }

    try {
      const validators = nationalRef.current
        ? {
            etag: etagRef.current,
            lastModified: lastModifiedRef.current,
          }
        : {};

      const result = await fetchNationalResults(undefined, validators);
      const checkedAt = Date.now();

      if (!mountedRef.current) return;

      if (result.notModified) {
        // A 304 confirms the cached snapshot is current without a body.
        etagRef.current = result.etag;
        lastModifiedRef.current = result.lastModified;
        lastCheckedRef.current = checkedAt;
        setLastFetchedAt(checkedAt);
        setFromCache(false);
        setErrorCount(0);
        return;
      }

      if (!result.data) {
        throw new Error('The IEC results service returned no data.');
      }

      nationalRef.current = result.data;
      setNational(result.data);
      etagRef.current = result.etag;
      lastModifiedRef.current = result.lastModified;
      lastCheckedRef.current = checkedAt;
      setLastFetchedAt(checkedAt);
      setFromCache(false);
      setErrorCount(0);

      void writeJson(STORAGE_KEYS.national, {
        savedAt: checkedAt,
        checkedAt,
        data: compactNational(result.data),
        etag: result.etag,
        lastModified: result.lastModified,
      } satisfies NationalCacheEnvelope);
    } catch (caught) {
      if (mountedRef.current) {
        setError(describeError(caught));
        setErrorCount((count) => count + 1);
      }
    } finally {
      refreshInFlightRef.current = false;
      if (mountedRef.current) {
        setRefreshing(false);
        setLoading(false);
      }
    }
  }, []);

  const clearCache = useCallback(async () => {
    await removeKey(STORAGE_KEYS.national);
    await Promise.all([
      removeKey(STORAGE_KEYS.history),
      removeKey(STORAGE_KEYS.historySavedAt),
      removeKey(STORAGE_KEYS.partyList),
    ]);
    // Next refresh must fetch a full body because the validators are gone.
    etagRef.current = null;
    lastModifiedRef.current = null;
  }, []);

  // Hydrate the on-device snapshot before the first network call.
  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    const boot = async () => {
      const cached = await readJson<NationalCacheEnvelope>(
        STORAGE_KEYS.national,
      );

      if (cancelled) return;

      if (cached?.data) {
        nationalRef.current = cached.data;
        etagRef.current = cached.etag ?? null;
        lastModifiedRef.current = cached.lastModified ?? null;
        lastCheckedRef.current = cached.checkedAt ?? cached.savedAt ?? 0;
        setNational(cached.data);
        setLastFetchedAt(cached.checkedAt ?? cached.savedAt ?? null);
        setFromCache(true);
        setLoading(false);
      }

      await refresh();
    };

    void boot();

    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, [refresh]);

  // Foreground refresh, but skip if the last check was only seconds ago.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      const active = state === 'active';
      setAppActive(active);

      if (
        active &&
        settings.refreshInterval !== 0 &&
        Date.now() - lastCheckedRef.current > FOREGROUND_REFRESH_MIN_AGE
      ) {
        void refresh();
      }
    });

    return () => subscription.remove();
  }, [refresh, settings.refreshInterval]);

  // Adaptive polling: back off when the IEC service is failing or offline.
  useEffect(() => {
    if (!appActive || settings.refreshInterval === 0) return;

    const base = settings.refreshInterval * 1000;
    const wait =
      errorCount > 0
        ? Math.min(base * 2 ** Math.min(errorCount, 3), MAX_BACKOFF_MS)
        : base;

    const timer = setTimeout(() => {
      void refresh().finally(() => {
        if (mountedRef.current) setPollTick((tick) => tick + 1);
      });
    }, wait);

    return () => clearTimeout(timer);
  }, [
    appActive,
    errorCount,
    lastFetchedAt,
    pollTick,
    refresh,
    settings.refreshInterval,
  ]);

  const value = useMemo<ResultsContextValue>(
    () => ({
      national,
      partyList: BUNDLED_PARTIES,
      partyIndex: PARTY_INDEX,
      historyIndex: HISTORY_INDEX,
      loading,
      refreshing,
      error,
      lastFetchedAt,
      fromCache,
      refresh,
      clearCache,
    }),
    [national, loading, refreshing, error, lastFetchedAt, fromCache, refresh, clearCache],
  );

  return (
    <ResultsContext.Provider value={value}>{children}</ResultsContext.Provider>
  );
}

export function useResults(): ResultsContextValue {
  const value = useContext(ResultsContext);

  if (!value) {
    throw new Error('useResults must be used inside ResultsProvider');
  }

  return value;
}
