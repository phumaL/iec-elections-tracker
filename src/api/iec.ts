import { Platform } from 'react-native';

import type {
  HistoryData,
  MunicipalityResult,
  NationalResult,
  PartyInfo,
} from '@/types/iec';

/**
 * The IEC results dashboard reads these same files. They are plain JSON
 * served as JavaScript, which is why the paths end in `.js`.
 *
 * Keeping the year and event id here makes the app easy to point at another
 * election later (the dashboard exposes 2000, 2006, 2011, 2016, 2021, 2026).
 */
const BASE_URL = 'https://results.elections.org.za/dashboards/lge';
export const ELECTION_YEAR = 2026;
const EVENT_ID = 'EEID1887';

export const IEC_DASHBOARD_URL = `${BASE_URL}/LGEResultsDashboard.aspx`;
export const IEC_HOME_URL = 'https://results.elections.org.za/home/';

export const ENDPOINTS = {
  national: `${BASE_URL}/MapsJason/${ELECTION_YEAR}/${EVENT_ID}LiteMapsNational.js`,
  municipality: (municipalityId: number | string) =>
    `${BASE_URL}/MapsJason/${ELECTION_YEAR}/${EVENT_ID}Munic${municipalityId}.js`,
  partyList: `${BASE_URL}/MapsJason/2016/PartyList.js`,
  history: `${BASE_URL}/MapsJason/HistoryYears/HistoryYearsNational.js`,
  partyImage: (file: string) =>
    `${BASE_URL}/Party_Images/${encodeURIComponent(file)}`,
};

/**
 * Web browsers cannot call the IEC host directly because it does not send
 * CORS headers. `scripts/iec-proxy.mjs` provides a tiny local proxy. Native
 * builds talk to the IEC host directly.
 */
const PROXY_BASE =
  process.env.EXPO_PUBLIC_IEC_PROXY ||
  (__DEV__ && Platform.OS === 'web' ? 'http://localhost:8787/proxy' : '');

export class IecApiError extends Error {
  status?: number;
  code: 'network' | 'timeout' | 'http' | 'parse' | 'unknown';

  constructor(
    message: string,
    options: {
      status?: number;
      code?: 'network' | 'timeout' | 'http' | 'parse' | 'unknown';
    } = {},
  ) {
    super(message);
    this.name = 'IecApiError';
    this.status = options.status;
    this.code = options.code ?? 'unknown';
  }
}

type RequestOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
  retries?: number;
  cacheBust?: boolean;
};

export interface CacheValidators {
  etag?: string | null;
  lastModified?: string | null;
}

export interface ConditionalResult<T> {
  data: T | null;
  notModified: boolean;
  etag: string | null;
  lastModified: string | null;
}

function withProxy(url: string): string {
  if (!PROXY_BASE) return url;
  const separator = PROXY_BASE.includes('?') ? '&' : '?';
  return `${PROXY_BASE}${separator}url=${encodeURIComponent(url)}`;
}

function cacheBusted(url: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}t=${Date.now()}`;
}

async function requestJson<T>(
  url: string,
  timeoutMs: number,
  externalSignal?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const forwardAbort = () => controller.abort();
  externalSignal?.addEventListener('abort', forwardAbort);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/javascript, application/json, text/plain, */*',
      },
    });

    if (!response.ok) {
      throw new IecApiError(
        `The IEC results service returned HTTP ${response.status}.`,
        { status: response.status, code: 'http' },
      );
    }

    const text = await response.text();
    const clean = text.replace(/^\uFEFF/, '').trim();

    if (!clean) {
      throw new IecApiError('The IEC results service returned an empty file.', {
        code: 'parse',
      });
    }

    try {
      return JSON.parse(clean) as T;
    } catch {
      throw new IecApiError(
        'The IEC results service returned data in an unexpected format.',
        { code: 'parse' },
      );
    }
  } catch (error) {
    if (error instanceof IecApiError) throw error;

    if (timedOut) {
      throw new IecApiError(
        'The IEC results service took too long to respond. Please try again.',
        { code: 'timeout' },
      );
    }

    if (externalSignal?.aborted) {
      throw new IecApiError('Request cancelled.', { code: 'network' });
    }

    throw new IecApiError(
      'Could not reach the IEC results service. Check your connection and try again.',
      { code: 'network' },
    );
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener('abort', forwardAbort);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Conditional GET used for the frequently polled national feed.
 *
 * The IEC host (through Cloudflare) returns an ETag and answers
 * `If-None-Match` with a body-less 304 when nothing changed. That turns a
 * routine poll from ~80 KB (and growing) into a few hundred bytes.
 */
async function conditionalRequest<T>(
  url: string,
  validators: CacheValidators,
  timeoutMs: number,
  externalSignal?: AbortSignal,
): Promise<ConditionalResult<T>> {
  const controller = new AbortController();
  let timedOut = false;

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const forwardAbort = () => controller.abort();
  externalSignal?.addEventListener('abort', forwardAbort);

  const headers: Record<string, string> = {
    Accept: 'application/javascript, application/json, text/plain, */*',
  };

  if (validators.etag) headers['If-None-Match'] = validators.etag;
  if (validators.lastModified) {
    headers['If-Modified-Since'] = validators.lastModified;
  }

  try {
    const response = await fetch(withProxy(url), {
      signal: controller.signal,
      headers,
    });

    const etag = response.headers.get('etag') ?? validators.etag ?? null;
    const lastModified =
      response.headers.get('last-modified') ?? validators.lastModified ?? null;

    if (response.status === 304) {
      return {
        data: null,
        notModified: true,
        etag,
        lastModified,
      };
    }

    if (!response.ok) {
      throw new IecApiError(
        `The IEC results service returned HTTP ${response.status}.`,
        { status: response.status, code: 'http' },
      );
    }

    const text = await response.text();
    const clean = text.replace(/^\uFEFF/, '').trim();

    if (!clean) {
      throw new IecApiError('The IEC results service returned an empty file.', {
        code: 'parse',
      });
    }

    try {
      return {
        data: JSON.parse(clean) as T,
        notModified: false,
        etag,
        lastModified,
      };
    } catch {
      throw new IecApiError(
        'The IEC results service returned data in an unexpected format.',
        { code: 'parse' },
      );
    }
  } catch (error) {
    if (error instanceof IecApiError) throw error;

    if (timedOut) {
      throw new IecApiError(
        'The IEC results service took too long to respond. Please try again.',
        { code: 'timeout' },
      );
    }

    if (externalSignal?.aborted) {
      throw new IecApiError('Request cancelled.', { code: 'network' });
    }

    throw new IecApiError(
      'Could not reach the IEC results service. Check your connection and try again.',
      { code: 'network' },
    );
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener('abort', forwardAbort);
  }
}


export async function fetchJson<T>(
  url: string,
  {
    signal,
    timeoutMs = 20_000,
    retries = 1,
    cacheBust = true,
  }: RequestOptions = {},
): Promise<T> {
  const finalUrl = withProxy(cacheBust ? cacheBusted(url) : url);
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await requestJson<T>(finalUrl, timeoutMs, signal);
    } catch (error) {
      lastError = error;

      if (signal?.aborted) throw error;
      if (error instanceof IecApiError && error.status && error.status < 500) {
        throw error;
      }

      if (attempt < retries) {
        await delay(800);
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new IecApiError('Unknown error while loading results.');
}

export async function fetchNationalResults(
  signal?: AbortSignal,
  validators: CacheValidators = {},
): Promise<ConditionalResult<NationalResult>> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= 1; attempt += 1) {
    try {
      return await conditionalRequest<NationalResult>(
        ENDPOINTS.national,
        validators,
        20_000,
        signal,
      );
    } catch (error) {
      lastError = error;

      if (signal?.aborted) throw error;
      if (error instanceof IecApiError && error.status && error.status < 500) {
        throw error;
      }

      if (attempt === 0) await delay(800);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new IecApiError('Unknown error while loading results.');
}

export function fetchPartyList(signal?: AbortSignal): Promise<PartyInfo[]> {
  return fetchJson<PartyInfo[]>(ENDPOINTS.partyList, {
    signal,
    cacheBust: false,
    timeoutMs: 30_000,
  });
}

export function fetchHistory(signal?: AbortSignal): Promise<HistoryData> {
  return fetchJson<HistoryData>(ENDPOINTS.history, {
    signal,
    cacheBust: false,
    timeoutMs: 60_000,
  });
}

/**
 * Municipality files contain every ward and voting district. They are much
 * larger than the national file (up to roughly 17 MB), so this is only called
 * when a person explicitly asks for ward-level detail.
 */
export function fetchMunicipalityResults(
  municipalityId: number | string,
  signal?: AbortSignal,
): Promise<MunicipalityResult> {
  return fetchJson<MunicipalityResult>(
    ENDPOINTS.municipality(municipalityId),
    { signal, timeoutMs: 120_000, retries: 0 },
  );
}

export function describeError(error: unknown): string {
  if (error instanceof IecApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;

  if (Platform.OS === 'web') {
    return 'Could not load results. In the web preview, start the local proxy with "npm run proxy" and try again.';
  }

  return 'Something went wrong while loading results.';
}
