import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  blurSensitive: boolean;
  setBlurSensitive: (val: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('framenew_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });
  const [blurSensitive, setBlurSensitiveState] = useState<boolean>(() => {
    return localStorage.getItem('framenew_blur_cw') !== 'false';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('framenew_theme', theme);
  }, [theme]);

  const setBlurSensitive = (val: boolean) => {
    setBlurSensitiveState(val);
    localStorage.setItem('framenew_blur_cw', String(val));
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme: () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light')),
        blurSensitive,
        setBlurSensitive,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
