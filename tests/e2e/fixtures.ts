import { test as base, expect, type Page } from '@playwright/test';

// 1×1 투명 PNG
const BLANK_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

/** 모든 테스트: 지도 타일은 외부로 보내지 않고 빈 이미지로 응답한다. 콘솔 에러는 실패로 본다. */
export const test = base.extend<{ consoleErrors: string[] }>({
  // 모든 테스트에 자동 적용: 페이지 콘솔 에러·예외가 있으면 실패
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text());
      });
      await use(errors);
      expect(errors, '콘솔 에러 없음').toEqual([]);
    },
    { auto: true },
  ],
  page: async ({ page }, use) => {
    await page.route(/tile\.openstreetmap\.org|basemaps\.cartocdn\.com|api\.vworld\.kr\/req\/wmts/, (route) =>
      route.fulfill({ status: 200, contentType: 'image/png', body: BLANK_PNG }),
    );
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
export const summaryCard = (page: Page) => page.getByRole('article', { name: '선택한 전주' });
