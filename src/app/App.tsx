import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense, useState } from 'react';
import { createHashRouter, Navigate, Outlet, RouterProvider } from 'react-router';
import { ApiProvider } from '@/api/ApiProvider';
import { useSyncStatus } from '@/api/queries';
import type { HailMaryApi } from '@/api/HailMaryApi';
import { MapPage } from '@/features/map/MapPage';
import { Loading } from '@/ui/EmptyState';
import styles from './App.module.css';
import { NavMemoryProvider } from './navMemory';
import { routes } from './routes';
import { TopBar } from './TopBar';

// 첫 화면(지도)만 바로 싣고, 상세·기기 화면은 처음 열 때 받는다.
const DetailPage = lazy(() => import('@/features/detail/DetailPage').then((m) => ({ default: m.DetailPage })));
const PolesIndexPage = lazy(() =>
  import('@/features/detail/PolesIndexPage').then((m) => ({ default: m.PolesIndexPage })),
);
const DevicePage = lazy(() => import('@/features/device/DevicePage').then((m) => ({ default: m.DevicePage })));

/** 동기화 상태를 주기적으로 확인하고, 새 데이터가 들어오면 화면 데이터를 다시 받는다 (화면 표시는 없음). */
function SyncWatcher() {
  useSyncStatus();
  return null;
}

function AppLayout() {
  return (
    <NavMemoryProvider>
      <div className={styles.app}>
        <SyncWatcher />
        <TopBar />
        <main className={styles.main}>
          <Suspense fallback={<Loading />}>
            <Outlet />
          </Suspense>
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

export function App({ api }: { api: HailMaryApi }) {
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
