import styles from './TopBar.module.css';
import { useTheme, type Theme } from './theme';

const OPTIONS: { value: Theme; label: string }[] = [
  { value: 'black', label: 'Black' },
  { value: 'white', label: 'White' },
];

/** 상단 바 오른쪽 Black / White 테마 전환. 선택은 브라우저에 기억한다. */
export function ThemeToggle() {
  const [theme, setTheme] = useTheme();
  return (
    <div role="group" aria-label="화면 테마" className={styles.theme}>
      {OPTIONS.map((o) => (
        <button key={o.value} type="button" aria-pressed={theme === o.value} onClick={() => setTheme(o.value)}>
          <span className={styles.swatch} data-theme-swatch={o.value} aria-hidden="true" />
          {o.label}
        </button>
      ))}
    </div>
  );
}
