import { initials, toFiniteNumber } from '@/lib/format';
import type { PartyInfo, PartyMeta } from '@/types/iec';

export const OTHER_PARTY_ID = '-2';
export const INDEPENDENT_PARTY_ID = '0';

const PARTY_PALETTE = [
  '#0047BA',
  '#E11D48',
  '#0F766E',
  '#B45309',
  '#7C3AED',
  '#0369A1',
  '#15803D',
  '#BE123C',
  '#4338CA',
  '#A16207',
  '#0E7490',
  '#9D174D',
];

const SPECIAL_PARTIES: Record<string, Omit<PartyMeta, 'id'>> = {
  [INDEPENDENT_PARTY_ID]: {
    abbr: 'IND',
    name: 'Independent candidates',
    color: '#64748B',
    image: null,
  },
  [OTHER_PARTY_ID]: {
    abbr: 'OTHER',
    name: 'Other parties',
    color: '#94A3B8',
    image: null,
  },
};

function isUsableColour(colour: string | null | undefined): colour is string {
  return typeof colour === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(colour.trim());
}

function paletteColour(id: string): string {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return PARTY_PALETTE[hash % PARTY_PALETTE.length];
}

function cleanName(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanAbbreviation(value: string | null | undefined): string {
  return cleanName(value);
}

function scorePartyInfo(info: PartyInfo): number {
  return (
    (cleanName(info.PartyFullName) ? 2 : 0) +
    (cleanName(info.PartyImage) ? 2 : 0) +
    (isUsableColour(info.sWebColour) ? 1 : 0)
  );
}

/**
 * PartyList.js is maintained across election years and contains duplicate
 * placeholder entries. Prefer the entry with a full name, logo and colour.
 */
export function buildPartyIndex(list: PartyInfo[]): Map<string, PartyMeta> {
  const best = new Map<string, PartyInfo>();

  for (const info of list ?? []) {
    if (!info || info.ID == null) continue;

    const id = String(info.ID);
    const current = best.get(id);

    if (!current || scorePartyInfo(info) > scorePartyInfo(current)) {
      best.set(id, info);
    }
  }

  const index = new Map<string, PartyMeta>();

  for (const [id, info] of best) {
    const name = cleanName(info.PartyFullName) || cleanName(info.Name) || `Party ${id}`;
    const abbr = cleanAbbreviation(info.Name) || initials(name);

    index.set(id, {
      id,
      abbr,
      name,
      color: isUsableColour(info.sWebColour)
        ? info.sWebColour.trim()
        : paletteColour(id),
      image: cleanName(info.PartyImage) || null,
    });
  }

  for (const [id, special] of Object.entries(SPECIAL_PARTIES)) {
    index.set(id, { id, ...special });
  }

  return index;
}

export function getPartyMeta(
  index: Map<string, PartyMeta> | null | undefined,
  id: number | string | null | undefined,
  fallbackName = '',
): PartyMeta {
  const key = String(id ?? '');
  const special = SPECIAL_PARTIES[key];
  if (special) return { id: key, ...special };

  const known = index?.get(key);
  if (known) return known;

  const name = cleanName(fallbackName) || `Party ${key || '—'}`;
  return {
    id: key,
    abbr: initials(name),
    name,
    color: paletteColour(key || name),
    image: null,
  };
}

export function partyImageUrl(image: string | null | undefined): string | null {
  if (!image) return null;
  return `https://results.elections.org.za/dashboards/lge/Party_Images/${encodeURIComponent(image)}`;
}

export function partySupportValue(value: unknown): number {
  return toFiniteNumber(value);
}
