import { expect, rec, rows, test } from './fixtures';

test.describe('C. 기기 상태', () => {
  test('KPI 타일 (09-27 주행)', async ({ page }) => {
    await page.goto('/#/device?drive=drive-20260927-1');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Jetson Orin Nano · 차량 1');
    const main = page.locator('main');
    await expect(main).toContainText('최고 온도74°C');
    await expect(main).toContainText('평균 66.1°C · 경고 기준 미만');
    await expect(main).toContainText('평균 전력8.4W');
    await expect(main).toContainText('프레임 드롭23프레임');
    await expect(main).toContainText('GPS 수신95%');
    await expect(main).toContainText('1분 미수신 · 09:31');
  });

  test('차트 hover: 크로스헤어 + 툴팁 + 축 배지, 키보드로도', async ({ page }) => {
    await page.goto('/#/device?drive=drive-20260927-1');
    const temp = page.getByRole('img', { name: /온도 추이/ });
    const box = (await temp.boundingBox())!;
    // 가로 위치로 시각 칸을 고른다: 차트 왼쪽 여백 44px 뒤로 22칸
    const colX = (i: number) => box.x + 44 + ((box.width - 52) / 22) * (i + 0.5);
    await page.mouse.move(colX(8), box.y + box.height / 2);
    await expect(temp).toContainText('09:19');
    await expect(temp).toContainText('66°C');
    // 세로·가로 가이드선 2개
    await expect(temp.locator('line')).toHaveCount(2);

    await page.mouse.move(0, 0);
    await expect(temp.locator('line')).toHaveCount(0);

    const power = page.getByRole('img', { name: /전력 추이/ });
    await power.focus();
    await page.keyboard.press('ArrowRight');
    await expect(power).toContainText('09:11');
    await expect(power).toContainText('5.8W');
  });

  test('GPS 띠: 미수신 1칸, "목록에서 보기"는 위치 없는 기록을 선택', async ({ page }) => {
    await page.goto('/#/device?drive=drive-20260927-1');
    const strip = page.getByRole('img', { name: /GPS 수신, 미수신 09:31/ });
    await expect(strip.locator('span')).toHaveCount(22);
    await expect(page.getByText('미수신 1분 · 이 구간 기록 1건이 "위치 없음"으로 들어옴')).toBeVisible();
    await page.getByRole('link', { name: '목록에서 보기' }).click();
    await expect(page).toHaveURL(new RegExp(`sel=${rec('noloc')}`));
    await expect(rows(page).filter({ hasText: 'ID 미할당' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('주행 선택으로 다른 주행 로그를 본다', async ({ page }) => {
    await page.goto('/#/device?drive=drive-20260927-1');
    await page.getByRole('button', { name: /주행 기록/ }).click();
    const list = page.getByRole('listbox', { name: '주행 기록' });
    await expect(list.getByRole('option')).toHaveCount(3);
    await list.getByRole('option', { name: /2026\. 9\. 20/ }).click();
    await expect(page).toHaveURL(/drive=drive-20260920-1/);
    await expect(page.locator('main')).toContainText('GPS 수신100%');
    await expect(page.locator('main')).toContainText('전 구간 수신');
  });

  test('없는 주행 ID → 안내, 최근 주행 보기', async ({ page }) => {
    await page.goto('/#/device?drive=nope');
    await expect(page.getByText('주행 기록을 찾을 수 없습니다')).toBeVisible();
    await page.getByRole('link', { name: '최근 주행 보기' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Jetson Orin Nano · 차량 1');
  });
});
