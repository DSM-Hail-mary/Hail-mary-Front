import latestSession from '../../src/api/__fixtures__/deviceSessionLatest.json' with { type: 'json' };
import { DEVICE_API, expect, rec, rows, test } from './fixtures';

/**
 * 화면 C. 기기 상태 — 서버 GET /api/device/session/latest (백엔드 기기 상태 API 명세 §1).
 * 테스트 빌드는 VITE_DEVICE_API_BASE 로 이 API를 실제로 호출하고, 테스트가 응답을 가로채 명세 예시를 돌려준다.
 */
test.describe('C. 기기 상태 (서버 API)', () => {
  test('요약 카드 4개와 헤더 — 서버가 준 값 그대로 (명세 §3)', async ({ page }) => {
    const req = page.waitForRequest(DEVICE_API);
    await page.goto('/#/device');
    await req; // 실제로 서버 주소로 요청했다
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Jetson Nano');
    const main = page.locator('main');
    await expect(main).toContainText('가장 최근 주행 · 2026. 9. 27 09:11~09:32 · 21분');
    await expect(main).toContainText('최고 온도74°C');
    await expect(main).toContainText('평균 66.1°C · 스로틀 기준(87°C) 미만');
    await expect(main).toContainText('평균 전력8.4W');
    await expect(main).toContainText('최대 9.3W');
    await expect(main).toContainText('프레임 드롭23프레임');
    await expect(main).toContainText('전체 37,800프레임 중 0.06%');
    await expect(main).toContainText('GPS 수신95%');
    await expect(main).toContainText('1분 미수신 · 09:31');
  });

  test('차트 4개: 온도(스로틀 기준선)·전력·프레임 드롭·GPS, hover 크로스헤어', async ({ page }) => {
    await page.goto('/#/device');
    const temp = page.getByRole('img', { name: /온도 추이/ });
    await expect(temp).toContainText('스로틀 기준 87°C');
    const box = (await temp.boundingBox())!;
    const colX = (i: number) => box.x + 44 + ((box.width - 52) / 22) * (i + 0.5);
    await page.mouse.move(colX(8), box.y + box.height / 2);
    await expect(temp).toContainText('09:19');
    await expect(temp).toContainText('66°C');
    await expect(temp.locator('line')).toHaveCount(2); // 세로·가로 가이드선
    await page.mouse.move(0, 0);
    await expect(temp.locator('line')).toHaveCount(0);

    const power = page.getByRole('img', { name: /전력 추이/ });
    await power.focus();
    await page.keyboard.press('ArrowRight');
    await expect(power).toContainText('09:11');
    await expect(power).toContainText('5.8W');

    await expect(page.getByRole('img', { name: /구간별 프레임 드롭/ })).toBeVisible();
    await expect(page.getByText('최다 09:27 · 6프레임')).toBeVisible();
  });

  test('GPS 띠: 미수신 1칸, "목록에서 보기"는 위치 없는 기록을 선택', async ({ page }) => {
    await page.goto('/#/device');
    const strip = page.getByRole('img', { name: /GPS 수신, 미수신 09:31/ });
    await expect(strip.locator('span')).toHaveCount(22);
    await expect(page.getByText('미수신 1분 · 이 구간 기록 1건이 "위치 없음"으로 들어옴')).toBeVisible();
    await page.getByRole('link', { name: '목록에서 보기' }).click();
    await expect(page).toHaveURL(new RegExp(`sel=${rec('noloc')}`));
    await expect(rows(page).filter({ hasText: 'ID 미할당' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('스로틀 기준을 넘으면 경고로 표시', async ({ page }) => {
    await page.route(DEVICE_API, (route) =>
      route.fulfill({ json: { ...latestSession, max_temp: 91, throttle_temp: 87 } }),
    );
    await page.goto('/#/device');
    await expect(page.getByText('평균 66.1°C · 스로틀 기준(87°C) 초과')).toBeVisible();
  });

  test.describe('서버 응답 이상', () => {
    // 브라우저가 실패한 요청을 콘솔에 남기는 것은 이 테스트에서 예상된 일이다
    test.use({ allowedConsoleErrors: [/Failed to load resource/] });

    test('404 (세션 기록 없음) → 빈 상태', async ({ page }) => {
      await page.route(DEVICE_API, (route) => route.fulfill({ status: 404, json: { detail: '세션 기록 없음' } }));
      await page.goto('/#/device');
      await expect(page.getByText('주행 기록이 없습니다')).toBeVisible();
    });

    test('500 → 오류 안내, 다시 불러오기로 복구', async ({ page }) => {
      let fail = true;
      await page.route(DEVICE_API, (route) =>
        fail ? route.fulfill({ status: 500, json: { detail: 'boom' } }) : route.fulfill({ json: latestSession }),
      );
      await page.goto('/#/device');
      // TanStack Query가 한 번 재시도한 뒤 오류를 보여 준다
      await expect(page.getByText('기기 상태를 불러오지 못했습니다')).toBeVisible({ timeout: 10_000 });
      fail = false;
      await page.getByRole('button', { name: '다시 불러오기' }).click();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Jetson Nano');
    });

    test('명세와 다른 응답(배열 길이 불일치) → 어느 필드가 틀렸는지 안내', async ({ page }) => {
      await page.route(DEVICE_API, (route) =>
        route.fulfill({ json: { ...latestSession, telemetry: { ...latestSession.telemetry, temp: [1, 2, 3] } } }),
      );
      await page.goto('/#/device');
      await expect(page.getByText('기기 상태를 불러오지 못했습니다')).toBeVisible({ timeout: 10_000 });
      await expect(page.locator('main')).toContainText('telemetry');
    });
  });
});
