import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Modal } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { usePageTab } from '../contexts/PageTabContext';
import { usePageScreenshot } from '../hooks/usePageScreenshot';
import PageTabItem from './PageTabItem';

/**
 * 页面标签栏组件
 * 
 * 核心逻辑：
 * 1. 离开页面时：保存当前页面的截图和数据（覆盖原有标签）
 * 2. 进入新页面时：不自动生成新标签
 * 3. 只有手动切换标签或首次访问时才生成标签
 * 4. 严格去重：同一页面只保留一个标签
 */
const PageTabBar: React.FC = () => {
  const location = useLocation();
  const {
    tabs,
    activeTabId,
    addTab,
    switchTab,
    closeTab,
    closeOtherTabs,
    closeAllTabs,
    refreshTab,
    updateTabScreenshot,

    getTabByPath,
    getTabById,
  } = usePageTab();

  const { captureQuick } = usePageScreenshot();
  const isCapturingRef = useRef(false);
  const prevPathRef = useRef<string>('');
  const prevTabIdRef = useRef<string | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);

  // 页面变化处理：离开时保存截图和数据
  useEffect(() => {
    const currentPath = location.pathname;

    // 跳过首页
    if (currentPath === '/') {
      prevPathRef.current = currentPath;
      return;
    }

    const handlePageChange = async () => {
      const prevPath = prevPathRef.current;
      const prevTabId = prevTabIdRef.current;

      // 1. 先处理离开上一页的截图和数据保存
      if (prevPath && prevPath !== '/' && prevPath !== currentPath && prevTabId) {
        const prevTab = getTabById(prevTabId);
        if (prevTab && !isCapturingRef.current) {
          console.log('[PageTabBar] 离开页面，准备保存截图:', prevPath);
          
          // 延迟一点确保页面状态已更新
          await new Promise(resolve => setTimeout(resolve, 150));

          const contentArea = document.querySelector('.page-content-area') as HTMLDivElement;
          if (contentArea) {
            isCapturingRef.current = true;
            try {
              const screenshot = await captureQuick(contentArea);
              if (screenshot) {
                // 更新截图和时间戳
                updateTabScreenshot(prevTabId, screenshot);
                console.log('[PageTabBar] 离开页面截图已保存:', prevPath);
              }
            } catch (error) {
              console.error('[PageTabBar] 截图失败:', error);
            } finally {
              isCapturingRef.current = false;
            }
          }
        }
      }

      // 2. 处理进入当前页 - 只更新活动状态，不生成新标签
      const existingTab = getTabByPath(currentPath);
      
      if (existingTab) {
        // 已存在的页面，更新为活动状态
        if (existingTab.id !== activeTabId) {
          // 使用 switchTab 更新活动状态，但不导航（已经在目标页面了）
          await switchTab(existingTab.id);
          prevTabIdRef.current = existingTab.id;
          console.log('[PageTabBar] 切换到已有标签:', existingTab.title);
        }
      } else {
        // 新页面，生成标签（首次访问时）
        // 注意：这里只在标签不存在时生成，确保去重
        console.log('[PageTabBar] 新页面，生成标签:', currentPath);
        await addTab(currentPath, null);
        // 获取新生成的标签ID
        const newTab = getTabByPath(currentPath);
        if (newTab) {
          prevTabIdRef.current = newTab.id;
        }
      }

      prevPathRef.current = currentPath;
    };

    handlePageChange();
  }, [location.pathname]); // 只依赖路径变化

  // 处理标签切换（点击标签栏）
  const handleSwitchTab = useCallback(
    async (tabId: string) => {
      if (isSwitching || tabId === activeTabId) return;

      setIsSwitching(true);
      const tab = getTabById(tabId);
      if (!tab) {
        setIsSwitching(false);
        return;
      }

      try {
        // 先保存当前页面的截图
        const currentTab = activeTabId ? getTabById(activeTabId) : null;
        if (currentTab && !isCapturingRef.current) {
          const contentArea = document.querySelector('.page-content-area') as HTMLDivElement;
          if (contentArea) {
            isCapturingRef.current = true;
            try {
              const screenshot = await captureQuick(contentArea);
              if (screenshot) {
                updateTabScreenshot(currentTab.id, screenshot);
              }
            } catch (error) {
              console.error('[PageTabBar] 切换前截图失败:', error);
            } finally {
              isCapturingRef.current = false;
            }
          }
        }

        // 执行切换
        await switchTab(tabId);
        prevTabIdRef.current = tabId;
        console.log('[PageTabBar] 切换到标签:', tab.title);
      } catch (error) {
        console.error('[PageTabBar] 切换标签失败:', error);
      } finally {
        setTimeout(() => setIsSwitching(false), 300);
      }
    },
    [activeTabId, getTabById, switchTab, captureQuick, updateTabScreenshot, isSwitching]
  );

  // 处理关闭标签
  const handleCloseTab = useCallback(
    async (tabId: string) => {
      const tab = getTabById(tabId);
      if (!tab) return;

      // 如果关闭的是当前活动标签，先截图保存
      if (tab.isActive && !tab.screenshot && !isCapturingRef.current) {
        const contentArea = document.querySelector('.page-content-area') as HTMLDivElement;
        if (contentArea) {
          isCapturingRef.current = true;
          try {
            const screenshot = await captureQuick(contentArea);
            if (screenshot) {
              updateTabScreenshot(tabId, screenshot);
            }
          } catch (error) {
            console.error('[PageTabBar] 关闭前截图失败:', error);
          } finally {
            isCapturingRef.current = false;
          }
        }
      }

      closeTab(tabId);
    },
    [getTabById, closeTab, captureQuick, updateTabScreenshot]
  );

  // 处理关闭其他
  const handleCloseOthers = useCallback(
    (tabId: string) => {
      Modal.confirm({
        title: '关闭其他标签',
        icon: <ExclamationCircleOutlined />,
        content: '确定要关闭除当前标签外的所有标签吗？',
        onOk: () => closeOtherTabs(tabId),
      });
    },
    [closeOtherTabs]
  );

  // 处理关闭全部
  const handleCloseAll = useCallback(() => {
    Modal.confirm({
      title: '关闭所有标签',
      icon: <ExclamationCircleOutlined />,
      content: '确定要关闭所有标签吗？',
      onOk: closeAllTabs,
    });
  }, [closeAllTabs]);

  // 如果没有标签，不显示
  if (tabs.length === 0) {
    return null;
  }

  return (
    <div
      className="page-tab-bar"
      style={{
        height: '100%',
        padding: '10px 20px',
        backgroundColor: 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center', // 标签居中展示
        overflowX: 'auto',
        overflowY: 'hidden',
        gap: 20,
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(255,255,255,0.2) transparent',
      }}
    >
      {/* 自定义滚动条样式 */}
      <style>{`
        .page-tab-bar::-webkit-scrollbar {
          height: 4px;
        }
        .page-tab-bar::-webkit-scrollbar-track {
          background: transparent;
        }
        .page-tab-bar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
        }
        .page-tab-bar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>

      {tabs.map((tab) => (
        <PageTabItem
          key={tab.id}
          tab={tab}
          isActive={tab.id === activeTabId}
          onClick={() => handleSwitchTab(tab.id)}
          onClose={() => handleCloseTab(tab.id)}
          onCloseOthers={() => handleCloseOthers(tab.id)}
          onCloseAll={handleCloseAll}
          onRefresh={() => refreshTab(tab.id)}
        />
      ))}
    </div>
  );
};

export default PageTabBar;
