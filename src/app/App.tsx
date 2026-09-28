import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { createHashRouter, Navigate, Outlet, RouterProvider } from 'react-router';
import { ApiProvider } from '@/api/ApiProvider';
import type { PoleWatchApi } from '@/api/PoleWatchApi';
import { DetailPage } from '@/features/detail/DetailPage';
import { PolesIndexPage } from '@/features/detail/PolesIndexPage';
import { DevicePage } from '@/features/device/DevicePage';
import { MapPage } from '@/features/map/MapPage';
import styles from './App.module.css';
import { NavMemoryProvider } from './navMemory';
import { routes } from './routes';
import { TopBar } from './TopBar';

function AppLayout() {
  return (
    <NavMemoryProvider>
      <div className={styles.app}>
        <TopBar />
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </NavMemoryProvider>
  );
}

// 해시 라우터: 정적 파일 서버 어디에 올려도 새로고침·딥링크가 동작한다.
const router = createHashRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to={routes.map()} replace /> },
      { path: routes.paths.map, element: <MapPage /> },
      { path: routes.paths.poles, element: <PolesIndexPage /> },
      { path: routes.paths.pole, element: <DetailPage /> },
      { path: routes.paths.device, element: <DevicePage /> },
      { path: '*', element: <Navigate to={routes.map()} replace /> },
    ],
  },
]);

export function App({ api }: { api: PoleWatchApi }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 데이터는 동기화 때만 바뀐다. 동기화 완료 시 무효화하므로 자주 다시 받을 필요 없다.
            staleTime: 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );
  return (
    <ApiProvider api={api}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ApiProvider>
  );
}
