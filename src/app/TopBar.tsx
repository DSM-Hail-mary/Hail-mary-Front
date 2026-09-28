import { Link, useLocation } from 'react-router';
import { useNavMemory } from './navMemory';
import { routes } from './routes';
import { SyncIndicator } from './SyncIndicator';
import styles from './TopBar.module.css';

/** 공통 상단 바: 로고 · 탭 3개 · 동기화 상태. */
export function TopBar() {
  const { mapHref, lastRecordId } = useNavMemory();
  const { pathname } = useLocation();
  const tabs = [
    { to: mapHref, label: '지도·목록', match: routes.paths.map },
    {
      to: lastRecordId ? routes.pole(lastRecordId) : routes.poles(),
      label: '전주 상세·검수',
      match: routes.paths.poles,
    },
    { to: routes.device(), label: '기기 상태', match: routes.paths.device },
  ];
  return (
    <header className={styles.bar}>
      <div className={styles.brand}>
        <Logo />
        <span className={styles.brandName}>PoleWatch</span>
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
      <SyncIndicator />
    </header>
  );
}

function Logo() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
      <rect width="30" height="30" rx="7" fill="var(--pw-brand)" />
      <rect x="13.5" y="6" width="3" height="19" fill="var(--pw-text-on-light)" />
      <rect x="7" y="9" width="16" height="2.6" rx="1" fill="var(--pw-text-on-light)" />
      <circle cx="22" cy="21" r="4" fill="none" stroke="var(--pw-text-on-light)" strokeWidth="2" />
    </svg>
  );
}
