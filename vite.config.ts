import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // 상대 경로로 빌드해 어떤 정적 서버/하위 경로에 올려도 동작하게 한다 (HashRouter와 짝).
  base: './',
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    // 순수 로직 테스트는 node로 충분하다. DOM이 필요한 파일은 맨 위에 `// @vitest-environment jsdom`을 둔다.
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
