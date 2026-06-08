import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { Typography, Button, Tooltip } from 'antd';
import {
  HomeOutlined,
  UnorderedListOutlined,
  BugOutlined,
  AppstoreOutlined,
  SettingOutlined,
  PushpinOutlined,
  PushpinFilled,
  MoonOutlined,
  SunOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useLayoutMode } from '../contexts/LayoutModeContext';
import { useShortcut } from '../contexts/ShortcutContext';
import { LayoutModeIconSwitch } from './LayoutModeIconSwitch';
import { SIDEBAR_CONFIG } from '../layouts/FeatureLayout';
import { SidebarHint } from './SidebarHint';
import { useSingleShortcut } from '../hooks/useKeyboardShortcuts';
import '../styles/cyberpunk.css';

const { Title } = Typography;

interface MenuItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  path: string;
}

interface RightCollapseBarProps {
  pinned?: boolean;
  onPinChange?: (pinned: boolean) => void;
  onExpandedChange?: (expanded: boolean) => void;
}

const RightCollapseBar: React.FC<RightCollapseBarProps> = ({
  pinned = false,
  onPinChange,
  onExpandedChange
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, themeConfig, toggleTheme } = useTheme();
  const { layoutMode } = useLayoutMode();
  const { shortcuts, isEnabled, setActivePanel, canActivatePanel } = useShortcut();
  const barRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [expanded, setExpanded] = useState(false);
  const [isHoveringBar, setIsHoveringBar] = useState(false);
  const collapseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 快捷键相关状态
  const [keyboardExpanded, setKeyboardExpanded] = useState(false);
  const [selectedMenuIndex, setSelectedMenuIndex] = useState<number>(-1);
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);

  const primaryColor = (themeConfig.token?.colorPrimary as string) || '#00d4ff';

  // 极客模式判断
  const isGeekMode = layoutMode === 'modern';

  // 存储上次选中的菜单索引
  const lastSelectedIndexRef = useRef<number>(-1);

  const globalMenus: MenuItem[] = useMemo(() => [
    { key: 'home', label: '首页', icon: <HomeOutlined />, path: '/' },
    { key: 'test', label: '用例管理', icon: <UnorderedListOutlined />, path: '/test-cases' },
    { key: 'defect', label: '缺陷管理', icon: <BugOutlined />, path: '/defects' },
    { key: 'app', label: '应用管理', icon: <AppstoreOutlined />, path: '/app-management/pending' },
    { key: 'admin', label: '系统管理', icon: <SettingOutlined />, path: '/admin/monitoring' },
  ], []);

  // 检查是否是输入框元素
  const isInputElement = useCallback((element: Element | null): boolean => {
    if (!element) return false;
    const tagName = element.tagName.toLowerCase();
    return tagName === 'input' || tagName === 'textarea' || element.getAttribute('contenteditable') === 'true';
  }, []);

  // 监听快捷键展开/隐藏右侧栏（从配置中读取）
  useSingleShortcut({
    enabled: isGeekMode && isEnabled,
    shortcut: shortcuts.toggleRightPanel,
    handler: () => {
      if (!isInputElement(document.activeElement)) {
        if (!keyboardExpanded) {
          // 检查互斥锁：如果其他面板已被激活，则不展开
          if (!canActivatePanel('right')) {
            return;
          }
          // 展开右侧栏
          setKeyboardExpanded(true);
          setExpanded(true);
          onExpandedChange?.(true);
          setIsCtrlPressed(true);
          setActivePanel('right'); // 设置互斥锁
          // 如果有上次选中的菜单项，恢复它；否则选中当前页面所在的菜单项
          if (lastSelectedIndexRef.current >= 0 && lastSelectedIndexRef.current < globalMenus.length) {
            setSelectedMenuIndex(lastSelectedIndexRef.current);
          } else {
            const currentIndex = globalMenus.findIndex(menu => isActive(menu.path, menu.key));
            if (currentIndex !== -1) {
              setSelectedMenuIndex(currentIndex);
            } else {
              setSelectedMenuIndex(0);
            }
          }
          // 设置焦点到菜单区域
          setTimeout(() => {
            menuRef.current?.focus();
          }, 100);
        } else {
          // 再次按下快捷键，隐藏右侧栏
          setKeyboardExpanded(false);
          setIsCtrlPressed(false);
          setActivePanel(null); // 释放互斥锁
          if (!pinned && !isHoveringBar) {
            setExpanded(false);
            onExpandedChange?.(false);
          }
          setSelectedMenuIndex(-1);
        }
      }
    },
    preventDefault: true,
  });

  // 监听键盘事件（Ctrl 状态、方向键选择）
  useEffect(() => {
    if (!isGeekMode) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // 输入框焦点时不触发
      if (isInputElement(document.activeElement)) return;

      // 监听 Ctrl 键按下
      if (event.key === 'Control') {
        setIsCtrlPressed(true);
        return;
      }

      // 仅在键盘展开状态下处理方向键
      if (!keyboardExpanded) return;

      // Ctrl 按住时，↑↓方向键切换菜单项选择
      if (isCtrlPressed) {
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          setSelectedMenuIndex((prev) => {
            const newIndex = prev <= 0 ? globalMenus.length - 1 : prev - 1;
            lastSelectedIndexRef.current = newIndex;
            return newIndex;
          });
        } else if (event.key === 'ArrowDown') {
          event.preventDefault();
          setSelectedMenuIndex((prev) => {
            const newIndex = prev >= globalMenus.length - 1 ? 0 : prev + 1;
            lastSelectedIndexRef.current = newIndex;
            return newIndex;
          });
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      // 输入框焦点时不触发
      if (isInputElement(document.activeElement)) return;

      // Ctrl 键松开
      if (event.key === 'Control') {
        setIsCtrlPressed(false);

        // 松开Ctrl后，如果选中了菜单项则导航到对应页面
        if (keyboardExpanded && selectedMenuIndex >= 0 && selectedMenuIndex < globalMenus.length) {
          const selectedMenu = globalMenus[selectedMenuIndex];
          navigate(selectedMenu.path);
        }

        // 收起侧边栏
        setKeyboardExpanded(false);
        setActivePanel(null); // 释放互斥锁
        if (!pinned && !isHoveringBar) {
          setExpanded(false);
          onExpandedChange?.(false);
        }
        // 注意：不重置 lastSelectedIndexRef，以便下次唤起时恢复
        setSelectedMenuIndex(-1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isGeekMode, keyboardExpanded, isCtrlPressed, selectedMenuIndex, globalMenus, navigate, pinned, isHoveringBar, onExpandedChange, isInputElement]);

  const isActive = (path: string, key: string): boolean => {
    const currentPath = location.pathname;
    if (path === '/') {
      return currentPath === '/';
    }
    // 用例管理模块的特殊处理：包含多个不同前缀的路径
    if (key === 'test') {
      return currentPath.startsWith('/test-cases') ||
             currentPath.startsWith('/assistant') ||
             currentPath.startsWith('/prompts') ||
             currentPath.startsWith('/system');
    }
    // 系统管理模块的特殊处理：所有 /admin/* 路径都应该激活系统管理菜单
    if (key === 'admin') {
      return currentPath.startsWith('/admin');
    }
    return currentPath.startsWith(path);
  };

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
      if (!isHoveringBar && !pinned) {
        setExpanded(false);
        onExpandedChange?.(false);
      }
    }, 200);
  }, [isHoveringBar, pinned, onExpandedChange, clearCollapseTimer]);

  // 处理鼠标进入
  const handleMouseEnter = useCallback(() => {
    setIsHoveringBar(true);
    clearCollapseTimer();
    if (!pinned) {
      setExpanded(true);
      onExpandedChange?.(true);
    }
  }, [pinned, onExpandedChange, clearCollapseTimer]);

  // 处理鼠标离开
  const handleMouseLeave = useCallback(() => {
    setIsHoveringBar(false);
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

  // 如果固定状态改变，更新展开状态
  useEffect(() => {
    if (pinned) {
      setExpanded(true);
      onExpandedChange?.(true);
    } else {
      if (!isHoveringBar) {
        setExpanded(false);
        onExpandedChange?.(false);
      }
    }
  }, [pinned, isHoveringBar, onExpandedChange]);

  const isVisible = expanded || pinned || keyboardExpanded;

  // 六边形裁剪路径
  const hexagonClipPath = `polygon(16px 0%, calc(100% - 16px) 0%, 100% 50%, calc(100% - 16px) 100%, 16px 100%, 0% 50%)`;
  const hexagonBorderClipPath = `polygon(16px 0%, calc(100% - 16px) 0%, 100% 50%, calc(100% - 16px) 100%, 16px 100%, 0% 50%)`;
  const hexagonInnerClipPath = `polygon(14px 0%, calc(100% - 14px) 0%, 100% 50%, calc(100% - 14px) 100%, 14px 100%, 0% 50%)`;

  return (
    <div
      ref={barRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        width: '100%',
        height: '100vh',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingLeft: SIDEBAR_CONFIG.right.gap,
      }}
    >
      {/* 菱形提示 - 收起时显示 */}
      <SidebarHint
        position="right"
        title="快速导航"
        isVisible={!isVisible}
      />

      {/* 六边形侧边栏 */}
      <div
        style={{
          // 当展开但未固定时，使用 fixed 定位覆盖在中间内容之上
          // 当固定时，使用 absolute 定位随容器扩展
          position: expanded && !pinned ? 'fixed' : 'absolute',
          right: expanded && !pinned ? SIDEBAR_CONFIG.hint.width + 10 : undefined,
          left: expanded && !pinned ? undefined : SIDEBAR_CONFIG.right.gap,
          top: '50%',
          transform: `translateY(-50%) ${isVisible ? 'translateX(0)' : 'translateX(30px)'}`,
          width: SIDEBAR_CONFIG.right.width,
          maxHeight: '80vh',
          zIndex: 1003, // 提高 z-index 确保覆盖在中间内容之上
          overflow: 'visible',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          opacity: isVisible ? 1 : 0,
          pointerEvents: isVisible ? 'auto' : 'none',
          // 六边形裁剪
          clipPath: hexagonClipPath,
        }}
      >
        {/* 主背景层 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: isDark 
              ? 'linear-gradient(135deg, rgba(10, 20, 40, 0.98) 0%, rgba(15, 30, 60, 0.95) 100%)' 
              : 'linear-gradient(135deg, rgba(245, 247, 250, 0.98) 0%, rgba(235, 240, 250, 0.95) 100%)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            zIndex: -1,
          }}
        />

        {/* 荧光流转边框层 - 流光1（左上角） */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            padding: 3,
            zIndex: -1,
            clipPath: hexagonBorderClipPath,
            background: `conic-gradient(from 315deg, ${primaryColor}, ${primaryColor}40 5%, ${primaryColor}00 15%, ${primaryColor}00 85%, ${primaryColor}40 95%, ${primaryColor})`,
            animation: 'neonFlowRotate 3s linear infinite',
          }}
        />

        {/* 荧光流转边框层 - 流光2（右下角） */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            padding: 3,
            zIndex: -1,
            clipPath: hexagonBorderClipPath,
            background: `conic-gradient(from 135deg, ${primaryColor}, ${primaryColor}40 5%, ${primaryColor}00 15%, ${primaryColor}00 85%, ${primaryColor}40 95%, ${primaryColor})`,
            animation: 'neonFlowRotate 3s linear infinite',
          }}
        />

        {/* 内层背景 */}
        <div
          style={{
            position: 'absolute',
            inset: 3,
            background: isDark 
              ? 'linear-gradient(135deg, rgba(10, 20, 40, 0.98) 0%, rgba(15, 30, 60, 0.95) 100%)' 
              : 'linear-gradient(135deg, rgba(245, 247, 250, 0.98) 0%, rgba(235, 240, 250, 0.95) 100%)',
            zIndex: -1,
            clipPath: hexagonInnerClipPath,
          }}
        />

        {/* 扫描线纹理 */}
        <div
          style={{
            position: 'absolute',
            inset: 3,
            background: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              ${isDark ? 'rgba(0, 212, 255, 0.03)' : 'rgba(0, 212, 255, 0.02)'} 2px,
              ${isDark ? 'rgba(0, 212, 255, 0.03)' : 'rgba(0, 212, 255, 0.02)'} 4px
            )`,
            pointerEvents: 'none',
            zIndex: 0,
            clipPath: hexagonInnerClipPath,
          }}
        />

        {/* 网格背景 */}
        <div
          style={{
            position: 'absolute',
            inset: 3,
            backgroundImage: `
              linear-gradient(${isDark ? 'rgba(0, 212, 255, 0.05)' : 'rgba(0, 212, 255, 0.03)'} 1px, transparent 1px),
              linear-gradient(90deg, ${isDark ? 'rgba(0, 212, 255, 0.05)' : 'rgba(0, 212, 255, 0.03)'} 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px',
            pointerEvents: 'none',
            zIndex: 0,
            clipPath: hexagonInnerClipPath,
          }}
        />

        {/* 头部 */}
        <div
          style={{
            padding: '16px 8px 12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${isDark ? 'rgba(0, 212, 255, 0.3)' : 'rgba(0, 212, 255, 0.2)'}`,
            position: 'relative',
            zIndex: 5,
            margin: '0 12px',
            minHeight: '48px',
            background: 'transparent',
            gap: 4,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, overflow: 'hidden' }}>
            <Title
              level={5}
              style={{
                margin: 0,
                color: primaryColor,
                fontSize: 15,
                textShadow: `0 0 10px ${primaryColor}80`,
                letterSpacing: 1,
                whiteSpace: 'nowrap',
              }}
            >
              快速导航
            </Title>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0, marginRight: 4 }}>
            <div style={{ marginRight: 10 }}>
              <LayoutModeIconSwitch size="small" />
            </div>
            <Tooltip
              title={pinned ? '取消固定' : '固定侧边栏'}
              overlayClassName="sidebar-pin-tooltip"
              overlayStyle={{
                ['--tooltip-bg' as string]: isDark ? '#1f2937' : '#ffffff',
                ['--tooltip-color' as string]: isDark ? '#ffffff' : '#1f2937',
              }}
            >
              <Button
                type="text"
                size="small"
                icon={pinned ? <PushpinFilled style={{ color: primaryColor, fontSize: '14px' }} /> : <PushpinOutlined style={{ fontSize: '14px' }} />}
                onClick={() => onPinChange?.(!pinned)}
                style={{
                  borderRadius: '50%',
                  width: 24,
                  height: 24,
                  minWidth: 24,
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `1px solid ${pinned ? primaryColor : 'transparent'}`,
                  boxShadow: pinned ? `0 0 6px ${primaryColor}60` : 'none',
                  flexShrink: 0,
                }}
              />
            </Tooltip>
          </div>
        </div>

        {/* 菜单项 */}
        <div
          ref={menuRef}
          tabIndex={-1}
          style={{ flex: 1, overflow: 'auto', padding: '16px 20px', position: 'relative', zIndex: 5, background: 'transparent', outline: 'none' }}
        >
          {globalMenus.map((menu, index) => {
            const active = !keyboardExpanded && isActive(menu.path, menu.key);
            const isSelected = keyboardExpanded && selectedMenuIndex === index;
            return (
              <div
                key={menu.key}
                onClick={() => navigate(menu.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '14px 18px',
                  margin: '8px 0',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  background: 'transparent',
                  color: active || isSelected ? primaryColor : isDark ? '#f0f5ff' : '#1a1a2e',
                  fontWeight: active || isSelected ? 600 : 500,
                  border: `2px solid ${active || isSelected ? primaryColor : 'transparent'}`,
                  fontSize: 14,
                  position: 'relative',
                  overflow: 'hidden',
                  // 六边形菜单项
                  clipPath: 'polygon(12px 0%, calc(100% - 12px) 0%, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 0% 50%)',
                  boxShadow: active || isSelected ? `0 0 20px ${primaryColor}50` : 'none',
                  textShadow: active || isSelected ? `0 0 8px ${primaryColor}` : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!active && !isSelected) {
                    e.currentTarget.style.borderColor = primaryColor;
                    e.currentTarget.style.boxShadow = `0 0 20px ${primaryColor}40, inset 0 0 15px ${primaryColor}20`;
                    e.currentTarget.style.transform = 'translateX(4px)';
                    e.currentTarget.style.color = primaryColor;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active && !isSelected) {
                    e.currentTarget.style.borderColor = 'transparent';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateX(0)';
                    e.currentTarget.style.color = isDark ? '#f0f5ff' : '#1a1a2e';
                  }
                }}
              >
                {/* 悬停时的流光扫过效果 */}
                <div
                  style={{
                    position: 'absolute',
                    left: '-100%',
                    top: 0,
                    width: '100%',
                    height: '100%',
                    background: `linear-gradient(90deg, transparent, ${primaryColor}20, transparent)`,
                    transition: 'left 0.5s ease',
                    pointerEvents: 'none',
                  }}
                  className="menu-shine"
                />
                <span style={{ 
                  fontSize: 18, 
                  marginRight: 12, 
                  opacity: active ? 1 : 0.9,
                  filter: active ? `drop-shadow(0 0 8px ${primaryColor})` : 'none',
                }}>
                  {menu.icon}
                </span>
                <span style={{ fontSize: 14 }}>
                  {menu.label}
                </span>
                {active && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 16,
                      width: 8,
                      height: 8,
                      background: primaryColor,
                      borderRadius: '50%',
                      boxShadow: `0 0 12px ${primaryColor}, 0 0 20px ${primaryColor}`,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* 分隔线 */}
        <div
          style={{
            height: 1,
            background: `linear-gradient(90deg, transparent, ${primaryColor}80, transparent)`,
            margin: '8px 24px',
            position: 'relative',
            zIndex: 5,
            backgroundColor: 'transparent',
          }}
        />

        {/* 底部 - 主题切换 */}
        <div
          style={{
            padding: '16px 24px 24px',
            display: 'flex',
            justifyContent: 'center',
            position: 'relative',
            zIndex: 5,
            background: 'transparent',
          }}
        >
          <div
            onClick={toggleTheme}
            style={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              userSelect: 'none',
              padding: '4px',
            }}
          >
            {/* 六边形滑动开关 */}
            <div
              style={{
                width: '72px',
                height: '36px',
                backgroundColor: isDark ? '#0a0f1e' : '#e2e8f0',
                position: 'relative',
                transition: 'all 0.3s ease',
                border: `2px solid ${isDark ? primaryColor : '#cbd5e1'}`,
                boxShadow: isDark ? `0 0 20px ${primaryColor}60, inset 0 0 15px ${primaryColor}40` : 'inset 0 2px 4px rgba(0,0,0,0.1)',
                // 六边形裁剪
                clipPath: 'polygon(12px 0%, calc(100% - 12px) 0%, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 0% 50%)',
              }}
            >
              {/* 背景图标 - 月亮在左 */}
              <MoonOutlined
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '16px',
                  color: isDark ? primaryColor : '#94a3b8',
                  transition: 'all 0.3s ease',
                  opacity: isDark ? 1 : 0.3,
                  filter: isDark ? `drop-shadow(0 0 6px ${primaryColor})` : 'none',
                }}
              />
              
              {/* 背景图标 - 太阳在右 */}
              <SunOutlined
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '16px',
                  color: !isDark ? '#f59e0b' : '#64748b',
                  transition: 'all 0.3s ease',
                  opacity: !isDark ? 1 : 0.3,
                  filter: !isDark ? 'drop-shadow(0 0 6px #f59e0b)' : 'none',
                }}
              />
              
              {/* 滑动方块 - 六边形 */}
              <div
                style={{
                  width: '30px',
                  height: '30px',
                  backgroundColor: isDark ? primaryColor : '#f59e0b',
                  position: 'absolute',
                  top: '1px',
                  left: isDark ? '2px' : '38px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: isDark 
                    ? `0 0 20px ${primaryColor}, 0 0 30px ${primaryColor}80` 
                    : '0 0 15px rgba(245, 158, 11, 0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  // 六边形裁剪
                  clipPath: 'polygon(6px 0%, calc(100% - 6px) 0%, 100% 50%, calc(100% - 6px) 100%, 6px 100%, 0% 50%)',
                }}
              >
                {isDark ? (
                  <MoonOutlined
                    style={{
                      fontSize: '16px',
                      color: '#0a0f1e',
                    }}
                  />
                ) : (
                  <SunOutlined
                    style={{
                      fontSize: '16px',
                      color: '#ffffff',
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 动画样式 */}
      <style>{`
        @keyframes neonFlowRotate {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        
        /* 菜单项悬停时流光扫过 */
        div[style*="clip-path: polygon(12px 0%"]:hover .menu-shine {
          left: 100% !important;
        }

        /* Tooltip 自定义样式 */
        .sidebar-pin-tooltip .ant-tooltip-content {
          background: transparent !important;
          box-shadow: none !important;
        }

        .sidebar-pin-tooltip .ant-tooltip-inner {
          background-color: var(--tooltip-bg, #1f2937) !important;
          color: var(--tooltip-color, #ffffff) !important;
          border-radius: 8px !important;
          padding: 8px 12px !important;
          font-size: 13px !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
          border: none !important;
        }

        .sidebar-pin-tooltip .ant-tooltip-arrow {
          background: transparent !important;
        }

        .sidebar-pin-tooltip .ant-tooltip-arrow::before {
          background-color: var(--tooltip-bg, #1f2937) !important;
          border: none !important;
          box-shadow: none !important;
        }

        .sidebar-pin-tooltip .ant-tooltip-arrow-content {
          background-color: var(--tooltip-bg, #1f2937) !important;
          border: none !important;
          box-shadow: none !important;
        }
      `}</style>
    </div>
  );
};

export default RightCollapseBar;
