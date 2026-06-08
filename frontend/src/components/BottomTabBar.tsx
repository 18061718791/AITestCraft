import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { usePageTab } from '../contexts/PageTabContext';
import { useLayoutMode } from '../contexts/LayoutModeContext';
import { useShortcut } from '../contexts/ShortcutContext';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import PageTabItem from './PageTabItem';
import '../styles/cyberpunk.css';

interface BottomTabBarProps {
  pinned?: boolean;
  onPinChange?: (pinned: boolean) => void;
  onExpandedChange?: (expanded: boolean) => void;
}

/**
 * 底部隐藏式标签栏组件 - 极客模式风格（根据UI设计图重新实现）
 * 双层梯形底座设计：底层毛玻璃大梯形 + 上层渐变小梯形
 * 悬浮任务窗口：标题在梯形中间，窗口1/3在梯形上
 */
const BottomTabBar: React.FC<BottomTabBarProps> = ({
  pinned = false,
  onPinChange: _onPinChange,
  onExpandedChange,
}) => {
  const { isDark, themeConfig } = useTheme();
  const { layoutMode } = useLayoutMode();
  const { tabs, activeTabId, switchTab, closeTab, closeOtherTabs, closeAllTabs, refreshTab, getTabById } = usePageTab();
  const { shortcuts, isEnabled, setActivePanel, canActivatePanel } = useShortcut();
  const tabBarRef = useRef<HTMLDivElement>(null);

  const [expanded, setExpanded] = useState(false);
  const [keyboardExpanded, setKeyboardExpanded] = useState(false);
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const collapseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isHoveringRef = useRef(false);
  const isKeyboardModeRef = useRef(false);

  const primaryColor = (themeConfig.token?.colorPrimary as string) || '#00d4ff';

  // 如果没有标签，不显示（使用样式隐藏而非提前返回，确保Hook调用一致性）
  const isVisible = tabs.length > 0;

  // 检查当前焦点是否在输入框中
  const isInputFocused = useCallback((): boolean => {
    const activeElement = document.activeElement;
    if (!activeElement) return false;
    const tagName = activeElement.tagName.toLowerCase();
    const isInput = tagName === 'input' || tagName === 'textarea' || activeElement.getAttribute('contenteditable') === 'true';
    return isInput;
  }, []);

  // 初始化选中索引为当前活动标签的索引
  useEffect(() => {
    if (tabs.length > 0 && activeTabId) {
      const activeIndex = tabs.findIndex((tab) => tab.id === activeTabId);
      if (activeIndex !== -1) {
        setSelectedTabIndex(activeIndex);
      }
    }
  }, [tabs, activeTabId]);

  // 监听快捷键（从配置中读取）
  useKeyboardShortcuts({
    enabled: layoutMode === 'modern' && isVisible && isEnabled,
    shortcuts: {
      toggleBottomPanel: shortcuts.toggleBottomPanel,
    },
    handlers: {
      toggleBottomPanel: () => {
        if (isInputFocused()) return;

        if (!isCtrlPressed) {
          // 检查互斥锁：如果其他面板已被激活，则不展开
          if (!canActivatePanel('bottom')) {
            return;
          }
          // 首次按下快捷键，展开任务窗口
          setIsCtrlPressed(true);
          setKeyboardExpanded(true);
          isKeyboardModeRef.current = true;
          onExpandedChange?.(true);
          setActivePanel('bottom'); // 设置互斥锁

          // 设置选中索引为当前活动标签
          const activeIndex = tabs.findIndex((tab) => tab.id === activeTabId);
          if (activeIndex !== -1) {
            setSelectedTabIndex(activeIndex);
          }
          // 设置焦点到任务窗口
          setTimeout(() => {
            tabBarRef.current?.focus();
          }, 100);
        } else {
          // 再次按下快捷键，收起任务窗口（切换隐藏）
          setIsCtrlPressed(false);
          setKeyboardExpanded(false);
          isKeyboardModeRef.current = false;
          setActivePanel(null); // 释放互斥锁
          onExpandedChange?.(false);

          // 切换到选中的标签
          const selectedTab = tabs[selectedTabIndex];
          if (selectedTab && selectedTab.id !== activeTabId) {
            switchTab(selectedTab.id);
          }
        }
      },
    },
    preventDefault: true,
    stopPropagation: true,
  });

  // 监听方向键切换标签（仅在键盘展开状态下）
  useEffect(() => {
    if (!isCtrlPressed || !keyboardExpanded) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isInputFocused()) return;

      // Ctrl + ← 向前切换（索引-1）
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        event.stopPropagation();
        setSelectedTabIndex((prev) => {
          if (prev <= 0) return tabs.length - 1;
          return prev - 1;
        });
      }
      // Ctrl + → 向后切换（索引+1）
      else if (event.key === 'ArrowRight') {
        event.preventDefault();
        event.stopPropagation();
        setSelectedTabIndex((prev) => {
          if (prev >= tabs.length - 1) return 0;
          return prev + 1;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCtrlPressed, keyboardExpanded, tabs.length, isInputFocused]);

  // 监听 Ctrl 键释放
  useEffect(() => {
    if (!isCtrlPressed) return;

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Control') {
        // Ctrl 键释放，切换到选中的标签
        setIsCtrlPressed(false);
        setKeyboardExpanded(false);
        isKeyboardModeRef.current = false;
        setActivePanel(null); // 释放互斥锁
        onExpandedChange?.(false);
        
        // 切换到选中的标签
        const selectedTab = tabs[selectedTabIndex];
        if (selectedTab && selectedTab.id !== activeTabId) {
          switchTab(selectedTab.id);
        }
      }
    };

    const handleBlur = () => {
      // 窗口失去焦点时也重置状态
      setIsCtrlPressed(false);
      setKeyboardExpanded(false);
      isKeyboardModeRef.current = false;
      onExpandedChange?.(false);
    };

    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isCtrlPressed, tabs, selectedTabIndex, activeTabId, switchTab, onExpandedChange]);

  // 实际展开状态：鼠标悬停展开或键盘快捷键展开
  const isExpanded = expanded || keyboardExpanded;

  // 监听窗口大小变化，计算缩放比例
  useEffect(() => {
    const calculateScale = () => {
      // 以 1920px 宽度为基准，计算缩放比例
      const baseWidth = 1920;
      const currentWidth = window.innerWidth;
      const newScale = Math.min(1, Math.max(0.7, currentWidth / baseWidth));
      setScale(newScale);
    };

    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, []);

  // 清除收起定时器
  const clearCollapseTimer = useCallback(() => {
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
  }, []);

  // 启动收起定时器
  const startCollapseTimer = useCallback(() => {
    clearCollapseTimer();
    collapseTimerRef.current = setTimeout(() => {
      if (!isHoveringRef.current && !pinned) {
        setExpanded(false);
        onExpandedChange?.(false);
      }
    }, 200);
  }, [pinned, onExpandedChange, clearCollapseTimer]);

  // 处理鼠标进入整个容器
  const handleMouseEnter = useCallback(() => {
    // 键盘模式下不响应鼠标事件
    if (isKeyboardModeRef.current) return;
    
    isHoveringRef.current = true;
    clearCollapseTimer();
    if (!expanded) {
      setExpanded(true);
      onExpandedChange?.(true);
    }
  }, [expanded, clearCollapseTimer, onExpandedChange]);

  // 处理鼠标离开整个容器
  const handleMouseLeave = useCallback(() => {
    // 键盘模式下不响应鼠标事件
    if (isKeyboardModeRef.current) return;
    
    isHoveringRef.current = false;
    if (!pinned) {
      startCollapseTimer();
    }
  }, [pinned, startCollapseTimer]);

  // 清理定时器
  useEffect(() => {
    return () => {
      clearCollapseTimer();
    };
  }, [clearCollapseTimer]);

  // 处理标签切换
  const handleSwitchTab = useCallback(
    async (tabId: string) => {
      if (tabId === activeTabId) return;
      await switchTab(tabId);
    },
    [activeTabId, switchTab]
  );

  // 处理关闭标签
  const handleCloseTab = useCallback(
    async (tabId: string) => {
      const tab = getTabById(tabId);
      if (!tab) return;
      closeTab(tabId);
    },
    [getTabById, closeTab]
  );

  // 计算底部位置，靠近浏览器底部
  const bottomOffset = 2;

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        display: isVisible ? 'flex' : 'none',
        position: 'fixed',
        bottom: bottomOffset,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1001,
        flexDirection: 'column',
        alignItems: 'center',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: 'auto',
        background: 'transparent',
      }}
    >
      {/* 梯形提示 - 收起时显示 */}
      {!isExpanded && (
        <div
          style={{
            width: '50vw',
            maxWidth: 1200,
            height: 24,
            background: isDark
              ? `linear-gradient(180deg, ${primaryColor}50, ${primaryColor}20)`
              : `linear-gradient(180deg, ${primaryColor}40, ${primaryColor}15)`,
            borderRadius: '12px 12px 4px 4px',
            transform: 'perspective(60px) rotateX(8deg)',
            transformOrigin: 'center bottom',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: isDark
              ? `0 -4px 25px ${primaryColor}50`
              : `0 -4px 20px ${primaryColor}40`,
            animation: 'pulseHint 2s ease-in-out infinite',
            borderTop: `2px solid ${primaryColor}`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* 流光效果 */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(90deg, transparent, ${primaryColor}40, transparent)`,
              animation: 'dataFlow 3s linear infinite',
            }}
          />
          {/* 文字 */}
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: isDark ? '#fff' : '#1a1a2e',
              letterSpacing: 2,
              textShadow: isDark ? `0 0 10px ${primaryColor}` : 'none',
              position: 'relative',
              zIndex: 1,
            }}
          >
            任务窗口({tabs.length})
          </span>
        </div>
      )}

      {/* 展开状态：双层梯形底座 + 悬浮任务窗口 */}
      {isExpanded && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
            transform: `scale(${scale})`,
            transformOrigin: 'center bottom',
          }}
          
        >
          {/* ==================== 双层梯形底座（高度109px，4/3倍） ==================== */}
          <div
            style={{
              position: 'relative',
              width: 1000, // 固定宽度，与viewBox一致，完全依赖scale缩放
              height: 109, // 82px * 4/3 ≈ 109px
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              order: 2, // 梯形在下方
              marginBottom: -5, // 负margin让梯形向下移动，靠近底部
            }}
          >
            {/* SVG圆角梯形底座 */}
            <svg
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
              }}
              viewBox="0 0 1000 125"
              preserveAspectRatio="none"
            >
              <defs>
                {/* 外层梯形边框渐变 - 亮色：浅蓝色发光，暗色：深蓝色发光 */}
                <linearGradient id="outerBorderGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                  {isDark ? (
                    <>
                      <stop offset="0%" stopColor="#0D3B7A" stopOpacity="0.8" />
                      <stop offset="50%" stopColor="#1565C0" stopOpacity="0.7" />
                      <stop offset="100%" stopColor="#42A5F5" stopOpacity="0.85" />
                    </>
                  ) : (
                    <>
                      <stop offset="0%" stopColor="#90CAF9" stopOpacity="0.6" />
                      <stop offset="50%" stopColor="#BBDEFB" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#E3F2FD" stopOpacity="0.5" />
                    </>
                  )}
                </linearGradient>

                {/* 内层梯形渐变 - 暗色：深蓝→亮蓝→青白（由下向上，类似亮色的层次感），亮色：浅蓝→蓝白混合→纯白 */}
                <linearGradient id="innerGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                  {isDark ? (
                    <>
                      <stop offset="0%" stopColor="#0f172a" stopOpacity="0.9" />
                      <stop offset="25%" stopColor="#0f172a" stopOpacity="0.85" />
                      <stop offset="50%" stopColor="#0D3B7A" stopOpacity="0.88" />
                      <stop offset="75%" stopColor="#1565C0" stopOpacity="0.85" />
                      <stop offset="100%" stopColor="#42A5F5" stopOpacity="0.92" />
                    </>
                  ) : (
                    <>
                      <stop offset="0%" stopColor="#64B5F6" stopOpacity="0.9" />
                      <stop offset="30%" stopColor="#90CAF9" stopOpacity="0.7" />
                      <stop offset="50%" stopColor="#BBDEFB" stopOpacity="0.5" />
                      <stop offset="70%" stopColor="#E3F2FD" stopOpacity="0.7" />
                      <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.95" />
                    </>
                  )}
                </linearGradient>

                {/* 磨砂玻璃滤镜 */}
                <filter id="frostedGlass" x="-10%" y="-10%" width="120%" height="120%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
                  <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.4 0" result="coloredBlur" />
                  <feComposite in="SourceGraphic" in2="coloredBlur" operator="over" />
                </filter>
              </defs>

              {/* 底层大梯形 - 毛玻璃效果（高度4/3倍） */}
              {/* 填充层 - 磨砂玻璃效果 */}
              <path
                d="M 25 35
                   Q 45 0, 85 0
                   L 915 0
                   Q 955 0, 975 35
                   L 1000 108
                   Q 1005 118, 985 118
                   L 15 118
                   Q -5 118, 0 108
                   Z"
                fill='rgba(255, 255, 255, 0.25)'
                style={{
                  filter: 'blur(6px)',
                }}
              />
              {/* 边框层 - 清晰边框 */}
              <path
                d="M 25 35
                   Q 45 0, 85 0
                   L 915 0
                   Q 955 0, 975 35
                   L 1000 108
                   Q 1005 118, 985 118
                   L 15 118
                   Q -5 118, 0 108
                   Z"
                fill="none"
                stroke="url(#outerBorderGradient)"
                strokeWidth="2"
              />

              {/* 上层小梯形 - 蓝白渐变（高度4/3倍） */}
              <path
                d="M 50 40
                   Q 62 16, 95 16
                   L 905 16
                   Q 938 16, 950 40
                   L 973 92
                   Q 978 101, 965 101
                   L 35 101
                   Q 22 101, 27 92
                   Z"
                fill="url(#innerGradient)"
                style={{
                  filter: `drop-shadow(0 2px 8px rgba(100, 181, 246, 0.3))`,
                }}
              />
            </svg>

            {/* 底部装饰线 */}
            <div
              style={{
                position: 'absolute',
                bottom: 10,
                left: '30%',
                right: '30%',
                height: 1,
                background: `linear-gradient(90deg, transparent, rgba(144, 202, 249, 0.6), transparent)`,
              }}
            />
          </div>

          {/* ==================== 悬浮任务窗口 ==================== */}
          <div
            ref={tabBarRef}
            tabIndex={-1}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{
              position: 'relative',
              order: 1, // 任务窗口在上方
              zIndex: 10,
              width: 'auto',
              maxWidth: 1000, // 与梯形最大宽度保持一致
              padding: '40px 16px 20px',
              marginBottom: 0,
              transform: 'translateY(95px)', // 直接向下移动95px
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'flex-end',
              justifyContent: 'center',
              gap: 12,
              outline: 'none',
              overflowX: 'auto',
              overflowY: 'hidden',
              scrollbarWidth: 'thin',
              scrollbarColor: isDark ? 'rgba(255,255,255,0.2) transparent' : 'rgba(0,0,0,0.2) transparent',
            }}
          >
            <style>{`
              ::-webkit-scrollbar {
                height: 4px;
              }
              ::-webkit-scrollbar-track {
                background: transparent;
              }
              ::-webkit-scrollbar-thumb {
                background: ${isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'};
                border-radius: 2px;
              }
              ::-webkit-scrollbar-thumb:hover {
                background: ${isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'};
              }
            `}</style>

            {tabs.map((tab, index) => {
              const isCurrentTab = tab.id === activeTabId;
              return (
                <div
                  key={tab.id}
                  style={{
                    position: 'relative',
                    transition: 'all 0.2s ease',
                    transform: isCtrlPressed && index === selectedTabIndex ? 'scale(1.05)' : 'scale(1)',
                    zIndex: isCtrlPressed && index === selectedTabIndex ? 10 : 1,
                  }}
                >
                  {/* 当前任务窗口高亮包裹框 */}
                  {isCurrentTab && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: -10,
                        borderRadius: 20,
                        border: `2px solid ${primaryColor}`,
                        background: `${primaryColor}15`,
                        boxShadow: `0 0 20px ${primaryColor}40, inset 0 0 20px ${primaryColor}20`,
                        pointerEvents: 'none',
                        zIndex: -1,
                      }}
                    />
                  )}
                  
                  <PageTabItem
                    tab={tab}
                    isActive={isCurrentTab}
                    isKeyboardSelected={isCtrlPressed && index === selectedTabIndex}
                    onClick={() => handleSwitchTab(tab.id)}
                    onClose={() => handleCloseTab(tab.id)}
                    onCloseOthers={() => closeOtherTabs(tab.id)}
                    onCloseAll={closeAllTabs}
                    onRefresh={() => refreshTab(tab.id)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 动画样式 */}
      <style>{`
        @keyframes pulseHint {
          0%, 100% {
            opacity: 0.85;
            filter: brightness(1);
          }
          50% {
            opacity: 1;
            filter: brightness(1.2);
          }
        }
        
        @keyframes dataFlow {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        
        @keyframes pulseSelected {
          0%, 100% {
            box-shadow: 0 0 15px ${primaryColor}60, inset 0 0 15px ${primaryColor}20;
          }
          50% {
            box-shadow: 0 0 25px ${primaryColor}80, inset 0 0 25px ${primaryColor}30;
          }
        }
      `}</style>
    </div>
  );
};

export default BottomTabBar;
