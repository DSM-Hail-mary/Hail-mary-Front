/** 'YYYY-MM-DD' ↔ 날짜 계산. 시간대 영향이 없도록 UTC 정오 기준으로만 다룬다. */
const toUtc = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12);
};
const fromUtc = (t: number) => new Date(t).toISOString().slice(0, 10);
export const addDays = (date: string, n: number) => fromUtc(toUtc(date) + n * 86_400_000);
export const monthKey = (date: string) => date.slice(0, 7); // YYYY-MM

/** 월 달력 6주(42칸)의 날짜. 첫 칸은 그달 1일이 있는 주의 일요일. */
export function monthGrid(month: string): string[] {
  const first = `${month}-01`;
  const start = addDays(first, -new Date(toUtc(first)).getUTCDay());
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}
