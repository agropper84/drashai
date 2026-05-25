'use client';
import { useEffect, useState } from 'react';

export type Theme = 'warm' | 'cool' | 'sacred';
export type Mode = 'light' | 'dark' | 'auto';

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('warm');
  const [mode, setModeState] = useState<Mode>('light');

  // load from localStorage on mount
  useEffect(() => {
    const t = (localStorage.getItem('drashai.theme') as Theme) || 'warm';
    const m = (localStorage.getItem('drashai.mode') as Mode) || 'light';
    setThemeState(t);
    setModeState(m);
  }, []);

  // sync to <html> + localStorage on change
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (mode === 'auto') document.documentElement.removeAttribute('data-mode');
    else document.documentElement.setAttribute('data-mode', mode);
    localStorage.setItem('drashai.theme', theme);
    localStorage.setItem('drashai.mode', mode);
  }, [theme, mode]);

  return { theme, setTheme: setThemeState, mode, setMode: setModeState };
}
