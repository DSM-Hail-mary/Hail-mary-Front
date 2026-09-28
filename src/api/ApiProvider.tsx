import { createContext, useContext, type ReactNode } from 'react';
import type { HailMaryApi } from './HailMaryApi';

const ApiContext = createContext<HailMaryApi | null>(null);

export function ApiProvider({ api, children }: { api: HailMaryApi; children: ReactNode }) {
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApi(): HailMaryApi {
  const api = useContext(ApiContext);
  if (!api) throw new Error('useApi는 ApiProvider 안에서만 쓸 수 있습니다');
  return api;
}
