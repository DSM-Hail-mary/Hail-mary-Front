import { useCallback, useState } from 'react';

/** 화면 테마. black = 디자인 원본(다크), white = 밝은 테마. */
export type Theme = 'black' | 'white';

const STORAGE_KEY = 'hailmary.theme';

export function loadTheme(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'white' ? 'white' : 'black';
  } catch {
    return 'black';
  }
}

/** <html data-theme> 로 토큰을 갈아 끼운다 (styles/tokens.app.css). */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'white') root.dataset.theme = 'light';
  else delete root.dataset.theme;
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', theme === 'white' ? 'light' : 'dark');
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(loadTheme);
  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // 저장 못 해도 이번 화면에는 적용된다
    }
  }, []);
  return [theme, setTheme] as const;
}
