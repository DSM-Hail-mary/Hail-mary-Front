import styles from './Logo.module.css';

/**
 * HailMary 로고. 마크는 docs/design/logo/ 원본(뷰파인더 모서리 + 전주)을 그대로 옮겼고,
 * 워드마크 글자만 프로젝트 이름(HailMary)으로 쓴다. 원본 PNG 속 글자는 옛 가칭 PoleWatch.
 * PNG 대신 SVG로 옮겨 어떤 크기에서도 선명하고, 색은 디자인 토큰을 따른다.
 * 좌표는 1024px 원본을 64 격자로 옮긴 값 (1칸 = 16px).
 */
const MARK_PATH =
  // 뷰파인더 모서리 네 개
  'M10 10h14v4H14v10h-4zM40 10h14v14h-4V14H40zM10 40h4v10h10v4H10zM50 40h4v14H40v-4h10z' +
  // 전주: 애자 세 개 + 완금 + 기둥
  'M20 19h4v6h6v-6h4v6h6v-6h4v10H34v17h-4V29H20z';

/** 마크만. yellow: 노란 바탕 + 검은 선 (기본), dark: 검은 바탕 + 노란 모서리 + 흰 전주. */
export function LogoMark({ size = 30, variant = 'yellow' }: { size?: number; variant?: 'yellow' | 'dark' }) {
  if (variant === 'dark') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <rect width="64" height="64" rx="14" fill="var(--pw-text-on-light)" />
        <path
          fill="var(--pw-brand)"
          d="M10 10h14v4H14v10h-4zM40 10h14v14h-4V14H40zM10 40h4v10h10v4H10zM50 40h4v14H40v-4h10z"
        />
        <path fill="var(--pw-text)" d="M20 19h4v6h6v-6h4v6h6v-6h4v10H34v17h-4V29H20z" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="14" fill="var(--pw-brand)" />
      <path fill="var(--pw-text-on-light)" d={MARK_PATH} />
    </svg>
  );
}

/** 마크 + 워드마크 ("Hail" 굵게 · "Mary" 노랑). 화면 읽기 프로그램에는 "HailMary"로 읽힌다. */
export function Logo({ size = 30 }: { size?: number }) {
  return (
    <span className={styles.logo} aria-label="HailMary" role="img">
      <LogoMark size={size} />
      <span className={styles.word} aria-hidden="true" style={{ fontSize: Math.round(size * 0.62) }}>
        <span className={styles.strong}>Hail</span>
        <span className={styles.accent}>Mary</span>
      </span>
    </span>
  );
}
