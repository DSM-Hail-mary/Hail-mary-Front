import { test as base, expect, type Page } from '@playwright/test';
import latestSession from '../../src/api/__fixtures__/deviceSessionLatest.json' with { type: 'json' };

/** 기기 상태 서버 API (테스트 빌드의 VITE_DEVICE_API_BASE = http://127.0.0.1:8000, playwright.config.ts). */
export const DEVICE_API = 'http://127.0.0.1:8000/api/device/session/latest';

// 1×1 투명 PNG
const BLANK_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

/**
 * 모든 테스트:
 * - 지도 타일은 외부로 보내지 않고 빈 이미지로 응답한다.
 * - 기기 상태 API는 명세 응답 예시로 응답한다 (테스트에서 page.route로 덮어쓸 수 있음).
 * - 콘솔 에러는 실패로 본다 (allowedConsoleErrors로 예상된 것만 허용).
 */
export const test = base.extend<{ consoleErrors: string[]; allowedConsoleErrors: RegExp[] }>({
  allowedConsoleErrors: [[], { option: true }],
  consoleErrors: [
    async ({ page, allowedConsoleErrors }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text());
      });
      await use(errors);
      const unexpected = errors.filter((e) => !allowedConsoleErrors.some((re) => re.test(e)));
      expect(unexpected, '콘솔 에러 없음').toEqual([]);
    },
    { auto: true },
  ],
  page: async ({ page }, use) => {
    await page.route(/tile\.openstreetmap\.org|basemaps\.cartocdn\.com|api\.vworld\.kr\/req\/wmts/, (route) =>
      route.fulfill({ status: 200, contentType: 'image/png', body: BLANK_PNG }),
    );
    await page.route(DEVICE_API, (route) => route.fulfill({ json: latestSession }));
    await use(page);
  },
});

export { expect };

export const DAY = '2026-09-27';
export const rec = (poleId: string, date = DAY) => `${date}_${poleId}`;

export async function openMap(page: Page, query = `date=${DAY}`) {
  await page.goto(`/#/map?${query}`);
  await expect(page.locator('[data-record-id]').first()).toBeVisible();
}

export const rows = (page: Page) => page.locator('[data-record-id]');
export const markers = (page: Page) => page.locator('.leaflet-marker-icon');
export const kpi = (page: Page) => page.locator('[aria-label="요약"] dd');
export const gradeSegment = (page: Page, label: string) =>
  page.getByRole('group', { name: '등급 필터' }).getByRole('button', { name: new RegExp(`^${label}`) });
/** 목록 필터 드롭다운에서 항목 고르기 (자체 드롭다운: 버튼 → 목록 → 항목). */
export async function choose(page: Page, label: string, option: string) {
  await page.getByRole('button', { name: new RegExp(`^${label}`) }).click();
  const list = page.getByRole('listbox', { name: label });
  await list.getByRole('option', { name: option, exact: true }).click();
  await expect(list).toBeHidden();
}

export const summaryCard = (page: Page) => page.getByRole('article', { name: '선택한 전주' });
