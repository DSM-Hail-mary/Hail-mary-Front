import type { Page } from '@playwright/test';
import { DAY, expect, rec, summaryCard, test } from './fixtures';

const SCREENS = [
  { name: '지도', path: `/#/map?date=${DAY}&sel=${rec('3501-12669-N')}`, ready: '[data-record-id]' },
  { name: '상세', path: `/#/poles/${rec('3501-12669-N')}`, ready: '[aria-label="크롭 뷰어"]' },
  { name: '기기', path: '/#/device', ready: '[aria-label^="온도 추이"]' },
];

const VIEWPORTS = [
  { width: 2560, height: 1440 },
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
];

async function layout(page: Page) {
  return page.evaluate(() => {
    const app = document.querySelector('#root > div')!.getBoundingClientRect();
    const main = document.querySelector('main')!;
    const page = main.firstElementChild!.getBoundingClientRect();
    return {
      horizontalScroll: document.documentElement.scrollWidth > window.innerWidth,
      appFillsHeight: Math.round(app.height) === window.innerHeight,
      // 페이지 내용이 main 영역 바닥까지 닿는지 (빈 여백이 남지 않는지)
      contentFillsMain: page.bottom >= main.getBoundingClientRect().bottom - 1,
      mainScrolls: main.scrollHeight > main.clientHeight + 2,
    };
  });
}

test.describe('반응형: 화면을 꽉 채우고 가로로 넘치지 않는다', () => {
  for (const vp of VIEWPORTS) {
    for (const screen of SCREENS) {
      test(`${screen.name} ${vp.width}×${vp.height}`, async ({ page }) => {
        await page.setViewportSize(vp);
        await page.goto(screen.path);
        await expect(page.locator(screen.ready).first()).toBeVisible();
        await page.waitForTimeout(300);
        const l = await layout(page);
        expect(l.horizontalScroll, '가로 스크롤 없음').toBe(false);
        expect(l.appFillsHeight, '앱이 뷰포트 높이를 채움').toBe(true);
        expect(l.contentFillsMain, '내용이 화면 아래까지 채움').toBe(true);
      });
    }
  }

  test('넓은 화면: 상세는 한 화면에 들어오고 썸네일이 보인다', async ({ page }) => {
    for (const vp of VIEWPORTS.filter((v) => v.width > 1100)) {
      await page.setViewportSize(vp);
      await page.goto(`/#/poles/${rec('3501-12669-N')}`);
      await expect(page.getByRole('button', { name: '크롭 4 보기' })).toBeInViewport();
      expect((await layout(page)).mainScrolls, `${vp.width}×${vp.height} 페이지 스크롤 없음`).toBe(false);
    }
  });

  test('넓은 화면: 기기 상태 차트가 남는 높이를 채운다', async ({ page }) => {
    await page.setViewportSize({ width: 2560, height: 1440 });
    await page.goto('/#/device');
    const chart = page.getByRole('img', { name: /온도 추이/ });
    await expect.poll(async () => (await chart.boundingBox())?.height ?? 0).toBeGreaterThan(300);
    expect((await layout(page)).mainScrolls).toBe(false);
  });

  test('모바일: 지도 위·목록 아래, 요약 카드는 하단 시트, 탭 3개가 보인다', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/#/map?date=${DAY}&sel=${rec('3501-12669-N')}`);
    const map = page.getByRole('region', { name: '지도' });
    const list = page.getByRole('region', { name: '전주 목록' });
    await expect(list).toBeVisible();
    const mapBox = (await map.boundingBox())!;
    const listBox = (await list.boundingBox())!;
    expect(listBox.y).toBeGreaterThanOrEqual(mapBox.y + mapBox.height - 1);
    expect(listBox.width).toBeGreaterThan(380);
    // 하단 시트는 올라오는 애니메이션(0.18초)이 끝난 뒤 지도 아래 끝에 붙는다
    await expect
      .poll(async () => {
        const card = (await summaryCard(page).boundingBox())!;
        return Math.round(card.y + card.height);
      })
      .toBe(Math.round(mapBox.y + mapBox.height));
    // 선택 행으로 페이지가 밀려 내려가지 않는다
    expect(await page.evaluate(() => document.querySelector('main')!.scrollTop)).toBe(0);
    for (const tab of ['지도', '상세 검수', '기기 상태']) {
      await expect(
        page.getByRole('navigation', { name: '화면' }).getByRole('link', { name: tab, exact: true }),
      ).toBeInViewport();
    }
  });

  test('모바일: 상세 뷰어가 잘리지 않고 카드가 아래로 쌓인다', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/#/poles/${rec('3501-12669-N')}`);
    const viewer = page.getByRole('region', { name: '크롭 뷰어' });
    const thumbs = page.getByRole('group', { name: '크롭 선택' });
    const v = (await viewer.boundingBox())!;
    const t = (await thumbs.boundingBox())!;
    expect(t.y + t.height).toBeLessThanOrEqual(v.y + v.height + 1);
    const info = (await page.getByRole('region', { name: '기록 정보' }).boundingBox())!;
    expect(info.y).toBeGreaterThan(v.y + v.height - 1);
  });
});
