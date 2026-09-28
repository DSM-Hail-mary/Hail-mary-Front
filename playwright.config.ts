import { defineConfig, devices } from '@playwright/test';

/**
 * E2E 기능 테스트 (mock 데이터). `npm run e2e`
 * - 기본 서버: 동기화 완료 상태
 * - 두 번째 서버: 동기화 실패 상태에서 시작 (VITE_MOCK_SYNC=failed)
 * 지도 타일 요청은 테스트 안에서 가짜 응답으로 막아 외부 타일 서버를 부르지 않는다 (tests/e2e/fixtures.ts).
 */
const PORT = 5410;
const FAILED_SYNC_PORT = 5411;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices['Desktop Chrome'],
    viewport: { width: 1440, height: 900 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    // 타일 캐시 서비스 워커가 가로채면 요청 차단(route)이 안 먹으므로 끈다.
    serviceWorkers: 'block',
    acceptDownloads: true,
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: `npx vite --port ${PORT} --strictPort`,
      port: PORT,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `npx vite --port ${FAILED_SYNC_PORT} --strictPort`,
      port: FAILED_SYNC_PORT,
      reuseExistingServer: !process.env.CI,
      env: { VITE_MOCK_SYNC: 'failed' },
    },
  ],
});

export const FAILED_SYNC_URL = `http://localhost:${FAILED_SYNC_PORT}`;
