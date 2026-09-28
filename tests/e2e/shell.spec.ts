import { FAILED_SYNC_URL } from '../../playwright.config';
import { DAY, expect, gradeSegment, openMap, rec, rows, test } from './fixtures';

test.describe('공통 상단 바', () => {
  test('동기화 완료 + 마지막 동기화 시각', async ({ page }) => {
    await openMap(page);
    const status = page.locator('header [role="status"]');
    await expect(status).toContainText('동기화 완료');
    await expect(status).toContainText('09.27 18:42');
  });

  test('동기화 실패 → 다시 시도 → 진행 중 → 완료', async ({ page }) => {
    await page.goto(`${FAILED_SYNC_URL}/#/map?date=${DAY}`);
    const status = page.locator('header [role="status"]');
    await expect(status).toContainText('동기화 실패');
    await expect(status).toContainText('Wi-Fi 연결 끊김');
    await status.getByRole('button', { name: '다시 시도' }).click();
    await expect(status).toContainText('동기화 중');
    await expect(status).toContainText(/이미지 \d+ \/ 340/);
    await expect(status.getByRole('progressbar')).toBeVisible();
    // mock 동기화는 8초 뒤 끝난다
    await expect(status).toContainText('동기화 완료', { timeout: 15_000 });
  });

  test('탭 이동: 지도 상태·마지막 상세 기록을 기억한다', async ({ page }) => {
    await openMap(page, `date=${DAY}&grade=danger&sel=${rec('3502-12672-E')}`);
    await page.getByRole('link', { name: '기기 상태' }).click();
    await expect(page).toHaveURL(/#\/device/);
    await page.getByRole('link', { name: '지도·목록', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`grade=danger&sel=${rec('3502-12672-E')}`));
    await expect(gradeSegment(page, '위험')).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('link', { name: '상세 보기' }).click();
    await page.getByRole('link', { name: '기기 상태' }).click();
    await page.getByRole('link', { name: '전주 상세·검수' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('3502-12672-E');
  });

  test('상세 탭을 처음 열면 보던 날짜의 첫 위험 전주로 간다', async ({ page }) => {
    await openMap(page);
    await page.getByRole('link', { name: '전주 상세·검수' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('3501-12669-N');
  });

  test('없는 경로는 지도로', async ({ page }) => {
    await page.goto('/#/whatever');
    await expect(page).toHaveURL(/#\/map/);
    await expect(rows(page).or(page.getByText('기록된 전주가 없습니다'))).not.toHaveCount(0);
  });
});
