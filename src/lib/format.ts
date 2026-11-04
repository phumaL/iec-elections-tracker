const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export function toFiniteNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function formatNumber(value: unknown, decimals = 0): string {
  const number = toFiniteNumber(value);
  const fixed = Math.abs(number).toFixed(decimals);
  const [whole, fraction = ''] = fixed.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const sign = number < 0 ? '-' : '';
  return fraction ? `${sign}${grouped}.${fraction}` : `${sign}${grouped}`;
}

export function trimNumber(value: number, decimals: number): string {
  return value
    .toFixed(decimals)
    .replace(/\.0+$/, '')
    .replace(/(\.\d*?)0+$/, '$1');
}

export function formatPercent(value: unknown, decimals = 2): string {
  const number = toFiniteNumber(value);
  return `${trimNumber(number, decimals)}%`;
}

export function formatSignedPercent(value: number, decimals = 1): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${trimNumber(value, decimals)}`;
}

export function formatCompact(value: unknown): string {
  const number = toFiniteNumber(value);
  const absolute = Math.abs(number);

  if (absolute >= 1_000_000) {
    return `${trimNumber(number / 1_000_000, 1)}m`;
  }
  if (absolute >= 10_000) {
    return `${trimNumber(number / 1_000, 1)}k`;
  }
  return formatNumber(number);
}

export function formatRelativeTime(
  input: string | number | Date | null | undefined,
  now = Date.now(),
): string {
  if (input == null) return '—';

  const timestamp = input instanceof Date ? input.getTime() : new Date(input).getTime();
  if (!Number.isFinite(timestamp)) return '—';

  const seconds = Math.round((now - timestamp) / 1000);

  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

/** ReportDate strings carry the South African offset, so read the clock as-is. */
export function formatClockTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const match = /T(\d{2}):(\d{2})/.exec(iso);
  return match ? `${match[1]}:${match[2]}` : '—';
}

export function formatShortDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  if (!match) return '—';

  const month = MONTHS[Number(match[2]) - 1] ?? '';
  return `${match[3]} ${month} · ${match[4]}:${match[5]}`;
}

export function pluralise(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}

export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/(^|[\s-])([a-z])/g, (_, prefix: string, letter: string) => {
      return `${prefix}${letter.toUpperCase()}`;
    });
}

export function initials(value: string): string {
  const words = value
    .replace(/&amp;/g, '&')
    .split(/[\s|/\-–]+/)
    .filter(Boolean)
    .filter((word) => !['of', 'the', 'and', 'for', 'a', 'an'].includes(word.toLowerCase()));

  const letters = words.map((word) => word[0]).join('').toUpperCase();
  if (letters.length >= 2) return letters.slice(0, 5);
  return value.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || '?';
}

export function clampPercent(value: unknown): number {
  return clamp(toFiniteNumber(value), 0, 100);
}
