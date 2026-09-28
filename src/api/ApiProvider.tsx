import { createContext, useContext, type ReactNode } from 'react';
import type { PoleWatchApi } from './PoleWatchApi';

const ApiContext = createContext<PoleWatchApi | null>(null);

export function ApiProvider({ api, children }: { api: PoleWatchApi; children: ReactNode }) {
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApi(): PoleWatchApi {
  const api = useContext(ApiContext);
  if (!api) throw new Error('useApi는 ApiProvider 안에서만 쓸 수 있습니다');
  return api;
}
