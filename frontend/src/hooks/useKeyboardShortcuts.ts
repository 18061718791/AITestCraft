import { useEffect, useRef, useCallback } from 'react';
import { ShortcutAction, ShortcutConfig } from '../config/shortcutConfig';

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  shortcuts: Partial<Record<ShortcutAction, ShortcutConfig>>;
  handlers: Partial<Record<ShortcutAction, () => void>>;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  target?: HTMLElement | Window | null;
}

/**
 * 键盘快捷键 Hook
 * 用于监听和处理键盘快捷键事件
 */
export const useKeyboardShortcuts = (options: UseKeyboardShortcutsOptions): void => {
  const {
    enabled = true,
    target = typeof window !== 'undefined' ? window : null,
  } = options;

  // 使用 ref 存储最新的配置，避免在 effect 中重复添加/移除监听器
  const optionsRef = useRef(options);
  optionsRef.current = options;

  /**
   * 检查键盘事件是否匹配快捷键配置
   */
  const matchShortcut = useCallback((event: KeyboardEvent, config: ShortcutConfig): boolean => {
    // 检查主键是否匹配
    if (event.key !== config.key) {
      return false;
    }

    // 检查修饰键
    if (!!event.ctrlKey !== !!config.ctrlKey) {
      return false;
    }
    if (!!event.altKey !== !!config.altKey) {
      return false;
    }
    if (!!event.shiftKey !== !!config.shiftKey) {
      return false;
    }
    if (!!event.metaKey !== !!config.metaKey) {
      return false;
    }

    return true;
  }, []);

  /**
   * 查找匹配的快捷键动作
   */
  const findMatchingAction = useCallback((event: KeyboardEvent): ShortcutAction | null => {
    const { shortcuts: currentShortcuts } = optionsRef.current;

    for (const [action, config] of Object.entries(currentShortcuts)) {
      if (matchShortcut(event, config)) {
        return action as ShortcutAction;
      }
    }

    return null;
  }, [matchShortcut]);

  useEffect(() => {
    if (!enabled || !target) {
      return;
    }

    const handleKeyDown = (event: Event): void => {
      const keyboardEvent = event as KeyboardEvent;
      const { handlers: currentHandlers, preventDefault: shouldPreventDefault, stopPropagation: shouldStopPropagation } = optionsRef.current;

      // 检查当前焦点是否在输入元素中，如果是则跳过快捷键处理
      const activeElement = document.activeElement;
      if (activeElement) {
        const tagName = activeElement.tagName.toLowerCase();
        const isInputElement = tagName === 'input' || tagName === 'textarea' || activeElement.getAttribute('contenteditable') === 'true';
        if (isInputElement) {
          return;
        }
      }

      // 查找匹配的快捷键
      const matchedAction = findMatchingAction(keyboardEvent);

      if (matchedAction) {
        const handler = currentHandlers[matchedAction];

        if (handler) {
          // 阻止默认行为
          if (shouldPreventDefault) {
            keyboardEvent.preventDefault();
          }

          // 阻止事件冒泡
          if (shouldStopPropagation) {
            keyboardEvent.stopPropagation();
          }

          // 执行处理器
          handler();
        }
      }
    };

    target.addEventListener('keydown', handleKeyDown);

    return () => {
      target.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, target, findMatchingAction]);
};

/**
 * 监听单个快捷键的 Hook
 */
interface UseSingleShortcutOptions {
  enabled?: boolean;
  shortcut: ShortcutConfig;
  handler: () => void;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  target?: HTMLElement | Window | null;
}

export const useSingleShortcut = (options: UseSingleShortcutOptions): void => {
  const {
    enabled = true,
    shortcut,
    handler,
    preventDefault = true,
    stopPropagation = false,
    target = typeof window !== 'undefined' ? window : null,
  } = options;

  const shortcutRef = useRef(shortcut);
  const handlerRef = useRef(handler);

  shortcutRef.current = shortcut;
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled || !target) {
      return;
    }

    const handleKeyDown = (event: Event): void => {
      const keyboardEvent = event as KeyboardEvent;
      const currentShortcut = shortcutRef.current;
      const currentHandler = handlerRef.current;

      // 检查当前焦点是否在输入元素中，如果是则跳过快捷键处理
      const activeElement = document.activeElement;
      if (activeElement) {
        const tagName = activeElement.tagName.toLowerCase();
        const isInputElement = tagName === 'input' || tagName === 'textarea' || activeElement.getAttribute('contenteditable') === 'true';
        if (isInputElement) {
          return;
        }
      }

      // 检查是否匹配
      if (
        keyboardEvent.key === currentShortcut.key &&
        !!keyboardEvent.ctrlKey === !!currentShortcut.ctrlKey &&
        !!keyboardEvent.altKey === !!currentShortcut.altKey &&
        !!keyboardEvent.shiftKey === !!currentShortcut.shiftKey &&
        !!keyboardEvent.metaKey === !!currentShortcut.metaKey
      ) {
        if (preventDefault) {
          keyboardEvent.preventDefault();
        }
        if (stopPropagation) {
          keyboardEvent.stopPropagation();
        }
        currentHandler();
      }
    };

    target.addEventListener('keydown', handleKeyDown);

    return () => {
      target.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, target, preventDefault, stopPropagation]);
};

/**
 * 快捷键记录 Hook
 * 用于捕获用户按下的快捷键组合
 */
interface UseShortcutRecorderOptions {
  onRecord?: (shortcut: ShortcutConfig) => void;
  onCancel?: () => void;
  enabled?: boolean;
  excludeKeys?: string[];
}

interface UseShortcutRecorderReturn {
  isRecording: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  recordedShortcut: ShortcutConfig | null;
}

export const useShortcutRecorder = (options: UseShortcutRecorderOptions = {}): UseShortcutRecorderReturn => {
  const { onRecord, onCancel, enabled = true, excludeKeys = [] } = options;

  const [isRecording, setIsRecording] = React.useState(false);
  const [recordedShortcut, setRecordedShortcut] = React.useState<ShortcutConfig | null>(null);

  // 使用 ref 存储回调函数，避免依赖问题
  const onRecordRef = useRef(onRecord);
  const onCancelRef = useRef(onCancel);

  onRecordRef.current = onRecord;
  onCancelRef.current = onCancel;

  const startRecording = useCallback(() => {
    if (enabled) {
      setIsRecording(true);
      setRecordedShortcut(null);
    }
  }, [enabled]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
  }, []);

  useEffect(() => {
    if (!isRecording) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      // 忽略单独的修饰键
      if (['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) {
        return;
      }

      // 忽略排除的键
      if (excludeKeys.includes(event.key)) {
        return;
      }

      // 构建快捷键配置
      const shortcut: ShortcutConfig = {
        key: event.key,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        shiftKey: event.shiftKey,
        metaKey: event.metaKey,
        description: '',
      };

      // 阻止默认行为
      event.preventDefault();
      event.stopPropagation();

      setRecordedShortcut(shortcut);
      setIsRecording(false);

      onRecordRef.current?.(shortcut);
    };

    const handleKeyUp = (event: KeyboardEvent): void => {
      // 如果按下的是 Escape，取消录制
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsRecording(false);
        onCancelRef.current?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isRecording, excludeKeys]);

  return {
    isRecording,
    startRecording,
    stopRecording,
    recordedShortcut,
  };
};

// 导入 React 用于 useShortcutRecorder
import React from 'react';

export default useKeyboardShortcuts;
