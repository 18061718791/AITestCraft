import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeConfig } from 'antd';
import {
  lightThemeConfig,
  darkThemeConfig,
  geekLightThemeConfig,
  ThemeType
} from '../styles/theme';

interface ThemeContextType {
  currentTheme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  themeConfig: ThemeConfig;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'aitestcraft-theme';

const getThemeConfig = (theme: ThemeType): ThemeConfig => {
  switch (theme) {
    case 'dark':
      return darkThemeConfig;
    case 'geek-light':
      return geekLightThemeConfig;
    default:
      return lightThemeConfig;
  }
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<ThemeType>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeType;
      return saved || 'light';
    }
    return 'light';
  });

  const themeConfig = getThemeConfig(currentTheme);
  const isDark = currentTheme === 'dark';

  useEffect(() => {
    // 保存主题到本地存储
    localStorage.setItem(THEME_STORAGE_KEY, currentTheme);

    // 设置data-theme属性用于CSS选择器
    document.documentElement.setAttribute('data-theme', currentTheme);

    // 设置深色模式类名（只有dark主题才添加dark类）
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, [currentTheme, isDark]);

  const setTheme = (theme: ThemeType) => {
    setCurrentTheme(theme);
  };

  const toggleTheme = () => {
    setCurrentTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme, themeConfig, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
