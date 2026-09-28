import { Link, useLocation } from 'react-router';
import { Logo } from '@/ui/Logo';
import { useNavMemory } from './navMemory';
import { routes } from './routes';
import { ThemeToggle } from './ThemeToggle';
import styles from './TopBar.module.css';

/** 공통 상단 바: 로고 · 탭 3개 · 동기화 상태. */
export function TopBar() {
  const { mapHref, lastRecordId } = useNavMemory();
  const { pathname } = useLocation();
  const tabs = [
    { to: mapHref, label: '지도', match: routes.paths.map },
    {
      to: lastRecordId ? routes.pole(lastRecordId) : routes.poles(),
      label: '상세 검수',
      match: routes.paths.poles,
    },
    { to: routes.device(), label: '기기 상태', match: routes.paths.device },
  ];
  return (
    <header className={styles.bar}>
      <div className={styles.brand}>
        <Logo size={30} />
      </div>
      <nav aria-label="화면" className={styles.nav}>
        {tabs.map((t) => {
          // 하위 경로(/poles/:id)나 쿼리가 달라도 같은 화면이면 현재 탭이다.
          const active = pathname === t.match || pathname.startsWith(`${t.match}/`);
          return (
            <Link
              key={t.match}
              to={t.to}
              aria-current={active ? 'page' : undefined}
              className={`${styles.tab} ${active ? styles.tabActive : ''}`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
      <div className={styles.spacer} />
      <ThemeToggle />
    </header>
  );
}
