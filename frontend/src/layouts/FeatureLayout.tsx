import React, { useState, useMemo } from 'react';
import { Layout } from 'antd';
import { Outlet, useLocation } from 'react-router-dom';
import LeftCollapseBar from '../components/LeftCollapseBar';
import RightCollapseBar from '../components/RightCollapseBar';
import BottomTabBar from '../components/BottomTabBar';
import PageTransition from '../components/PageTransition';
import CyberPageHeader from '../components/pageHeader/CyberPageHeader';
import { PageTabProvider } from '../contexts/PageTabContext';
import { ShortcutProvider } from '../contexts/ShortcutContext';
import { getCurrentModuleType } from '../types/navigation';
import { useTheme } from '../contexts/ThemeContext';
import { getDefaultPageMeta } from '../config/pageMeta';

const { Content } = Layout;

// 隐藏栏配置 - 统一在这里管理尺寸
export const SIDEBAR_CONFIG = {
  left: {
    width: 210,      // 左侧栏宽度 - 增加以确保内容显示完整
    triggerWidth: 8, // 触发区域宽度（收起的宽度）
    gap: 8,          // 栏与内容的间距
  },
  right: {
    width: 200,      // 右侧栏宽度 - 增加以确保内容显示完整
    triggerWidth: 8, // 触发区域宽度（收起的宽度）
    gap: 8,          // 栏与内容的间距
  },
  content: {
    padding: 12,     // 内容区域内边距
  },
  hint: {
    width: 32,       // 梯形提示组件宽度
  },
  bottomTabBar: {
    height: 24,      // 底部标签栏收起时的高度（提示条）
    expandedHeight: 200, // 展开时的高度
  }
};

const FeatureLayout: React.FC = () => {
  const location = useLocation();
  const { isDark } = useTheme();

  const [leftPinned, setLeftPinned] = useState(false);
  const [rightPinned, setRightPinned] = useState(false);
  const [leftExpanded, setLeftExpanded] = useState(false);
  const [rightExpanded, setRightExpanded] = useState(false);

  // 底部标签栏状态
  const [bottomTabBarPinned, setBottomTabBarPinned] = useState(false);

  const moduleType = useMemo(() => getCurrentModuleType(location.pathname), [location.pathname]);

  // 获取当前页面的系统名和模块名
  const { systemName, moduleName } = useMemo(() => {
    const meta = getDefaultPageMeta(location.pathname);
    const moduleMap: Record<string, string> = {
      'test': '用例管理',
      'defect': '缺陷管理',
      'app': '应用管理',
      'admin': '系统管理',
    };
    return {
      systemName: moduleMap[meta.module] || meta.module,
      moduleName: meta.title,
    };
  }, [location.pathname]);

  // 计算内容区域的实际可用宽度和位置
  // 只有固定(pinned)时才压缩内容区域，展开(expanded)时不压缩（侧边栏会覆盖在中间内容之上）
  const leftSpace = leftPinned 
    ? SIDEBAR_CONFIG.left.width + SIDEBAR_CONFIG.left.gap 
    : SIDEBAR_CONFIG.hint.width;
  const rightSpace = rightPinned 
    ? SIDEBAR_CONFIG.right.width + SIDEBAR_CONFIG.right.gap 
    : SIDEBAR_CONFIG.hint.width;
  
  // 计算底部间距（只有固定标签栏时才压缩显示区域）
  const bottomSpace = bottomTabBarPinned
    ? SIDEBAR_CONFIG.bottomTabBar.expandedHeight + 8
    : SIDEBAR_CONFIG.bottomTabBar.height + 8;

  return (
    <ShortcutProvider>
      <PageTabProvider>
        <Layout
          style={{
            height: '100vh',
            background: isDark ? '#0f172a' : '#f8fafc',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* 左侧隐藏栏 - 使用绝对定位，占据独立空间 */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: leftExpanded || leftPinned ? SIDEBAR_CONFIG.left.width + 20 : SIDEBAR_CONFIG.hint.width + 10,
              height: '100vh',
              zIndex: 1002,
              transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              pointerEvents: 'none',
              background: 'transparent',
            }}
          >
            <div style={{ pointerEvents: 'auto', width: '100%', height: '100%', background: 'transparent' }}>
              <LeftCollapseBar
                moduleType={moduleType}
                pinned={leftPinned}
                onPinChange={setLeftPinned}
                onExpandedChange={setLeftExpanded}
              />
            </div>
          </div>

          {/* 内容区域 - 根据栏的状态自动调整位置 */}
          <Content
            style={{
              margin: 0,
              marginLeft: leftSpace,
              marginRight: rightSpace,
              marginBottom: bottomSpace,
              padding: SIDEBAR_CONFIG.content.padding,
              background: 'transparent',
              height: `calc(100vh - ${bottomSpace}px)`,
              overflow: 'hidden',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {/* 极客风格页面头部 - 独立模块 */}
            <CyberPageHeader
              platformName="AITestCraft 自动化测试平台"
              systemName={systemName}
              moduleName={moduleName}
              variant="cyber-card"
            />

            {/* 页面内容区域 - 独立模块 */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                background: isDark ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.8)',
                border: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`,
                borderRadius: 16,
                boxShadow: isDark
                  ? '0 16px 32px -8px rgba(0, 0, 0, 0.5)'
                  : '0 16px 32px -8px rgba(0, 0, 0, 0.15)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
              }}
            >
              {/* 页面内容 - 用于截图 */}
              <div
                className="page-content-area"
                style={{
                  flex: 1,
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <PageTransition>
                  <Outlet />
                </PageTransition>
              </div>
            </div>
          </Content>

          {/* 右侧隐藏栏 - 使用绝对定位，占据独立空间 */}
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              width: rightExpanded || rightPinned ? SIDEBAR_CONFIG.right.width + 20 : SIDEBAR_CONFIG.hint.width + 10,
              height: '100vh',
              zIndex: 1002,
              transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              pointerEvents: 'none',
              background: 'transparent',
            }}
          >
            <div style={{ pointerEvents: 'auto', width: '100%', height: '100%', background: 'transparent' }}>
              <RightCollapseBar
                pinned={rightPinned}
                onPinChange={setRightPinned}
                onExpandedChange={setRightExpanded}
              />
            </div>
          </div>

          {/* 底部隐藏式标签栏 */}
          <BottomTabBar
            pinned={bottomTabBarPinned}
            onPinChange={setBottomTabBarPinned}
          />
        </Layout>
      </PageTabProvider>
    </ShortcutProvider>
  );
};

export default FeatureLayout;
