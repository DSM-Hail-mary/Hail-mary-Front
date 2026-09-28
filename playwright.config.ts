import { defineConfig, devices } from '@playwright/test';

/**
 * E2E 기능 테스트 (mock API + 테스트 전용 예시 데이터 src/api/mock/sampleData.ts). `npm run e2e`
 * 지도 타일 요청은 테스트 안에서 가짜 응답으로 막아 외부 타일 서버를 부르지 않는다 (tests/e2e/fixtures.ts).
 */
const PORT = 5410;

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
      // 개발 서버가 아니라 배포용 빌드로 검사한다: 실행 중 의존성 재번들링으로 페이지가 새로고침되며
      // 테스트가 가끔 실패하던 문제가 없고, 실제로 배포될 결과물을 그대로 확인한다.
      command: `npx vite build --outDir dist-e2e --emptyOutDir && npx vite preview --outDir dist-e2e --port ${PORT} --strictPort`,
      port: PORT,
      // 매번 새로 빌드한다 (예전 빌드를 재사용하면 방금 고친 코드가 검사되지 않는다)
      reuseExistingServer: false,
      timeout: 120_000,
      // 테스트는 예시 데이터로 돌린다 (앱 기본 실행은 빈 상태). 빌드 시점에 들어간다.
      // 기기 상태는 실제 HTTP 경로로 부르고 테스트가 응답을 가로챈다 (tests/e2e/fixtures.ts)
      env: { VITE_MOCK_SAMPLE_DATA: 'true', VITE_DEVICE_API_BASE: 'http://127.0.0.1:8000' },
    },
  ],
});
