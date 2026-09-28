import { DAY, expect, gradeSegment, openMap, rec, rows, test } from './fixtures';

test.describe('공통 상단 바', () => {
  test('상단 바: HailMary 로고, 탭 3개, 동기화 표시는 없음', async ({ page }) => {
    await openMap(page);
    await expect(page).toHaveTitle('HailMary');
    await expect(page.getByRole('img', { name: 'HailMary' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: '화면' }).getByRole('link')).toHaveText([
      '지도',
      '상세 검수',
      '기기 상태',
    ]);
    await expect(page.locator('header')).not.toContainText('동기화');
  });

  test('Black / White 테마 전환, 새로고침해도 유지', async ({ page }) => {
    await openMap(page);
    const theme = page.getByRole('group', { name: '화면 테마' });
    const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await expect(theme.getByRole('button', { name: 'Black' })).toHaveAttribute('aria-pressed', 'true');
    expect(await bg()).toBe('rgb(17, 17, 17)');

    await theme.getByRole('button', { name: 'White' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect(await bg()).toBe('rgb(242, 242, 239)');
    // 반전 면(오탐 태그·툴팁)의 글자와 바탕이 같은 색이 되지 않는다
    const [inv, invText] = await page.evaluate(() => {
      const s = getComputedStyle(document.documentElement);
      return [s.getPropertyValue('--pw-inverse-bg').trim(), s.getPropertyValue('--pw-inverse-text').trim()];
    });
    expect(inv).not.toBe(invText);

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(theme.getByRole('button', { name: 'White' })).toHaveAttribute('aria-pressed', 'true');
    await theme.getByRole('button', { name: 'Black' }).click();
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'light');
  });

  test('탭 이동: 지도 상태·마지막 상세 기록을 기억한다', async ({ page }) => {
    await openMap(page, `date=${DAY}&grade=danger&sel=${rec('3502-12672-E')}`);
    await page.getByRole('link', { name: '기기 상태' }).click();
    await expect(page).toHaveURL(/#\/device/);
    await page.getByRole('link', { name: '지도', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`grade=danger&sel=${rec('3502-12672-E')}`));
    await expect(gradeSegment(page, '위험')).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('link', { name: '상세 보기' }).click();
    // 상세 화면은 지연 로딩이라, 실제로 열린 뒤에 다른 탭으로 간다
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('3502-12672-E');
    await page.getByRole('link', { name: '기기 상태' }).click();
    await expect(page).toHaveURL(/#\/device/);
    await page.getByRole('link', { name: '상세 검수' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('3502-12672-E');
  });

  test('지도에서 다른 전주를 고르면 상세 검수 탭은 그 전주를 연다', async ({ page }) => {
    await openMap(page);
    await page.getByRole('link', { name: '상세 검수' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('3501-12669-N');
    await page.getByRole('link', { name: '지도', exact: true }).first().click();
    await rows(page).filter({ hasText: '3502-12672-E' }).click();
    await page.getByRole('link', { name: '상세 검수' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('3502-12672-E');
  });

  test('상세 탭을 처음 열면 보던 날짜의 첫 위험 전주로 간다', async ({ page }) => {
    await openMap(page);
    await page.getByRole('link', { name: '상세 검수' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('3501-12669-N');
  });

  test('없는 경로는 지도로', async ({ page }) => {
    await page.goto('/#/whatever');
    await expect(page).toHaveURL(/#\/map/);
    await expect(rows(page).or(page.getByText('기록된 전주가 없습니다'))).not.toHaveCount(0);
  });
});
