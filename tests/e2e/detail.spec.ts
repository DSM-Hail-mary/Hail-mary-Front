import { DAY, expect, kpi, rec, rows, test } from './fixtures';

const DANGER = rec('3501-12669-N');

test.describe('B. 전주 상세·검수', () => {
  test('지도 요약 카드 → 상세 보기, 헤더 정보', async ({ page }) => {
    await page.goto(`/#/map?date=${DAY}&sel=${DANGER}`);
    await page.getByRole('link', { name: '상세 보기' }).click();
    await expect(page).toHaveURL(new RegExp(`#/poles/${DANGER}`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('3501-12669-N');
    await expect(page.getByText('위험 전주 1 / 3')).toBeVisible();
    await expect(page.getByRole('link', { name: '전주 상세·검수' })).toHaveAttribute('aria-current', 'page');
  });

  test('크롭 뷰어: 썸네일·키보드 전환, 빈 칸, 검출 박스, 확대/축소', async ({ page }) => {
    await page.goto(`/#/poles/${DANGER}`);
    const viewer = page.getByRole('region', { name: '크롭 뷰어' });
    await expect(viewer).toContainText('크롭 1 / 4');
    await expect(viewer.getByText('크롭 없음')).toHaveCount(1);

    await viewer.getByRole('button', { name: '크롭 3 보기' }).click();
    await expect(viewer).toContainText('크롭 3 / 4');
    const stage = viewer.getByRole('img', { name: /판정 크롭 이미지/ });
    await stage.focus();
    await page.keyboard.press('ArrowRight');
    await expect(viewer).toContainText('크롭 4 / 4');
    await page.keyboard.press('ArrowRight'); // 마지막에서 멈춘다
    await expect(viewer).toContainText('크롭 4 / 4');

    await viewer.getByRole('button', { name: '크롭 1 보기' }).click();
    await expect(viewer.getByText(/까치집\s*91%/)).toBeVisible();
    await expect(viewer.getByText(/전주\s*97%/)).toBeVisible();
    await viewer.getByRole('switch', { name: '검출 박스' }).click();
    await expect(viewer.getByRole('switch', { name: '검출 박스' })).toHaveAttribute('aria-checked', 'false');
    await expect(viewer.getByText(/까치집\s*91%/)).toHaveCount(0);

    const zoomLabel = viewer.getByText(/^\d+%$/);
    await expect(zoomLabel).toHaveText('100%');
    await expect(viewer.getByRole('button', { name: '축소' })).toBeDisabled();
    for (const z of ['150%', '200%', '300%']) {
      await viewer.getByRole('button', { name: '확대' }).click();
      await expect(zoomLabel).toHaveText(z);
    }
    await expect(viewer.getByRole('button', { name: '확대' })).toBeDisabled();
    await viewer.getByRole('button', { name: '축소' }).click();
    await expect(zoomLabel).toHaveText('200%');

    // 확대 상태에서 드래그하면 이미지가 움직인다
    const canvas = stage.locator('> div');
    const before = await canvas.getAttribute('style');
    const box = (await stage.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2 + 40, { steps: 5 });
    await page.mouse.up();
    await expect.poll(() => canvas.getAttribute('style')).not.toBe(before);
  });

  test('기록 정보와 등급 근거', async ({ page }) => {
    await page.goto(`/#/poles/${DANGER}`);
    const info = page.getByRole('region', { name: '기록 정보' });
    await expect(info).toContainText('35.01462, 126.69183');
    await expect(info).toContainText('2026-09-27 09:15:22');
    await expect(info).toContainText('북 (N)');
    await expect(info).toContainText('까치집 크기 등급 대 → 위험');
    await expect(info.getByRole('img', { name: /소, 중, 대 중 대/ })).toBeVisible();
  });

  test('판정 검수: 맞음 / 오탐(집계 제외) / 선택 취소', async ({ page }) => {
    await page.goto(`/#/poles/${DANGER}`);
    const review = page.getByRole('region', { name: '판정 검수' });
    await expect(review).toContainText('미검수');

    await review.getByRole('button', { name: '맞음' }).click();
    await expect(review.getByRole('button', { name: '맞음' })).toHaveAttribute('aria-pressed', 'true');
    await expect(review).toContainText('판정이 맞음으로 기록됐습니다.');

    await review.getByRole('button', { name: '오탐' }).click();
    await expect(review).toContainText('크롭 4장을 재학습용 폴더에 저장합니다');
    await expect(page.getByText('오탐 · 집계 제외')).toBeVisible();
    // 오탐 기록은 위험 전주 대기열에서 빠진다
    await expect(page.getByText('위험 전주 2건')).toBeVisible();

    // 지도 KPI에서도 빠지고, 목록에는 오탐으로 표시
    await page.getByRole('link', { name: '지도·목록' }).first().click();
    await expect(kpi(page)).toHaveText(['12', '2', '4', '6']);
    await expect(rows(page).filter({ hasText: '3501-12669-N' })).toContainText('오탐');

    await page.goBack();
    await review.getByRole('button', { name: '선택 취소' }).click();
    await expect(review).toContainText('미검수');
    await expect(page.getByText('위험 전주 1 / 3')).toBeVisible();
  });

  test('처리 상태: 단계 클릭, 되돌리기, 목록 반영', async ({ page }) => {
    await page.goto(`/#/poles/${DANGER}`);
    const status = page.getByRole('region', { name: '처리 상태' });
    const current = status.locator('[aria-current="step"]');
    await expect(current).toContainText('신규');
    await expect(status.getByRole('button', { name: '되돌리기' })).toBeDisabled();

    await status.getByRole('button', { name: /철거 완료/ }).click();
    await expect(current).toContainText('철거 완료');
    await status.getByRole('button', { name: '되돌리기' }).click();
    await expect(current).toContainText('철거 예정');

    await page.goto(`/#/map?date=${DAY}`);
    await expect(rows(page).filter({ hasText: '3501-12669-N' })).toContainText('철거 예정');
  });

  test('양호 기록은 처리 대상이 아니다', async ({ page }) => {
    await page.goto(`/#/poles/${rec('3500-12668-E')}`);
    await expect(page.getByText('양호 판정이라 처리할 항목이 없습니다.')).toBeVisible();
  });

  test('이력 비교: 이전 방문, 변화 요약 / 이전 기록 없음', async ({ page }) => {
    await page.goto(`/#/poles/${DANGER}`);
    const history = page.getByRole('region', { name: '이력 비교' });
    await expect(history).toContainText('2026-09-13');
    await expect(history).toContainText('2주 사이 커짐 · 연속 발견 2회');
    await page.goto(`/#/poles/${rec('3503-12674-E')}`);
    await expect(history).toContainText('1주 사이 새로 발견');
    await page.goto(`/#/poles/${rec('noloc')}`);
    await expect(history).toContainText('이전 기록 없음');
  });

  test('위험 전주 이전·다음 버튼과 [ ] 단축키', async ({ page }) => {
    await page.goto(`/#/poles/${DANGER}`);
    await expect(page.getByRole('button', { name: '이전 위험 전주' })).toBeDisabled();
    await page.getByRole('button', { name: '다음 위험 전주' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('3502-12672-E');
    await expect(page.getByText('위험 전주 2 / 3')).toBeVisible();
    await page.keyboard.press(']');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('3502-12676-S');
    await expect(page.getByRole('button', { name: '다음 위험 전주' })).toBeDisabled();
    await page.keyboard.press('[');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('3502-12672-E');
  });

  test('← 지도·목록은 해당 기록을 선택한 채로 돌아간다', async ({ page }) => {
    await page.goto(`/#/poles/${rec('3502-12672-E')}`);
    await page.getByRole('link', { name: '지도·목록' }).nth(1).click();
    await expect(page).toHaveURL(new RegExp(`sel=${rec('3502-12672-E')}`));
    await expect(rows(page).filter({ hasText: '3502-12672-E' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('없는 기록 주소 → 안내', async ({ page }) => {
    await page.goto('/#/poles/nope');
    await expect(page.getByText('기록을 찾을 수 없습니다')).toBeVisible();
    await page.getByRole('link', { name: '지도·목록으로' }).click();
    await expect(page).toHaveURL(/#\/map/);
  });
});
