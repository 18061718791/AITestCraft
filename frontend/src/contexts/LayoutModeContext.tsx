import React, { createContext, useContext, useState, useCallback } from 'react';

export type LayoutMode = 'modern' | 'traditional';

interface LayoutModeContextType {
  layoutMode: LayoutMode;
  setLayoutMode: (mode: LayoutMode) => void;
  toggleLayoutMode: () => void;
}

const LayoutModeContext = createContext<LayoutModeContextType | undefined>(undefined);

export const LayoutModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 从 localStorage 读取保存的模式，默认为 modern
  const [layoutMode, setLayoutModeState] = useState<LayoutMode>(() => {
    const saved = localStorage.getItem('layoutMode');
    return (saved as LayoutMode) || 'modern';
  });

  const setLayoutMode = useCallback((mode: LayoutMode) => {
    setLayoutModeState(mode);
    localStorage.setItem('layoutMode', mode);
  }, []);

  const toggleLayoutMode = useCallback(() => {
    const newMode = layoutMode === 'modern' ? 'traditional' : 'modern';
    setLayoutMode(newMode);
  }, [layoutMode, setLayoutMode]);

  return (
    <LayoutModeContext.Provider value={{ layoutMode, setLayoutMode, toggleLayoutMode }}>
      {children}
    </LayoutModeContext.Provider>
  );
};

export const useLayoutMode = () => {
  const context = useContext(LayoutModeContext);
  if (!context) {
    throw new Error('useLayoutMode must be used within a LayoutModeProvider');
  }
  return context;
};
