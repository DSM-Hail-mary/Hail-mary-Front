import { readFile } from 'node:fs/promises';
import { DAY, expect, gradeSegment, kpi, markers, openMap, rec, rows, summaryCard, test } from './fixtures';

test.describe('A. 지도·목록', () => {
  test('KPI는 등급별 집계, 목록·마커 수가 맞다 (위치 없는 기록은 지도에 없음)', async ({ page }) => {
    await openMap(page);
    await expect(kpi(page)).toHaveText(['13', '3', '4', '6']);
    await expect(rows(page)).toHaveCount(13);
    await expect(markers(page)).toHaveCount(12);
    await expect(page.getByText('1–13 / 13건')).toBeVisible();
    const noLoc = rows(page).filter({ hasText: 'ID 미할당' });
    await expect(noLoc).toContainText('위치 없음');
  });

  test('빈 날짜 → 안내 + 최근 기록 날짜로 이동', async ({ page }) => {
    await page.goto('/#/map?date=2026-10-01');
    await expect(page.getByText('기록된 전주가 없습니다')).toBeVisible();
    await expect(kpi(page)).toHaveText(['0', '0', '0', '0']);
    await page.getByRole('button', { name: '최근 기록 날짜로 이동' }).click();
    await expect(page).toHaveURL(/date=2026-09-27/);
    await expect(rows(page)).toHaveCount(13);
    // 날짜 변경은 히스토리에 남아 뒤로 가기가 된다
    await page.goBack();
    await expect(page.getByText('기록된 전주가 없습니다')).toBeVisible();
  });

  test('기준 날짜 선택 목록으로 다른 주행을 연다', async ({ page }) => {
    await openMap(page);
    await page.getByRole('button', { name: /기준 날짜/ }).click();
    const list = page.getByRole('listbox', { name: '기준 날짜' });
    await expect(list.getByRole('option')).toHaveCount(3);
    await list.getByRole('option', { name: /2026\. 9\. 20/ }).click();
    await expect(page).toHaveURL(/date=2026-09-20/);
    await expect(rows(page)).toHaveCount(10);
    await expect(list).toBeHidden();
  });

  test('등급 필터는 목록과 지도에 함께 적용되고 URL에 남는다', async ({ page }) => {
    await openMap(page);
    await gradeSegment(page, '위험').click();
    await expect(gradeSegment(page, '위험')).toHaveAttribute('aria-pressed', 'true');
    await expect(rows(page)).toHaveCount(3);
    await expect(markers(page)).toHaveCount(3);
    await expect(page).toHaveURL(/grade=danger/);
    await page.reload();
    await expect(rows(page)).toHaveCount(3);
  });

  test('유형·처리 상태 필터, 결과 없음 → 필터 초기화', async ({ page }) => {
    await openMap(page);
    await page.getByLabel('위험 유형').selectOption('tree');
    await expect(rows(page)).toHaveCount(2);
    await page.getByLabel('위험 유형').selectOption('all');
    await page.getByLabel('처리 상태').selectOption('new');
    await expect(rows(page)).toHaveCount(4);
    await gradeSegment(page, '위험').click();
    await page.getByLabel('처리 상태').selectOption('removed');
    await expect(page.getByText('조건에 맞는 전주가 없습니다')).toBeVisible();
    await expect(page.getByText('위험 · 철거 완료 조합에 해당하는 기록이 없습니다.')).toBeVisible();
    await page.getByRole('button', { name: '필터 초기화' }).click();
    await expect(rows(page)).toHaveCount(13);
  });

  test('정렬: 기록 시각순 / 우선순위순', async ({ page }) => {
    await openMap(page);
    await expect(rows(page).first()).toContainText('3500-12668-E');
    await page.getByLabel('정렬').selectOption('priority');
    // 위험 + 커지는 추세 + 연속 발견이 가장 높다
    await expect(rows(page).first()).toContainText('3501-12669-N');
    await expect(rows(page).last()).toContainText('이상 없음');
  });

  test('행 클릭 → 요약 카드·마커 강조, Esc로 해제', async ({ page }) => {
    await openMap(page);
    const row = rows(page).filter({ hasText: '3501-12669-N' });
    await row.click();
    await expect(row).toHaveAttribute('aria-pressed', 'true');
    await expect(page).toHaveURL(new RegExp(`sel=${rec('3501-12669-N')}`));
    const card = summaryCard(page);
    await expect(card).toContainText('3501-12669-N');
    await expect(card).toContainText('35.01462, 126.69183');
    await expect(card).toContainText('까치집');
    await expect(card).toContainText('09:15:22');
    await expect(page.locator('.leaflet-marker-icon[aria-pressed="true"]')).toHaveAttribute(
      'aria-label',
      '3501-12669-N 위험',
    );
    await page.keyboard.press('Escape');
    await expect(card).toBeHidden();
    await expect(page).not.toHaveURL(/sel=/);
  });

  test('마커 클릭 → 목록 행 선택, 카드 닫기 버튼', async ({ page }) => {
    await openMap(page);
    await page.locator('.leaflet-marker-icon[aria-label="3502-12672-E 위험"]').click();
    await expect(rows(page).filter({ hasText: '3502-12672-E' })).toHaveAttribute('aria-pressed', 'true');
    await expect(summaryCard(page)).toContainText('철거 예정');
    await summaryCard(page).getByRole('button', { name: '선택 해제' }).click();
    await expect(summaryCard(page)).toBeHidden();
  });

  test('목록 hover ↔ 마커 강조, 마커 hover 툴팁', async ({ page }) => {
    await openMap(page);
    await rows(page).filter({ hasText: '3502-12670-E' }).hover();
    await expect(page.locator('.leaflet-marker-icon[aria-label="3502-12670-E 주의"]')).toHaveClass(/markerHovered/);
    const marker = page.locator('.leaflet-marker-icon[aria-label="3502-12672-E 위험"]');
    await marker.hover();
    await expect(rows(page).filter({ hasText: '3502-12672-E' })).toHaveAttribute('data-hovered', 'true');
    await expect(page.locator('.leaflet-tooltip').filter({ hasText: '3502-12672-E' })).toBeVisible();
  });

  test('키보드 ↑/↓로 목록 선택 이동', async ({ page }) => {
    await openMap(page, `date=${DAY}&sel=${rec('3500-12668-E')}`);
    await rows(page).first().focus();
    await page.keyboard.press('ArrowDown');
    await expect(page).toHaveURL(new RegExp(`sel=${rec('3500-12669-E')}`));
    await page.keyboard.press('ArrowDown');
    await expect(page).toHaveURL(new RegExp(`sel=${rec('3501-12669-N')}`));
    await page.keyboard.press('ArrowUp');
    await expect(page).toHaveURL(new RegExp(`sel=${rec('3500-12669-E')}`));
  });

  test('확인 처리 토글: 신규 ↔ 확인, 다른 상태는 비활성', async ({ page }) => {
    await openMap(page, `date=${DAY}&sel=${rec('3501-12669-N')}`);
    const card = summaryCard(page);
    const toggle = card.getByRole('button', { name: /확인 처리|확인됨/ });
    await toggle.click();
    await expect(card.getByRole('button', { name: '확인됨' })).toHaveAttribute('aria-pressed', 'true');
    await expect(rows(page).filter({ hasText: '3501-12669-N' })).toContainText('확인');
    await card.getByRole('button', { name: '확인됨' }).click();
    await expect(rows(page).filter({ hasText: '3501-12669-N' })).toContainText('신규');

    await rows(page).filter({ hasText: '3502-12672-E' }).click();
    await expect(card.getByRole('button', { name: '확인 처리' })).toBeDisabled();
  });

  test('위치 없는 기록: 카드에 안내, 지도에는 없음', async ({ page }) => {
    await openMap(page);
    await rows(page).filter({ hasText: 'ID 미할당' }).click();
    const card = summaryCard(page);
    await expect(card).toContainText('위치 없음 (GPS 미수신)');
    await expect(card).toContainText('GPS 신호를 받지 못한 기록');
    await expect(page.locator('.leaflet-marker-icon[aria-pressed="true"]')).toHaveCount(0);
  });

  test('위험 전주 CSV: 위험·오탐 제외, 엑셀용 BOM', async ({ page }) => {
    await openMap(page);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: '위험 전주 CSV' }).click(),
    ]);
    expect(download.suggestedFilename()).toBe(`polewatch_${DAY}.csv`);
    const text = await readFile(await download.path(), 'utf8');
    expect(text.charCodeAt(0)).toBe(0xfeff);
    const lines = text.slice(1).split('\r\n');
    expect(lines[0]).toBe('전주 ID,위도,경도,등급,위험 유형,기록 시각,처리 상태,검수');
    expect(lines).toHaveLength(4);
    expect(lines.slice(1).every((l) => l.includes(',위험,'))).toBe(true);
  });

  test('지도 확대/축소 버튼', async ({ page }) => {
    await openMap(page);
    const zoomOf = () => page.evaluate(() => document.querySelector('.leaflet-proxy')?.getAttribute('style') ?? '');
    const before = await zoomOf();
    await page.getByRole('button', { name: '확대' }).click();
    await expect.poll(zoomOf).not.toBe(before);
  });

  test('범례와 출발·종료 핀 라벨', async ({ page }) => {
    await openMap(page);
    const legend = page.getByRole('group', { name: '범례' });
    for (const t of ['주행 경로', '미점검 도로', '위험', '주의', '양호']) await expect(legend).toContainText(t);
    await expect(page.locator('.leaflet-tooltip', { hasText: '출발 09:11' })).toBeVisible();
    await expect(page.locator('.leaflet-tooltip', { hasText: '종료 09:32' })).toBeVisible();
  });

  test('배경 지도 야간/흑백/컬러/위성 전환 (VWorld 키가 있을 때), 새로고침해도 유지', async ({ page }) => {
    await openMap(page);
    const switcher = page.getByRole('group', { name: '배경 지도' });
    test.skip((await switcher.count()) === 0, 'VITE_VWORLD_KEY 없음 → 배경 레이어 1개라 전환 버튼 없음');
    const tileSrcs = () =>
      page.locator('.leaflet-tile').evaluateAll((els) => els.map((e) => (e as HTMLImageElement).src));

    await expect(switcher.getByRole('button')).toHaveText(['야간', '흑백', '컬러', '위성']);
    await expect(switcher.getByRole('button', { name: '야간' })).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(async () => (await tileSrcs()).some((s) => s.includes('/midnight/'))).toBe(true);

    for (const [label, layer] of [
      ['흑백', '/white/'],
      ['컬러', '/Base/'],
    ] as const) {
      await switcher.getByRole('button', { name: label }).click();
      await expect.poll(async () => (await tileSrcs()).some((s) => s.includes(layer))).toBe(true);
    }

    await switcher.getByRole('button', { name: '위성' }).click();
    await expect(switcher.getByRole('button', { name: '위성' })).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(async () => (await tileSrcs()).some((s) => s.includes('/Satellite/'))).toBe(true);
    await expect.poll(async () => (await tileSrcs()).some((s) => s.includes('/Hybrid/'))).toBe(true);
    await expect.poll(async () => (await tileSrcs()).some((s) => s.includes('/midnight/'))).toBe(false);

    await page.reload();
    await expect(page.getByRole('group', { name: '배경 지도' }).getByRole('button', { name: '위성' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.locator('.leaflet-control-attribution')).toContainText('VWorld');
  });
});
