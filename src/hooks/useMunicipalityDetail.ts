import { useCallback, useEffect, useRef, useState } from 'react';

import { describeError, fetchMunicipalityResults } from '@/api/iec';
import type { MunicipalityResult } from '@/types/iec';

/**
 * Municipality files contain every ward and voting district and can be 17 MB.
 * Keeping a single slot means a person can move between summary screens freely
 * without the previous download staying in memory.
 */
let cachedId: string | null = null;
let cachedData: MunicipalityResult | null = null;
let cachedAt = 0;

interface DetailState {
  key: string;
  data: MunicipalityResult | null;
  loading: boolean;
  error: string | null;
  fromCache: boolean;
  savedAt: number | null;
}

function initialState(key: string): DetailState {
  const isCached = key !== '' && cachedId === key && cachedData !== null;

  return {
    key,
    data: isCached ? cachedData : null,
    loading: false,
    error: null,
    fromCache: isCached,
    savedAt: isCached ? cachedAt : null,
  };
}

interface UseMunicipalityDetailResult {
  data: MunicipalityResult | null;
  loading: boolean;
  error: string | null;
  fromCache: boolean;
  cachedAt: number | null;
  load: () => Promise<MunicipalityResult | null>;
  refresh: () => Promise<MunicipalityResult | null>;
}

export function useMunicipalityDetail(
  id: string | number | null | undefined,
): UseMunicipalityDetailResult {
  const key = id == null ? '' : String(id);
  const [state, setState] = useState<DetailState>(() => initialState(key));
  const controllerRef = useRef<AbortController | null>(null);

  // A new route id or unmount cancels the previous large download.
  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, [key]);

  const load = useCallback(
    async (force = false): Promise<MunicipalityResult | null> => {
      if (!key) return null;

      if (!force && cachedId === key && cachedData) {
        setState({
          key,
          data: cachedData,
          loading: false,
          error: null,
          fromCache: true,
          savedAt: cachedAt,
        });
        return cachedData;
      }

      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      setState((previous) => ({
        ...(previous.key === key ? previous : initialState(key)),
        key,
        loading: true,
        error: null,
      }));

      try {
        const result = await fetchMunicipalityResults(key, controller.signal);
        if (controller.signal.aborted) return null;

        cachedId = key;
        cachedData = result;
        cachedAt = Date.now();

        setState({
          key,
          data: result,
          loading: false,
          error: null,
          fromCache: false,
          savedAt: cachedAt,
        });
        return result;
      } catch (caught) {
        if (!controller.signal.aborted) {
          setState((previous) => ({
            ...(previous.key === key ? previous : initialState(key)),
            key,
            loading: false,
            error: describeError(caught),
          }));
        }
        return null;
      } finally {
        if (controllerRef.current === controller) {
          controllerRef.current = null;
        }
      }
    },
    [key],
  );

  const refresh = useCallback(() => load(true), [load]);

  // When the route id changes we render from the matching cache immediately,
  // without synchronously setting state from an effect.
  const current = state.key === key ? state : initialState(key);

  return {
    data: current.data,
    loading: current.loading,
    error: current.error,
    fromCache: current.fromCache,
    cachedAt: current.savedAt,
    load: () => load(false),
    refresh,
  };
}
