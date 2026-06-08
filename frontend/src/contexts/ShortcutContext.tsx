import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  ShortcutAction,
  ShortcutConfig,
  ShortcutMap,
  defaultShortcuts,
  validateShortcut,
  isSameShortcut,
} from '../config/shortcutConfig';
import { shortcutApi, ShortcutMap as ApiShortcutMap } from '../services/shortcutApi';

type ActivePanel = 'left' | 'right' | 'bottom' | null;

interface ShortcutContextType {
  shortcuts: ShortcutMap;
  updateShortcut: (action: ShortcutAction, config: ShortcutConfig) => { success: boolean; message?: string };
  resetShortcut: (action: ShortcutAction) => Promise<void>;
  resetAllShortcuts: () => Promise<void>;
  validateShortcut: (config: ShortcutConfig, excludeAction?: ShortcutAction) => { valid: boolean; message?: string };
  getShortcutString: (action: ShortcutAction) => string;
  isEnabled: boolean;
  setIsEnabled: (enabled: boolean) => void;
  toggleEnabled: () => void;
  activePanel: ActivePanel;
  setActivePanel: (panel: ActivePanel) => void;
  canActivatePanel: (panel: ActivePanel) => boolean;
}

const ShortcutContext = createContext<ShortcutContextType | undefined>(undefined);

/**
 * 从API加载快捷键配置
 */
const loadShortcutsFromStorage = async (): Promise<ShortcutMap | null> => {
  try {
    const response = await shortcutApi.getShortcuts();
    if (response.success && response.data) {
      const parsed = response.data as ApiShortcutMap;
      const requiredActions: ShortcutAction[] = ['toggleLeftPanel', 'toggleRightPanel', 'toggleBottomPanel'];
      const isValid = requiredActions.every(action => action in parsed);
      if (isValid) {
        return parsed as unknown as ShortcutMap;
      }
    }
  } catch (error) {
    console.error('加载快捷键配置失败:', error);
  }
  return null;
};

/**
 * 保存快捷键配置到API
 */
const saveShortcutsToStorage = async (shortcuts: ShortcutMap): Promise<void> => {
  try {
    await shortcutApi.saveShortcuts(shortcuts as unknown as ApiShortcutMap);
  } catch (error) {
    console.error('保存快捷键配置失败:', error);
  }
};

/**
 * 从API加载启用状态
 */
const loadEnabledFromStorage = async (): Promise<boolean> => {
  try {
    const response = await shortcutApi.getShortcutEnabled();
    if (response.success && response.data) {
      return response.data.enabled;
    }
  } catch (error) {
    console.error('加载快捷键启用状态失败:', error);
  }
  return true;
};

/**
 * 保存启用状态到API
 */
const saveEnabledToStorage = async (enabled: boolean): Promise<void> => {
  try {
    await shortcutApi.setShortcutEnabled(enabled);
  } catch (error) {
    console.error('保存快捷键启用状态失败:', error);
  }
};

export const ShortcutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [shortcuts, setShortcuts] = useState<ShortcutMap>(defaultShortcuts);
  const [isEnabled, setIsEnabledState] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(true);
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const savedShortcuts = await loadShortcutsFromStorage();
        if (savedShortcuts) {
          setShortcuts(savedShortcuts);
        }
        const enabled = await loadEnabledFromStorage();
        setIsEnabledState(enabled);
      } catch (error) {
        console.error('加载快捷键配置失败:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      saveShortcutsToStorage(shortcuts);
    }
  }, [shortcuts, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      saveEnabledToStorage(isEnabled);
    }
  }, [isEnabled, isLoading]);

  /**
   * 更新指定动作的快捷键配置
   */
  const updateShortcut = useCallback((
    action: ShortcutAction,
    config: ShortcutConfig
  ): { success: boolean; message?: string } => {
    // 验证配置
    const validation = validateShortcut(config);
    if (!validation.valid) {
      return { success: false, message: validation.message };
    }

    // 检查是否与其他动作的快捷键冲突
    for (const [otherAction, otherConfig] of Object.entries(shortcuts)) {
      if (otherAction !== action && isSameShortcut(config, otherConfig)) {
        return {
          success: false,
          message: `快捷键已被"${otherConfig.description}"使用`,
        };
      }
    }

    setShortcuts(prev => ({
      ...prev,
      [action]: { ...config },
    }));

    return { success: true };
  }, [shortcuts]);

  /**
   * 重置指定动作的快捷键为默认值
   */
  const resetShortcut = useCallback(async (action: ShortcutAction): Promise<void> => {
    try {
      const defaultConfig = defaultShortcuts[action];
      const newShortcuts = { ...shortcuts, [action]: defaultConfig };
      const response = await shortcutApi.saveShortcuts(newShortcuts);
      if (response.success && response.data) {
        const savedShortcuts = response.data as unknown as ShortcutMap;
        setShortcuts(savedShortcuts);
      }
    } catch (error) {
      console.error('重置快捷键失败:', error);
    }
  }, [shortcuts]);

  /**
   * 重置所有快捷键为默认值
   */
  const resetAllShortcuts = useCallback(async (): Promise<void> => {
    try {
      const response = await shortcutApi.resetShortcuts();
      if (response.success && response.data) {
        const newShortcuts = response.data as unknown as ShortcutMap;
        setShortcuts(newShortcuts);
      }
    } catch (error) {
      console.error('重置所有快捷键失败:', error);
    }
  }, []);

  /**
   * 验证快捷键配置（排除指定动作）
   */
  const validateShortcutWithExclude = useCallback((
    config: ShortcutConfig,
    excludeAction?: ShortcutAction
  ): { valid: boolean; message?: string } => {
    // 基础验证
    const validation = validateShortcut(config);
    if (!validation.valid) {
      return validation;
    }

    // 检查与其他动作的冲突
    for (const [action, otherConfig] of Object.entries(shortcuts)) {
      if (action !== excludeAction && isSameShortcut(config, otherConfig)) {
        return {
          valid: false,
          message: `快捷键已被"${otherConfig.description}"使用`,
        };
      }
    }

    return { valid: true };
  }, [shortcuts]);

  /**
   * 获取指定动作的快捷键字符串表示
   */
  const getShortcutString = useCallback((action: ShortcutAction): string => {
    const config = shortcuts[action];
    if (!config) return '';

    const parts: string[] = [];
    const isMac = navigator.platform.toLowerCase().includes('mac');

    if (config.metaKey) {
      parts.push(isMac ? '⌘' : 'Meta');
    }
    if (config.ctrlKey) {
      parts.push(isMac ? '⌃' : 'Ctrl');
    }
    if (config.altKey) {
      parts.push(isMac ? '⌥' : 'Alt');
    }
    if (config.shiftKey) {
      parts.push(isMac ? '⇧' : 'Shift');
    }

    // 转换特殊键名为可读格式
    const keyMap: Record<string, string> = {
      'ArrowLeft': '←',
      'ArrowRight': '→',
      'ArrowUp': '↑',
      'ArrowDown': '↓',
      'Tab': 'Tab',
      'Enter': '↵',
      'Escape': 'Esc',
      'Delete': 'Del',
      'Backspace': '⌫',
      'Space': 'Space',
    };

    parts.push(keyMap[config.key] || config.key);

    return parts.join('+');
  }, [shortcuts]);

  /**
   * 设置快捷键启用状态
   */
  const setIsEnabled = useCallback((enabled: boolean): void => {
    setIsEnabledState(enabled);
  }, []);

  /**
   * 切换快捷键启用状态
   */
  const toggleEnabled = useCallback((): void => {
    setIsEnabledState(prev => !prev);
  }, []);

  /**
   * 检查是否可以激活指定面板
   * 互斥逻辑：如果已经有其他面板被激活，则返回 false
   */
  const canActivatePanel = useCallback((panel: ActivePanel): boolean => {
    // 如果当前没有激活的面板，或者要激活的就是当前激活的面板，允许
    return activePanel === null || activePanel === panel;
  }, [activePanel]);

  const value: ShortcutContextType = {
    shortcuts,
    updateShortcut,
    resetShortcut,
    resetAllShortcuts,
    validateShortcut: validateShortcutWithExclude,
    getShortcutString,
    isEnabled,
    setIsEnabled,
    toggleEnabled,
    activePanel,
    setActivePanel,
    canActivatePanel,
  };

  return (
    <ShortcutContext.Provider value={value}>
      {children}
    </ShortcutContext.Provider>
  );
};

export const useShortcut = (): ShortcutContextType => {
  const context = useContext(ShortcutContext);
  if (!context) {
    throw new Error('useShortcut must be used within a ShortcutProvider');
  }
  return context;
};

export default ShortcutContext;
