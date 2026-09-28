import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { routes } from './routes';

/**
 * 탭을 오가도 보던 자리를 잃지 않게, 마지막 지도 URL(날짜·필터·선택)과
 * 마지막으로 연 상세 기록을 기억한다. 새로고침에도 유지되도록 sessionStorage에 둔다.
 */
interface NavMemory {
  /** 마지막 지도·목록 쿼리스트링 ("?date=..&sel=.."). */
  mapSearch: string;
  lastRecordId: string | null;
}

const STORAGE_KEY = 'polewatch.nav';

function load(): NavMemory {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return { mapSearch: '', lastRecordId: null, ...(JSON.parse(raw) as Partial<NavMemory>) };
  } catch {
    // 저장소를 못 쓰는 환경이면 기억 없이 동작한다.
  }
  return { mapSearch: '', lastRecordId: null };
}

const NavMemoryContext = createContext<NavMemory>({ mapSearch: '', lastRecordId: null });

export function NavMemoryProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [memory, setMemory] = useState<NavMemory>(load);

  useEffect(() => {
    // 경로에 따라 기억할 값을 갱신한다 (외부 상태인 URL → 로컬 기억 동기화).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMemory((prev) => {
      let next = prev;
      if (location.pathname === routes.paths.map) {
        next = { ...prev, mapSearch: location.search };
      } else if (location.pathname.startsWith(`${routes.paths.poles}/`)) {
        const id = decodeURIComponent(location.pathname.slice(routes.paths.poles.length + 1));
        if (id) next = { ...prev, lastRecordId: id };
      }
      if (next !== prev) {
        try {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // 무시
        }
      }
      return next;
    });
  }, [location.pathname, location.search]);

  return <NavMemoryContext.Provider value={memory}>{children}</NavMemoryContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNavMemory() {
  const memory = useContext(NavMemoryContext);
  const mapParams = new URLSearchParams(memory.mapSearch);
  return {
    ...memory,
    mapHref: `${routes.paths.map}${memory.mapSearch}`,
    /** 지도에서 보던 기준 날짜 (없으면 null). */
    mapDate: mapParams.get('date'),
  };
}
