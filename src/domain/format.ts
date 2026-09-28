import type { LatLng } from './types';

/**
 * 시각은 모두 이 시간대로 보여준다. 사무실 PC의 시간대 설정과 무관하게
 * 주행 현장 기준 시각이 나오도록 고정한다.
 */
export const DISPLAY_TIME_ZONE = 'Asia/Seoul';

type Parts = Record<'year' | 'month' | 'day' | 'hour' | 'minute' | 'second' | 'weekday', string>;

const partsFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: DISPLAY_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  weekday: 'short',
  hourCycle: 'h23',
});

function parts(input: string | Date): Parts {
  const date = typeof input === 'string' ? new Date(input) : input;
  const out: Partial<Parts> = {};
  for (const p of partsFormatter.formatToParts(date)) {
    if (p.type in { year: 1, month: 1, day: 1, hour: 1, minute: 1, second: 1, weekday: 1 }) {
      out[p.type as keyof Parts] = p.value;
    }
  }
  return out as Parts;
}

const WEEKDAY_KO: Record<string, string> = {
  Sun: '일',
  Mon: '월',
  Tue: '화',
  Wed: '수',
  Thu: '목',
  Fri: '금',
  Sat: '토',
};

/** "35.01462, 126.69183" */
export function formatCoord(pos: LatLng): string {
  return `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`;
}

/** "09:15:22" */
export function formatTime(iso: string): string {
  const p = parts(iso);
  return `${p.hour}:${p.minute}:${p.second}`;
}

/** "09:15" */
export function formatHourMinute(iso: string): string {
  const p = parts(iso);
  return `${p.hour}:${p.minute}`;
}

/** "2026-09-27 09:15:22" */
export function formatDateTime(iso: string): string {
  const p = parts(iso);
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

/** 상단 바 마지막 동기화: "09.27 18:42" */
export function formatSyncTime(iso: string): string {
  const p = parts(iso);
  return `${p.month}.${p.day} ${p.hour}:${p.minute}`;
}

/** 기록의 날짜 "YYYY-MM-DD" (표시 시간대 기준). */
export function dateOf(input: string | Date): string {
  const p = parts(input);
  return `${p.year}-${p.month}-${p.day}`;
}

export function today(now: Date = new Date()): string {
  return dateOf(now);
}

export function isDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

/** "2026-09-27" → "2026. 9. 27 (일)" */
export function formatDateLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  // 날짜만 있는 값이라 UTC 정오로 만들어 시간대 경계 문제를 피한다.
  const weekday = new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1, 12)).getUTCDay();
  const ko = ['일', '월', '화', '수', '목', '금', '토'][weekday];
  return `${y}. ${m}. ${d} (${ko})`;
}

/** "2026-09-27" → "2026. 9. 27" */
export function formatDateShort(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return `${y}. ${m}. ${d}`;
}

export function weekdayOf(iso: string): string {
  return WEEKDAY_KO[parts(iso).weekday] ?? '';
}

/** 두 시각 사이 분 (반올림). */
export function minutesBetween(startIso: string, endIso: string): number {
  return Math.round((Date.parse(endIso) - Date.parse(startIso)) / 60_000);
}

/** 소수 한 자리, ".0"은 뗀다: 8.0 → "8", 8.46 → "8.5" */
export function formatDecimal(value: number): string {
  return value.toFixed(1).replace(/\.0$/, '');
}
