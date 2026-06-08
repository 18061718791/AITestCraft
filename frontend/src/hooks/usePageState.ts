import { useEffect, useRef, useCallback, useState } from 'react';
import { usePageTab, PageState } from '../contexts/PageTabContext';

export interface PageStateHandlers {
  /** 保存页面状态 */
  save: () => PageState;
  /** 恢复页面状态 */
  restore: (state: PageState) => void;
}

/**
 * 页面状态管理 Hook
 * 用于在页面组件中注册状态管理器
 */
export const usePageState = (
  path: string,
  handlers: PageStateHandlers,
  deps: React.DependencyList = []
) => {
  const { getTabByPath, updateTabState, isLoading, lastNavigationSource } = usePageTab();
  const handlersRef = useRef(handlers);
  const isRestoredRef = useRef(false);
  const [isReady, setIsReady] = useState(false);

  // 同步 handlers
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  // 等待 PageTabContext 初始化完成
  useEffect(() => {
    if (!isLoading && !isReady) {
      setIsReady(true);
    }
  }, [isLoading, isReady]);

  // 使用 ref 记录上一次的导航来源，用于检测变化
  const prevNavSourceRef = useRef(lastNavigationSource);
  
  // 当导航来源改变时，重置恢复标志
  // 这样从菜单进入页面后，下次从任务窗口切换时能正确恢复状态
  useEffect(() => {
    if (lastNavigationSource !== prevNavSourceRef.current) {
      isRestoredRef.current = false;
      prevNavSourceRef.current = lastNavigationSource;
      console.log(`[usePageState] 导航来源改变，重置恢复标志: ${path}, 来源: ${lastNavigationSource}`);
    }
  }, [lastNavigationSource, path]);

  // 恢复状态（只在首次加载时执行，且等待 PageTabContext 初始化完成）
  useEffect(() => {
    if (!isReady || isRestoredRef.current) return;

    const tab = getTabByPath(path);
    // 只有从任务窗口切换过来时才恢复状态
    if (lastNavigationSource === 'tab' && tab && tab.state && Object.keys(tab.state).length > 0) {
      console.log(`[usePageState] 从任务窗口切换，恢复页面状态: ${path}`, tab.state);
      try {
        handlersRef.current.restore(tab.state);
      } catch (error) {
        console.error('[usePageState] 恢复状态失败:', error);
      }
    } else {
      console.log(`[usePageState] 从菜单切换或新页面，不恢复状态: ${path}, 导航来源: ${lastNavigationSource}`);
    }
    isRestoredRef.current = true;
  }, [path, getTabByPath, isReady, lastNavigationSource]);

  // 自动保存状态（当依赖变化时）
  useEffect(() => {
    const tab = getTabByPath(path);
    if (!tab) return;

    const saveState = () => {
      try {
        const state = handlersRef.current.save();
        updateTabState(tab.id, state);
      } catch (error) {
        console.error('[usePageState] 保存状态失败:', error);
      }
    };

    // 使用 requestAnimationFrame 延迟保存，避免频繁更新
    const timer = requestAnimationFrame(saveState);
    return () => cancelAnimationFrame(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, getTabByPath, updateTabState, ...deps]);

  // 手动保存方法
  const manualSave = useCallback(() => {
    const tab = getTabByPath(path);
    if (!tab) return;

    try {
      const state = handlers.save();
      updateTabState(tab.id, state);
      console.log(`[usePageState] 手动保存状态: ${path}`);
    } catch (error) {
      console.error('[usePageState] 手动保存失败:', error);
    }
  }, [path, getTabByPath, updateTabState, handlers]);

  // 手动恢复方法
  const manualRestore = useCallback(() => {
    const tab = getTabByPath(path);
    if (!tab || !tab.state) return;

    try {
      handlers.restore(tab.state);
      console.log(`[usePageState] 手动恢复状态: ${path}`);
    } catch (error) {
      console.error('[usePageState] 手动恢复失败:', error);
    }
  }, [path, getTabByPath, handlers]);

  return {
    save: manualSave,
    restore: manualRestore,
  };
};

export default usePageState;
