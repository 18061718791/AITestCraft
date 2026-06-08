import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getDefaultPageMeta, ModuleType } from '../config/pageMeta';
import { screenshotStorage } from '../utils/screenshotStorage';
import { usePageScreenshot } from '../hooks/usePageScreenshot';

// localStorage 存储键名（只存储标签元数据，不存储截图）
const PAGETAB_STORAGE_KEY = 'pageTabHistory';
const SESSION_KEY = 'pageTabSession'; // 用于检测新会话
const MAX_TABS = 6; // 最大标签数量

/**
 * 页面状态类型
 */
export interface PageState {
  [key: string]: unknown;
}

/**
 * 滚动位置
 */
export interface ScrollPosition {
  x: number;
  y: number;
}

/**
 * 页面标签数据
 */
export interface PageTab {
  id: string; // 唯一标识
  path: string; // 路由路径
  title: string; // 页面标题
  icon: string; // 图标名称
  module: ModuleType; // 所属模块
  state: PageState; // 页面状态
  screenshot: string | null; // 截图数据（base64）- 运行时缓存
  scrollPosition: ScrollPosition; // 滚动位置
  timestamp: number; // 访问时间戳
  isActive: boolean; // 是否为当前活动标签
}

/**
 * 导航来源类型
 */
export type NavigationSource = 'sidebar' | 'tab' | 'direct';

/**
 * Context 类型定义
 */
interface PageTabContextType {
  tabs: PageTab[];
  activeTabId: string | null;
  isLoading: boolean;
  isFlipping: boolean; // 翻转动画状态
  flipDirection: 'left' | 'right' | null; // 翻转方向
  lastNavigationSource: NavigationSource; // 上次导航来源
  addTab: (path: string, screenshot?: string | null) => Promise<void>;
  switchTab: (tabId: string) => Promise<void>;
  closeTab: (tabId: string) => void;
  closeOtherTabs: (tabId: string) => void;
  closeAllTabs: () => void;
  refreshTab: (tabId: string) => Promise<void>;
  updateTabState: (tabId: string, state: PageState) => void;
  updateTabScreenshot: (tabId: string, screenshot: string | null) => Promise<void>;
  updateScrollPosition: (tabId: string, position: ScrollPosition) => void;
  getTabById: (tabId: string) => PageTab | undefined;
  getTabByPath: (path: string) => PageTab | undefined;
  navigateFromSidebar: (path: string) => void; // 从侧边栏导航（重置页面状态）
}

const PageTabContext = createContext<PageTabContextType | undefined>(undefined);

/**
 * 生成标签 ID
 */
const generateTabId = (path: string): string => {
  return `${path}_${Date.now()}`;
};

/**
 * 检查是否为新会话（新打开浏览器或新标签页）
 */
const isNewSession = (): boolean => {
  try {
    const sessionId = sessionStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      // 新会话，设置标记
      sessionStorage.setItem(SESSION_KEY, Date.now().toString());
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
};

/**
 * 从 localStorage 加载标签数据（不包含截图）
 */
const loadTabsFromStorage = (): PageTab[] => {
  try {
    // 如果是新会话，清空历史标签
    if (isNewSession()) {
      localStorage.removeItem(PAGETAB_STORAGE_KEY);
      return [];
    }

    const stored = localStorage.getItem(PAGETAB_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // 恢复时重置 isActive 状态，截图设为 null（从 IndexedDB 加载）
      return parsed.map((tab: PageTab) => ({
        ...tab,
        isActive: false,
        screenshot: null,
      }));
    }
  } catch (error) {
    // 加载失败时返回空数组
  }
  return [];
};

/**
 * 保存标签数据到 localStorage（不包含截图）
 */
const saveTabsToStorage = (tabs: PageTab[]) => {
  try {
    // 不保存截图，只保存元数据
    const tabsWithoutScreenshot = tabs.map((tab) => ({
      ...tab,
      screenshot: null,
    }));
    localStorage.setItem(PAGETAB_STORAGE_KEY, JSON.stringify(tabsWithoutScreenshot));
  } catch (error) {
    console.error('[PageTabContext] 保存到 localStorage 失败:', error);
  }
};

/**
 * 页面标签 Provider
 */
export const PageTabProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { captureQuick } = usePageScreenshot();

  const [tabs, setTabs] = useState<PageTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<'left' | 'right' | null>(null);
  const [lastNavigationSource, setLastNavigationSource] = useState<NavigationSource>('direct');

  const tabsRef = useRef(tabs);
  const activeTabIdRef = useRef(activeTabId);
  const isCapturingRef = useRef(false);
  const prevPathRef = useRef<string>('');
  const prevTabIdRef = useRef<string | null>(null);
  const navigationSourceRef = useRef<NavigationSource>('direct');

  // 同步 ref
  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);

  useEffect(() => {
    activeTabIdRef.current = activeTabId;
  }, [activeTabId]);

  // 初始化：从 localStorage 加载标签，并为当前页面创建标签（如果不存在）
  useEffect(() => {
    const init = async () => {
      const currentPath = location.pathname;
      const loadedTabs = loadTabsFromStorage();

      // 从 IndexedDB 加载截图
      const tabsWithScreenshots = await Promise.all(
        loadedTabs.map(async (tab) => {
          try {
            const screenshot = await screenshotStorage.getScreenshot(tab.id);
            return { ...tab, screenshot };
          } catch (error) {
            return tab;
          }
        })
      );

      // 如果当前不在首页且标签列表中没有当前页面，立即创建标签
      if (currentPath !== '/') {
        const existingTab = tabsWithScreenshots.find((tab) => tab.path === currentPath);
        if (!existingTab) {
          const meta = getDefaultPageMeta(currentPath);
          const newTab: PageTab = {
            id: generateTabId(currentPath),
            path: currentPath,
            title: meta.title,
            icon: meta.icon,
            module: meta.module,
            state: {},
            screenshot: null,
            scrollPosition: { x: 0, y: 0 },
            timestamp: Date.now(),
            isActive: true,
          };
          tabsWithScreenshots.push(newTab);
          setActiveTabId(newTab.id);
          prevTabIdRef.current = newTab.id;
          console.log('[PageTabContext] 初始化创建标签:', newTab.title);

          // 立即截图
          const initTabId = newTab.id;
          const initTabPath = newTab.path;
          setTimeout(async () => {
            if (!isCapturingRef.current) {
              const contentArea = document.querySelector('.page-content-area') as HTMLDivElement;
              if (contentArea) {
                isCapturingRef.current = true;
                try {
                  const screenshot = await captureQuick(contentArea);
                  if (screenshot) {
                    setTabs((prev) =>
                      prev.map((tab) =>
                        tab.id === initTabId ? { ...tab, screenshot } : tab
                      )
                    );
                    await screenshotStorage.saveScreenshot(initTabId, initTabPath, screenshot);
                    console.log('[PageTabContext] 初始页面截图已保存:', initTabPath);
                  }
                } catch (error) {
                  console.error('[PageTabContext] 初始页面截图失败:', error);
                } finally {
                  isCapturingRef.current = false;
                }
              }
            }
          }, 600);
        } else {
          // 激活已有标签
          setActiveTabId(existingTab.id);
          prevTabIdRef.current = existingTab.id;
          // 更新活动状态
          const updatedTabs = tabsWithScreenshots.map((tab) => ({
            ...tab,
            isActive: tab.path === currentPath,
          }));
          setTabs(updatedTabs);
          setIsLoading(false);
          console.log('[PageTabContext] 已加载标签:', tabsWithScreenshots.length);
          return;
        }
      }

      setTabs(tabsWithScreenshots);
      setIsLoading(false);
      console.log('[PageTabContext] 已加载标签:', tabsWithScreenshots.length);
    };

    init();
  }, []);

  // 监听浏览器关闭，清空数据
  useEffect(() => {
    const handleBeforeUnload = () => {
      // 浏览器关闭时清空数据
      try {
        localStorage.removeItem(PAGETAB_STORAGE_KEY);
        // IndexedDB 数据在 clearAllScreenshots 中处理
        screenshotStorage.clearAllScreenshots();
        console.log('[PageTabContext] 浏览器关闭，已清空数据');
      } catch (error) {
        console.error('[PageTabContext] 清空数据失败:', error);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // 自动保存到 localStorage（不包含截图）
  useEffect(() => {
    if (!isLoading) {
      saveTabsToStorage(tabs);
    }
  }, [tabs, isLoading]);

  /**
   * 根据 ID 获取标签
   */
  const getTabById = useCallback((tabId: string): PageTab | undefined => {
    return tabsRef.current.find((tab) => tab.id === tabId);
  }, []);

  /**
   * 根据路径获取标签
   */
  const getTabByPath = useCallback((path: string): PageTab | undefined => {
    return tabsRef.current.find((tab) => tab.path === path);
  }, []);

  /**
   * 更新标签截图
   */
  const updateTabScreenshot = useCallback(
    async (tabId: string, screenshot: string | null) => {
      // 更新内存中的状态
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id === tabId ? { ...tab, screenshot } : tab
        )
      );

      // 保存到 IndexedDB
      if (screenshot) {
        const tab = getTabById(tabId);
        if (tab) {
          try {
            await screenshotStorage.saveScreenshot(tabId, tab.path, screenshot);
          } catch (error) {
            // 保存截图失败时静默处理
          }
        }
      }
    },
    [getTabById]
  );

  // 监听路由变化，自动添加或切换标签
  useEffect(() => {
    // 等待初始化完成
    if (isLoading) return;

    const currentPath = location.pathname;

    // 跳过首页
    if (currentPath === '/') {
      prevPathRef.current = currentPath;
      return;
    }

    // 如果当前页面已经初始化创建了标签，跳过处理
    if (prevPathRef.current === currentPath) {
      return;
    }

    const handlePageChange = async () => {
      // 注意：路由变化时，当前显示的内容已经是新页面了
      // 所以这里不应该再保存"上一页"的截图，因为获取到的是新页面的内容
      // 截图应该在离开页面前保存，而不是在路由变化后

      // 2. 处理进入当前页 - 只更新活动状态，不生成新标签
      const existingTab = getTabByPath(currentPath);

      if (existingTab) {
        // 已存在的页面，更新为活动状态
        if (existingTab.id !== activeTabIdRef.current) {
          // 从任务窗口切换时，保留页面状态
          // 从菜单切换时，状态已在 navigateFromSidebar 中清空
          setTabs((prev) =>
            prev.map((tab) => ({
              ...tab,
              isActive: tab.id === existingTab.id,
              timestamp: tab.id === existingTab.id ? Date.now() : tab.timestamp,
            }))
          );
          setActiveTabId(existingTab.id);
          prevTabIdRef.current = existingTab.id;
        }
      } else {
        // 新页面，生成标签（首次访问时）
        // 注意：这里只在标签不存在时生成，确保去重
        // 创建新标签
        const meta = getDefaultPageMeta(currentPath);
        const newTab: PageTab = {
          id: generateTabId(currentPath),
          path: currentPath,
          title: meta.title,
          icon: meta.icon,
          module: meta.module,
          state: {},
          screenshot: null,
          scrollPosition: { x: 0, y: 0 },
          timestamp: Date.now(),
          isActive: true,
        };

        setTabs((prev) => {
          // 限制最大数量
          let newTabs = prev.map((tab) => ({ ...tab, isActive: false }));
          newTabs = [newTab, ...newTabs].slice(0, MAX_TABS);
          return newTabs;
        });

        setActiveTabId(newTab.id);
        prevTabIdRef.current = newTab.id;
        prevPathRef.current = currentPath;
        console.log('[PageTabContext] 添加标签:', newTab.title);

        // 3. 新页面进入后自动截图
        // 延迟执行截图，确保页面内容已渲染
        const tabIdForScreenshot = newTab.id;
        const tabPathForScreenshot = newTab.path;
        setTimeout(async () => {
          if (!isCapturingRef.current) {
            console.log('[PageTabContext] 新页面进入，准备自动截图:', tabPathForScreenshot);
            
            const contentArea = document.querySelector('.page-content-area') as HTMLDivElement;
            if (contentArea) {
              isCapturingRef.current = true;
              try {
                const screenshot = await captureQuick(contentArea);
                if (screenshot) {
                  // 更新内存中的状态
                  setTabs((prev) =>
                    prev.map((tab) =>
                      tab.id === tabIdForScreenshot ? { ...tab, screenshot } : tab
                    )
                  );
                  // 保存到 IndexedDB
                  await screenshotStorage.saveScreenshot(tabIdForScreenshot, tabPathForScreenshot, screenshot);
                  console.log('[PageTabContext] 新页面自动截图已保存:', tabPathForScreenshot);
                }
              } catch (error) {
                console.error('[PageTabContext] 新页面自动截图失败:', error);
              } finally {
                isCapturingRef.current = false;
              }
            }
          }
        }, 800); // 延迟800ms确保页面内容已渲染
        return; // 提前返回，避免下面的 prevPathRef.current = currentPath 重复执行
      }

      prevPathRef.current = currentPath;

      // 延迟重置导航来源，确保页面组件有足够时间读取导航来源
      // 页面状态恢复需要在重置之前完成
      if (navigationSourceRef.current !== 'direct') {
        setTimeout(() => {
          navigationSourceRef.current = 'direct';
          setLastNavigationSource('direct');
        }, 500); // 延迟500ms，确保页面状态已恢复
      }
    };

    handlePageChange();
  }, [location.pathname, isLoading, getTabById, getTabByPath]);

  /**
   * 添加标签
   */
  const addTab = useCallback(
    async (path: string, screenshot: string | null = null) => {
      const existingTab = getTabByPath(path);

      if (existingTab) {
        // 已存在，更新为活动状态
        setTabs((prev) =>
          prev.map((tab) => ({
            ...tab,
            isActive: tab.id === existingTab.id,
            timestamp:
              tab.id === existingTab.id ? Date.now() : tab.timestamp,
            screenshot: tab.id === existingTab.id ? screenshot : tab.screenshot,
          }))
        );
        setActiveTabId(existingTab.id);
        
        // 如果有新截图，保存到 IndexedDB
        if (screenshot) {
          await screenshotStorage.saveScreenshot(existingTab.id, existingTab.path, screenshot);
        }
        
        return;
      }

      // 创建新标签
      const meta = getDefaultPageMeta(path);
      const newTab: PageTab = {
        id: generateTabId(path),
        path,
        title: meta.title,
        icon: meta.icon,
        module: meta.module,
        state: {},
        screenshot,
        scrollPosition: { x: 0, y: 0 },
        timestamp: Date.now(),
        isActive: true,
      };

      setTabs((prev) => {
        // 限制最大数量
        let newTabs = prev.map((tab) => ({ ...tab, isActive: false }));
        newTabs = [newTab, ...newTabs].slice(0, MAX_TABS);
        return newTabs;
      });

      setActiveTabId(newTab.id);
      
      // 保存截图到 IndexedDB
      if (screenshot) {
        await screenshotStorage.saveScreenshot(newTab.id, newTab.path, screenshot);
      }
    },
    [getTabByPath]
  );

  /**
   * 从侧边栏导航（功能菜单点击）
   * 特点：重置页面状态，显示初始数据
   */
  const navigateFromSidebar = useCallback(
    (path: string) => {
      console.log('[PageTabContext] 从侧边栏导航:', path);
      
      // 设置导航来源为侧边栏
      navigationSourceRef.current = 'sidebar';
      setLastNavigationSource('sidebar');
      
      // 检查是否已存在该路径的标签
      const existingTab = getTabByPath(path);
      
      if (existingTab) {
        // 如果标签已存在，清空其状态（重置页面）
        setTabs((prev) =>
          prev.map((tab) =>
            tab.id === existingTab.id
              ? { ...tab, state: {}, scrollPosition: { x: 0, y: 0 }, timestamp: Date.now() }
              : tab
          )
        );
        console.log('[PageTabContext] 重置已有标签状态:', existingTab.title);
      }
      
      // 执行导航
      navigate(path);
    },
    [getTabByPath, navigate]
  );

  /**
   * 切换标签 - 3D翻转效果版
   * 流程：截图(翻转前) -> 触发翻转动画 -> 导航切换 -> 结束翻转
   */
  const switchTab = useCallback(
    async (tabId: string) => {
      const tab = getTabById(tabId);
      if (!tab) {
        console.warn('[PageTabContext] 切换失败，标签不存在:', tabId);
        return;
      }

      // 如果已经在目标标签，不执行切换
      if (tabId === activeTabIdRef.current) {
        return;
      }

      // 设置导航来源为任务窗口
      navigationSourceRef.current = 'tab';
      setLastNavigationSource('tab');

      // 翻转方向：统一为从左向右翻转
      const direction: 'left' | 'right' = 'right';

      const currentTabId = activeTabIdRef.current;

      // ========== 第1步：在翻转前，同步保存当前页面截图 ==========
      if (currentTabId && !isCapturingRef.current) {
        const currentTab = getTabById(currentTabId);
        if (currentTab) {
          const contentArea = document.querySelector('.page-content-area') as HTMLDivElement;
          if (contentArea) {
            isCapturingRef.current = true;
            try {
              console.log('[PageTabContext] 翻转前保存当前页面截图:', currentTab.title);
              const screenshot = await captureQuick(contentArea);
              if (screenshot) {
                // 立即更新当前标签的截图（确保翻转时显示正确）
                setTabs((prev) =>
                  prev.map((t) =>
                    t.id === currentTabId ? { ...t, screenshot } : t
                  )
                );
                // 异步保存到 IndexedDB
                screenshotStorage.saveScreenshot(currentTabId, currentTab.path, screenshot);
              }
            } catch (error) {
              console.error('[PageTabContext] 保存截图失败:', error);
            } finally {
              isCapturingRef.current = false;
            }
          }
        }
      }

      // 保存当前标签的滚动位置
      if (currentTabId) {
        const currentTab = getTabById(currentTabId);
        if (currentTab) {
          const scrollX = window.scrollX || document.documentElement.scrollLeft;
          const scrollY = window.scrollY || document.documentElement.scrollTop;
          setTabs((prev) =>
            prev.map((t) =>
              t.id === currentTab.id
                ? { ...t, scrollPosition: { x: scrollX, y: scrollY } }
                : t
            )
          );
        }
      }

      // ========== 第2步：预加载目标标签的截图 ==========
      if (!tab.screenshot) {
        try {
          const screenshot = await screenshotStorage.getScreenshot(tab.id);
          if (screenshot) {
            setTabs((prev) =>
              prev.map((t) =>
                t.id === tab.id ? { ...t, screenshot } : t
              )
            );
          }
        } catch (error) {
          console.error('[PageTabContext] 预加载截图失败:', tab.id, error);
        }
      }

      // ========== 第3步：触发3D翻转动画 ==========
      setFlipDirection(direction);
      setIsFlipping(true);

      // 延迟执行页面切换，让翻转动画先开始（创造翻转效果）
      setTimeout(() => {
        // 更新活动状态
        setTabs((prev) =>
          prev.map((t) => ({
            ...t,
            isActive: t.id === tabId,
            timestamp: t.id === tabId ? Date.now() : t.timestamp,
          }))
        );
        setActiveTabId(tabId);

        // 导航到目标页面
        if (location.pathname !== tab.path) {
          navigate(tab.path);
        }

        // 恢复滚动位置
        requestAnimationFrame(() => {
          window.scrollTo(tab.scrollPosition.x, tab.scrollPosition.y);
        });

        console.log('[PageTabContext] 切换到标签:', tab.title);
      }, 100); // 100ms后开始切换，让翻转动画可见

      // ========== 第4步：翻转动画结束 ==========
      setTimeout(() => {
        setIsFlipping(false);
        setFlipDirection(null);
      }, 450); // 总动画时长450ms
    },
    [getTabById, location.pathname, navigate, captureQuick]
  );

  /**
   * 关闭标签
   */
  const closeTab = useCallback(
    async (tabId: string) => {
      const tabToClose = getTabById(tabId);
      if (!tabToClose) return;

      // 删除 IndexedDB 中的截图
      try {
        await screenshotStorage.deleteScreenshot(tabId);
      } catch (error) {
        console.error('[PageTabContext] 删除截图失败:', tabId, error);
      }

      setTabs((prev) => {
        const newTabs = prev.filter((tab) => tab.id !== tabId);

        // 如果关闭的是当前活动标签，切换到上一个标签
        if (tabToClose.isActive && newTabs.length > 0) {
          const nextTab = newTabs[0]; // 切换到最新的标签
          nextTab.isActive = true;
          setActiveTabId(nextTab.id);
          navigate(nextTab.path);
        } else if (newTabs.length === 0) {
          setActiveTabId(null);
          // 可以导航到首页或其他默认页面
          navigate('/');
        }

        return newTabs;
      });

      console.log('[PageTabContext] 关闭标签:', tabToClose.title);
    },
    [getTabById, navigate]
  );

  /**
   * 关闭其他标签
   */
  const closeOtherTabs = useCallback(
    async (tabId: string) => {
      const keepTab = getTabById(tabId);
      if (!keepTab) return;

      // 删除其他标签的截图
      const tabsToDelete = tabsRef.current
        .filter((tab) => tab.id !== tabId)
        .map((tab) => tab.id);
      
      try {
        await screenshotStorage.deleteScreenshots(tabsToDelete);
      } catch (error) {
        console.error('[PageTabContext] 批量删除截图失败:', error);
      }

      setTabs([{ ...keepTab, isActive: true }]);
      setActiveTabId(tabId);

      if (location.pathname !== keepTab.path) {
        navigate(keepTab.path);
      }

      console.log('[PageTabContext] 关闭其他标签');
    },
    [getTabById, location.pathname, navigate]
  );

  /**
   * 关闭所有标签
   */
  const closeAllTabs = useCallback(async () => {
    // 删除所有截图
    const allTabIds = tabsRef.current.map((tab) => tab.id);
    
    try {
      await screenshotStorage.deleteScreenshots(allTabIds);
    } catch (error) {
      console.error('[PageTabContext] 删除所有截图失败:', error);
    }

    setTabs([]);
    setActiveTabId(null);
    navigate('/');
    console.log('[PageTabContext] 关闭所有标签');
  }, [navigate]);

  /**
   * 刷新标签（重新截图）
   */
  const refreshTab = useCallback(
    async (tabId: string) => {
      // 删除旧截图
      try {
        await screenshotStorage.deleteScreenshot(tabId);
      } catch (error) {
        console.error('[PageTabContext] 删除旧截图失败:', tabId, error);
      }

      // 刷新操作：清除截图，下次访问时重新生成
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id === tabId ? { ...tab, screenshot: null, timestamp: Date.now() } : tab
        )
      );
      console.log('[PageTabContext] 刷新标签:', tabId);
    },
    []
  );

  /**
   * 更新标签状态
   */
  const updateTabState = useCallback((tabId: string, state: PageState) => {
    setTabs((prev) =>
      prev.map((tab) => (tab.id === tabId ? { ...tab, state } : tab))
    );
  }, []);

  /**
   * 更新滚动位置
   */
  const updateScrollPosition = useCallback(
    (tabId: string, position: ScrollPosition) => {
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id === tabId ? { ...tab, scrollPosition: position } : tab
        )
      );
    },
    []
  );

  const value: PageTabContextType = {
    tabs,
    activeTabId,
    isLoading,
    isFlipping,
    flipDirection,
    lastNavigationSource,
    addTab,
    switchTab,
    closeTab,
    closeOtherTabs,
    closeAllTabs,
    refreshTab,
    updateTabState,
    updateTabScreenshot,
    updateScrollPosition,
    getTabById,
    getTabByPath,
    navigateFromSidebar,
  };

  return (
    <PageTabContext.Provider value={value}>
      {children}
    </PageTabContext.Provider>
  );
};

/**
 * 使用页面标签 Context 的 Hook
 */
export const usePageTab = (): PageTabContextType => {
  const context = useContext(PageTabContext);
  if (!context) {
    throw new Error('usePageTab must be used within a PageTabProvider');
  }
  return context;
};

export default PageTabContext;
