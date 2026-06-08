import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { Menu, Typography, Button, Tooltip } from 'antd';
import {
  RocketOutlined,
  UnorderedListOutlined,
  FileTextOutlined,
  AppstoreOutlined,
  BugOutlined,
  BarChartOutlined,
  CheckSquareOutlined,
  ProjectOutlined,
  NotificationOutlined,
  RobotOutlined,
  DatabaseOutlined,
  DashboardOutlined,
  PushpinOutlined,
  PushpinFilled,
  ApiOutlined,
  OpenAIOutlined,
  BellOutlined
} from '@ant-design/icons';
import { useLocation } from 'react-router-dom';
import { ModuleType, moduleSubMenus } from '../types/navigation';
import { useTheme } from '../contexts/ThemeContext';
import { usePageTab } from '../contexts/PageTabContext';
import { useLayoutMode } from '../contexts/LayoutModeContext';
import { useShortcut } from '../contexts/ShortcutContext';
import { useSingleShortcut } from '../hooks/useKeyboardShortcuts';
import { SIDEBAR_CONFIG } from '../layouts/FeatureLayout';
import { SidebarHint } from './SidebarHint';
import '../styles/cyberpunk.css';

const { Title } = Typography;

interface LeftCollapseBarProps {
  moduleType: ModuleType;
  pinned?: boolean;
  onPinChange?: (pinned: boolean) => void;
  onExpandedChange?: (expanded: boolean) => void;
}

// 图标映射
const iconMapping: Record<string, React.ReactNode> = {
  RocketOutlined: <RocketOutlined />,
  UnorderedListOutlined: <UnorderedListOutlined />,
  FileTextOutlined: <FileTextOutlined />,
  AppstoreOutlined: <AppstoreOutlined />,
  BugOutlined: <BugOutlined />,
  BarChartOutlined: <BarChartOutlined />,
  CheckSquareOutlined: <CheckSquareOutlined />,
  ProjectOutlined: <ProjectOutlined />,
  NotificationOutlined: <NotificationOutlined />,
  RobotOutlined: <RobotOutlined />,
  DatabaseOutlined: <DatabaseOutlined />,
  DashboardOutlined: <DashboardOutlined />,
  ApiOutlined: <ApiOutlined />,
  OpenAIOutlined: <OpenAIOutlined />,
  BellOutlined: <BellOutlined />,
};

const LeftCollapseBar: React.FC<LeftCollapseBarProps> = ({
  moduleType,
  pinned = false,
  onPinChange,
  onExpandedChange
}) => {
  const location = useLocation();
  const { isDark, themeConfig } = useTheme();
  const { navigateFromSidebar } = usePageTab();
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

  const subMenus = useMemo(() => moduleSubMenus[moduleType] || [], [moduleType]);

  // 检查是否为极客模式
  const isGeekMode = layoutMode === 'modern';

  const moduleNames: Record<ModuleType, string> = {
    test: '用例管理',
    defect: '缺陷管理',
    app: '应用管理',
    admin: '系统管理'
  };

  const menuItems = useMemo(() => {
    return subMenus.map((menu, index) => ({
      key: menu.path,
      icon: iconMapping[menu.icon] || <AppstoreOutlined />,
      label: menu.label,
      onClick: () => navigateFromSidebar(menu.path),
      className: keyboardExpanded && isCtrlPressed && selectedMenuIndex === index
        ? 'keyboard-selected-menu-item'
        : undefined
    }));
  }, [subMenus, navigateFromSidebar, keyboardExpanded, isCtrlPressed, selectedMenuIndex]);

  const selectedKey = location.pathname;

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
      if (!isHoveringBar && !keyboardExpanded) {
        setExpanded(false);
        onExpandedChange?.(false);
      }
    }
  }, [pinned, isHoveringBar, keyboardExpanded, onExpandedChange]);

  // 检查元素是否为输入框
  const isInputElement = useCallback((element: Element | null): boolean => {
    if (!element) return false;
    const tagName = element.tagName.toLowerCase();
    return (
      tagName === 'input' ||
      tagName === 'textarea' ||
      tagName === 'select' ||
      element.getAttribute('contenteditable') === 'true'
    );
  }, []);

  // 使用 ref 存储 subMenus，确保 handler 中能访问到最新值
  const subMenusRef = useRef(subMenus);
  subMenusRef.current = subMenus;

  // 监听快捷键展开/隐藏左侧栏（从配置中读取）
  useSingleShortcut({
    enabled: isGeekMode && isEnabled,
    shortcut: shortcuts.toggleLeftPanel,
    handler: () => {
      const activeElement = document.activeElement;
      if (isInputElement(activeElement)) {
        return;
      }
      if (!keyboardExpanded) {
        // 检查互斥锁：如果其他面板已被激活，则不展开
        if (!canActivatePanel('left')) {
          return;
        }
        // 展开左侧栏
        setKeyboardExpanded(true);
        setExpanded(true);
        onExpandedChange?.(true);
        setIsCtrlPressed(true);
        setActivePanel('left'); // 设置互斥锁
        // 默认选中当前页面所在的菜单项（使用 ref 获取最新 subMenus）
        const currentPathname = window.location.pathname;
        const currentSubMenus = subMenusRef.current;
        // 优先匹配更长的路径（更精确的匹配），然后按顺序查找
        const sortedMenus = [...currentSubMenus].sort((a, b) => b.path.length - a.path.length);
        const matchedMenu = sortedMenus.find(menu => {
          // 对于根路径 /defects，需要精确匹配或确保不是其他页面的前缀
          if (menu.path === '/defects') {
            return currentPathname === '/defects' || currentPathname === '/defects/';
          }
          return currentPathname.startsWith(menu.path);
        });
        const currentIndex = matchedMenu ? currentSubMenus.findIndex(m => m.path === matchedMenu.path) : -1;
        if (currentIndex !== -1) {
          setSelectedMenuIndex(currentIndex);
        } else if (currentSubMenus.length > 0) {
          setSelectedMenuIndex(0);
        }
        // 设置焦点到菜单区域
        setTimeout(() => {
          menuRef.current?.focus();
        }, 100);
      } else {
        // 再次按下快捷键，隐藏左侧栏
        setKeyboardExpanded(false);
        setIsCtrlPressed(false);
        setActivePanel(null); // 释放互斥锁
        if (!isHoveringBar && !pinned) {
          setExpanded(false);
          onExpandedChange?.(false);
        }
        setSelectedMenuIndex(-1);
      }
    },
    preventDefault: true,
  });

  // 监听 Ctrl 键按下和释放
  useEffect(() => {
    if (!isGeekMode) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Control' && !isCtrlPressed && keyboardExpanded) {
        setIsCtrlPressed(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Control') {
        setIsCtrlPressed(false);
        // 松开 Ctrl 后，如果选中了菜单项则导航
        if (keyboardExpanded && selectedMenuIndex >= 0 && selectedMenuIndex < subMenus.length) {
          const selectedMenu = subMenus[selectedMenuIndex];
          if (selectedMenu) {
            navigateFromSidebar(selectedMenu.path);
          }
        }
        // 关闭键盘展开状态
        setKeyboardExpanded(false);
        setActivePanel(null); // 释放互斥锁
        if (!isHoveringBar && !pinned) {
          setExpanded(false);
          onExpandedChange?.(false);
        }
        setSelectedMenuIndex(-1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isGeekMode, isCtrlPressed, keyboardExpanded, selectedMenuIndex, subMenus, isHoveringBar, pinned, onExpandedChange, navigateFromSidebar, setActivePanel]);

  // 监听方向键切换菜单项选择
  useEffect(() => {
    if (!isGeekMode || !keyboardExpanded || !isCtrlPressed) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const activeElement = document.activeElement;
      if (isInputElement(activeElement)) {
        return;
      }

      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        event.stopPropagation();

        if (subMenus.length === 0) return;

        if (event.key === 'ArrowUp') {
          setSelectedMenuIndex(prev => {
            if (prev <= 0) return subMenus.length - 1;
            return prev - 1;
          });
        } else if (event.key === 'ArrowDown') {
          setSelectedMenuIndex(prev => {
            if (prev < 0 || prev >= subMenus.length - 1) return 0;
            return prev + 1;
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isGeekMode, keyboardExpanded, isCtrlPressed, subMenus.length, isInputElement]);

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
        justifyContent: 'flex-end',
        paddingRight: SIDEBAR_CONFIG.left.gap,
      }}
    >
      {/* 菱形提示 - 收起时显示 */}
      <SidebarHint
        position="left"
        title="功能菜单"
        isVisible={!isVisible}
      />

      {/* 六边形侧边栏 */}
      <div
        style={{
          // 当展开但未固定时，使用 fixed 定位覆盖在中间内容之上
          // 当固定时，使用 absolute 定位随容器扩展
          position: expanded && !pinned ? 'fixed' : 'absolute',
          left: expanded && !pinned ? SIDEBAR_CONFIG.hint.width + 10 : undefined,
          right: expanded && !pinned ? undefined : SIDEBAR_CONFIG.left.gap,
          top: '50%',
          transform: `translateY(-50%) ${isVisible ? 'translateX(0)' : 'translateX(-30px)'}`,
          width: SIDEBAR_CONFIG.left.width,
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
            padding: '16px 20px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${isDark ? 'rgba(0, 212, 255, 0.3)' : 'rgba(0, 212, 255, 0.2)'}`,
            position: 'relative',
            zIndex: 5,
            margin: '0 20px',
            minHeight: '48px',
            background: 'transparent',
          }}
        >
          <Title 
            level={5} 
            style={{ 
              margin: 0, 
              color: primaryColor, 
              fontSize: 15,
              textShadow: `0 0 10px ${primaryColor}80`,
              letterSpacing: 2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              flex: 1,
            }}
          >
            {moduleNames[moduleType]}
          </Title>
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
              icon={pinned ? <PushpinFilled style={{ color: primaryColor, fontSize: '16px' }} /> : <PushpinOutlined style={{ fontSize: '16px' }} />}
              onClick={() => onPinChange?.(!pinned)}
              style={{
                borderRadius: '50%',
                width: 32,
                height: 32,
                minWidth: 32,
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${pinned ? primaryColor : 'transparent'}`,
                boxShadow: pinned ? `0 0 10px ${primaryColor}60` : 'none',
                flexShrink: 0,
              }}
            />
          </Tooltip>
        </div>

        {/* 菜单 */}
        <div
          ref={menuRef}
          tabIndex={-1}
          style={{ flex: 1, overflow: 'auto', padding: '16px 20px', position: 'relative', zIndex: 5, background: 'transparent', outline: 'none' }}
        >
          <Menu
            mode="inline"
            selectedKeys={keyboardExpanded ? [] : [selectedKey]}
            items={menuItems}
            style={{
              border: 'none',
              background: 'transparent',
            }}
            inlineIndent={10}
            className="cyber-menu"
          />
        </div>

        {/* 底部装饰 - 能量条 */}
        <div
          style={{
            height: 3,
            background: `linear-gradient(90deg, transparent, ${primaryColor}, ${primaryColor}, transparent)`,
            margin: '0 24px 24px',
            borderRadius: 2,
            boxShadow: `0 0 10px ${primaryColor}, 0 0 20px ${primaryColor}60`,
            position: 'relative',
            zIndex: 5,
            backgroundColor: 'transparent',
          }}
        >
          {/* 能量流动效果 */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(90deg, transparent, #fff, transparent)`,
              backgroundSize: '50% 100%',
              animation: 'dataFlow 2s linear infinite',
              opacity: 0.5,
            }}
          />
        </div>
      </div>

      {/* 赛博朋克菜单样式 */}
      <style>{`
        @keyframes dataFlow {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        
        @keyframes neonFlowRotate {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        
        .cyber-menu {
          background: transparent !important;
        }
        
        .cyber-menu .ant-menu-item {
          border-radius: 0 !important;
          margin: 8px 0 !important;
          height: 48px !important;
          line-height: 48px !important;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
          font-size: 14px !important;
          border: 2px solid transparent !important;
          position: relative !important;
          overflow: hidden !important;
          /* 六边形菜单项 */
          clip-path: polygon(12px 0%, calc(100% - 12px) 0%, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 0% 50%) !important;
          color: ${isDark ? '#f0f5ff !important' : '#1a1a2e !important'};
          font-weight: 500 !important;
          padding-left: 20px !important;
          padding-right: 20px !important;
        }
        
        .cyber-menu .ant-menu-item::before {
          content: '' !important;
          position: absolute !important;
          left: -100% !important;
          top: 0 !important;
          width: 100% !important;
          height: 100% !important;
          background: linear-gradient(90deg, transparent, ${primaryColor}20, transparent) !important;
          transition: left 0.5s ease !important;
          pointer-events: none !important;
        }
        
        .cyber-menu .ant-menu-item:hover::before {
          left: 100% !important;
        }
        
        .cyber-menu .ant-menu-item:hover {
          color: ${primaryColor} !important;
          border-color: ${primaryColor} !important;
          box-shadow: 0 0 20px ${primaryColor}40, inset 0 0 15px ${primaryColor}20 !important;
          transform: translateX(-4px) !important;
        }
        
        .cyber-menu .ant-menu-item-selected {
          color: ${primaryColor} !important;
          font-weight: 600 !important;
          border-color: ${primaryColor} !important;
          background: transparent !important;
          box-shadow: 0 0 20px ${primaryColor}50 !important;
          text-shadow: 0 0 8px ${primaryColor} !important;
        }
        
        .cyber-menu .ant-menu-item-selected::after {
          display: none !important;
        }
        
        .cyber-menu .ant-menu-item-icon {
          font-size: 18px !important;
          filter: drop-shadow(0 0 4px ${primaryColor}60) !important;
        }
        
        .cyber-menu .ant-menu-item-selected .ant-menu-item-icon {
          filter: drop-shadow(0 0 8px ${primaryColor}) !important;
        }

        /* 键盘选中菜单项样式 */
        .cyber-menu .keyboard-selected-menu-item {
          color: ${primaryColor} !important;
          font-weight: 600 !important;
          border-color: ${primaryColor} !important;
          background: transparent !important;
          box-shadow: 0 0 25px ${primaryColor}70 !important;
          text-shadow: 0 0 10px ${primaryColor} !important;
          animation: keyboardPulse 1s ease-in-out infinite !important;
        }

        @keyframes keyboardPulse {
          0%, 100% {
            box-shadow: 0 0 25px ${primaryColor}70 !important;
          }
          50% {
            box-shadow: 0 0 35px ${primaryColor}90 !important;
          }
        }

        .cyber-menu .keyboard-selected-menu-item .ant-menu-item-icon {
          filter: drop-shadow(0 0 10px ${primaryColor}) !important;
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

export default LeftCollapseBar;
