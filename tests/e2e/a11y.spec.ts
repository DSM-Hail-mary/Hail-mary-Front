import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { DAY, expect, rec, test } from './fixtures';

/** 접근성·대비 자동 점검 (axe-core, WCAG 2.1 AA). 세 화면 × 두 테마. */
const SCREENS = [
  { name: '지도', path: `/#/map?date=${DAY}&sel=${rec('3501-12669-N')}`, ready: '[data-record-id]' },
  { name: '상세', path: `/#/poles/${rec('3501-12669-N')}`, ready: '[aria-label="크롭 뷰어"]' },
  { name: '기기', path: '/#/device', ready: '[aria-label^="온도 추이"]' },
];

for (const theme of ['black', 'white'] as const) {
  for (const s of SCREENS) {
    test(`${s.name} · ${theme}`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem('hailmary.theme', t), theme);
      await page.goto(s.path);
      await expect(page.locator(s.ready).first()).toBeVisible();
      await page.waitForTimeout(300);
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        // 지도 타일(이미지)과 Leaflet 내부 요소는 우리가 만든 UI가 아니다
        .exclude('.leaflet-tile-pane')
        .analyze();
      const summary = result.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        count: v.nodes.length,
        targets: v.nodes.slice(0, 4).map((n) => n.target.join(' ')),
        why: v.nodes[0]?.failureSummary?.split('\n').slice(1, 2).join(' '),
      }));
      expect(summary, JSON.stringify(summary, null, 2)).toEqual([]);
    });
  }
}

async function scan(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .exclude('.leaflet-tile-pane')
    .analyze();
  return result.violations.map((v) => ({
    id: v.id,
    count: v.nodes.length,
    targets: v.nodes.slice(0, 4).map((n) => n.target.join(' ')),
    why: v.nodes[0]?.failureSummary?.split('\n').slice(1, 2).join(' '),
  }));
}

for (const theme of ['black', 'white'] as const) {
  test(`펼친 상태(달력·드롭다운·요약 카드) · ${theme}`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('hailmary.theme', t), theme);
    await page.goto(`/#/map?date=${DAY}&sel=${rec('noloc')}`);
    await expect(page.locator('[data-record-id]').first()).toBeVisible();

    await page.getByRole('button', { name: /기준 날짜/ }).click();
    await expect(page.getByRole('group', { name: '2026년 9월' })).toBeVisible();
    let v = await scan(page);
    expect(v, `달력: ${JSON.stringify(v, null, 2)}`).toEqual([]);
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: /^처리 상태/ }).click();
    v = await scan(page);
    expect(v, `드롭다운: ${JSON.stringify(v, null, 2)}`).toEqual([]);
    await page.keyboard.press('Escape');
  });

  test(`모바일 390px · ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript((t) => localStorage.setItem('hailmary.theme', t), theme);
    for (const path of [
      `/#/map?date=${DAY}&sel=${rec('3501-12669-N')}`,
      `/#/poles/${rec('3501-12669-N')}`,
      '/#/device',
    ]) {
      await page.goto(path);
      await page.waitForTimeout(700);
      const v = await scan(page);
      expect(v, `${path}: ${JSON.stringify(v, null, 2)}`).toEqual([]);
    }
  });
}
