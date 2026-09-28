import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
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

const STORAGE_KEY = 'hailmary.nav';

function load(): NavMemory {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return { mapSearch: '', lastRecordId: null, ...(JSON.parse(raw) as Partial<NavMemory>) };
  } catch {
    // 저장소를 못 쓰는 환경이면 기억 없이 동작한다.
  }
  return { mapSearch: '', lastRecordId: null };
}

interface NavMemoryValue extends NavMemory {
  /** 지도를 아직 안 본 채 상세로 바로 들어왔을 때, 지도 탭이 그 기록의 날짜·선택으로 열리게 한다. */
  seedMap: (date: string, recordId: string) => void;
}

const NavMemoryContext = createContext<NavMemoryValue>({ mapSearch: '', lastRecordId: null, seedMap: () => {} });

function persist(next: NavMemory) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // 저장소를 못 쓰면 이번 세션 메모리로만 기억한다.
  }
}

export function NavMemoryProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [memory, setMemory] = useState<NavMemory>(load);

  useEffect(() => {
    // 경로에 따라 기억할 값을 갱신한다 (외부 상태인 URL → 로컬 기억 동기화).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMemory((prev) => {
      let next = prev;
      if (location.pathname === routes.paths.map) {
        // 지도에서 고른 전주가 있으면 "상세 검수" 탭은 그 전주를 연다 (예전에 열었던 전주가 아니라)
        const sel = new URLSearchParams(location.search).get('sel');
        next = { ...prev, mapSearch: location.search, lastRecordId: sel ?? prev.lastRecordId };
      } else if (location.pathname.startsWith(`${routes.paths.poles}/`)) {
        const id = decodeURIComponent(location.pathname.slice(routes.paths.poles.length + 1));
        if (id) next = { ...prev, lastRecordId: id };
      }
      if (next !== prev) persist(next);
      return next;
    });
  }, [location.pathname, location.search]);

  const seedMap = useCallback((date: string, recordId: string) => {
    setMemory((prev) => {
      if (prev.mapSearch) return prev;
      const next = { ...prev, mapSearch: `?${new URLSearchParams({ date, sel: recordId })}` };
      persist(next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ ...memory, seedMap }), [memory, seedMap]);
  return <NavMemoryContext.Provider value={value}>{children}</NavMemoryContext.Provider>;
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
