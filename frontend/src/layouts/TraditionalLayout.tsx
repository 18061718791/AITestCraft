import React, { useState, useMemo, useEffect } from 'react';
import { Layout, Menu, Breadcrumb, Button, Dropdown, Avatar } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MoonOutlined,
  SunOutlined,
  UserOutlined,
  LogoutOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { LayoutModeIconSwitch } from '../components/LayoutModeIconSwitch';
import { traditionalMenuConfig, TraditionalMenuItem } from '../types/navigation';
import { PageTabProvider } from '../contexts/PageTabContext';
import { ShortcutProvider } from '../contexts/ShortcutContext';
import * as Icons from '@ant-design/icons';
import { TodoStatsBadge } from '../components/todoReminder/TodoStatsBadge';
import UserProfileModal from '../components/user/UserProfileModal';
import ResetPasswordModal from '../components/user/ResetPasswordModal';

const { Sider, Header, Content } = Layout;

// 获取头像完整 URL
const getAvatarUrl = (avatar: string | null): string | null => {
  if (!avatar) return null;
  if (avatar.startsWith('http')) return avatar;
  const API_BASE_URL = import.meta.env.VITE_API_URL || '';
  return `${API_BASE_URL}${avatar}`;
};

// 动态获取图标组件
const getIcon = (iconName: string): React.ReactNode => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const icons = Icons as any;
  const IconComponent = icons[iconName] as React.ComponentType;
  return IconComponent ? <IconComponent /> : null;
};

// 将菜单配置转换为Menu items格式
const convertMenuItems = (items: TraditionalMenuItem[]) => {
  return items.map(item => ({
    key: item.key,
    icon: getIcon(item.icon),
    label: item.label,
    children: item.children?.map(child => ({
      key: child.key,
      icon: getIcon(child.icon),
      label: child.label,
    })),
  }));
};

const TraditionalLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { user, logout, isAuthenticated } = useAuth();

  // 用户下拉菜单项
  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
      onClick: () => setProfileModalOpen(true),
      style: { padding: '10px 16px' },
    },
    {
      key: 'reset-password',
      icon: <LockOutlined />,
      label: '重置密码',
      onClick: () => setResetPasswordModalOpen(true),
      style: { padding: '10px 16px' },
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
      onClick: logout,
      style: { padding: '10px 16px' },
    },
  ];

  // 根据当前路径计算选中的菜单项
  const selectedKeys = useMemo(() => {
    const currentPath = location.pathname;
    for (const menu of traditionalMenuConfig) {
      if (menu.path === currentPath) return [menu.key];
      if (menu.children) {
        for (const child of menu.children) {
          if (child.path === currentPath) return [child.key];
        }
      }
    }
    return [];
  }, [location.pathname]);

  // 计算需要展开的子菜单（仅当前模块展开）
  const currentOpenKeys = useMemo(() => {
    const currentPath = location.pathname;
    for (const menu of traditionalMenuConfig) {
      if (menu.children) {
        const hasChildMatch = menu.children.some(child => child.path === currentPath);
        if (hasChildMatch) return [menu.key];
      }
    }
    return [];
  }, [location.pathname]);

  // 同步openKeys状态
  useEffect(() => {
    setOpenKeys(currentOpenKeys);
  }, [currentOpenKeys]);

  // 生成面包屑数据
  const breadcrumbItems = useMemo(() => {
    const items: { title: string; path: string }[] = [{ title: '首页', path: '/' }];
    const currentPath = location.pathname;

    for (const menu of traditionalMenuConfig) {
      if (menu.path === currentPath) {
        items.push({ title: menu.label, path: menu.path });
        break;
      }
      if (menu.children) {
        for (const child of menu.children) {
          if (child.path === currentPath) {
            items.push({ title: menu.label, path: menu.path || '#' });
            items.push({ title: child.label, path: child.path });
            break;
          }
        }
      }
    }
    return items;
  }, [location.pathname]);

  // 菜单点击处理
  const handleMenuClick = ({ key }: { key: string }) => {
    for (const menu of traditionalMenuConfig) {
      if (menu.key === key && menu.path) {
        navigate(menu.path);
        return;
      }
      if (menu.children) {
        for (const child of menu.children) {
          if (child.key === key && child.path) {
            navigate(child.path);
            return;
          }
        }
      }
    }
  };

  // 子菜单展开/收起处理
  const handleOpenChange = (keys: string[]) => {
    const latestOpenKey = keys.find(key => !openKeys.includes(key));
    if (latestOpenKey) {
      setOpenKeys([latestOpenKey]);
    } else {
      setOpenKeys([]);
    }
  };

  return (
    <ShortcutProvider>
      <PageTabProvider>
        <Layout style={{ minHeight: '100vh', height: '100vh', overflow: 'hidden' }}>
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          width={220}
          theme={isDark ? 'dark' : 'light'}
          style={{
            boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
            height: '100vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
        {/* Logo区域 */}
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: collapsed ? 16 : 18,
            fontWeight: 'bold',
            borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
            color: isDark ? '#fff' : '#1890ff',
            padding: '0 16px',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            flexShrink: 0,
          }}
        >
          {collapsed ? '测试' : '测试管理平台'}
        </div>

        {/* 菜单区域 - 固定高度，不随内容自适应 */}
        <div
          style={{
            height: 'calc(100vh - 64px)', // 视口高度 - Logo高度
            overflow: 'auto',
            overflowX: 'hidden',
          }}
        >
          <Menu
            mode="inline"
            theme={isDark ? 'dark' : 'light'}
            selectedKeys={selectedKeys}
            openKeys={openKeys}
            onOpenChange={handleOpenChange}
            onClick={handleMenuClick}
            items={convertMenuItems(traditionalMenuConfig)}
            style={{
              borderRight: 0,
              paddingBottom: 8, // 菜单底部留一些空间
            }}
          />
        </div>
      </Sider>

      <Layout style={{ height: '100vh', overflow: 'hidden' }}>
        <Header
          style={{
            background: isDark ? '#1f2937' : '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
            flexShrink: 0,
            height: 64,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{
                marginRight: 16,
                fontSize: 16,
                color: isDark ? '#fff' : '#333',
              }}
            />
            {/* 面包屑导航 */}
            <Breadcrumb
              style={{ color: isDark ? '#fff' : '#333' }}
              items={breadcrumbItems.map((item, index) => ({
                title:
                  index === breadcrumbItems.length - 1 ? (
                    <span style={{ color: isDark ? '#fff' : '#333', fontWeight: 500 }}>
                      {item.title}
                    </span>
                  ) : (
                    <a
                      onClick={() => navigate(item.path)}
                      style={{ color: isDark ? 'rgba(255,255,255,0.7)' : '#666' }}
                    >
                      {item.title}
                    </a>
                  ),
              }))}
            />
          </div>
          
          {/* 右上角控制区：我的待办 + 模式切换 + 主题切换 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* 我的待办统计徽章 */}
            <TodoStatsBadge 
              style={{
                height: '32px',
                display: 'flex',
                alignItems: 'center',
              }}
            />

            {/* 模式切换 */}
            <LayoutModeIconSwitch size="home" />

            {/* 主题切换 */}
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
            {/* 滑动开关 - 图标在圆圈内 */}
            <div
              style={{
                width: '56px',
                height: '28px',
                backgroundColor: isDark ? '#1e293b' : '#e2e8f0',
                borderRadius: '14px',
                position: 'relative',
                transition: 'all 0.3s ease',
                border: isDark ? '1px solid #00d4ff' : '1px solid #cbd5e1',
                boxShadow: isDark ? '0 0 15px rgba(0, 212, 255, 0.3)' : 'inset 0 2px 4px rgba(0,0,0,0.1)',
              }}
            >
              {/* 背景图标 - 月亮在左 */}
              <MoonOutlined
                style={{
                  position: 'absolute',
                  left: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '14px',
                  color: isDark ? '#00d4ff' : '#94a3b8',
                  transition: 'all 0.3s ease',
                  opacity: isDark ? 1 : 0.3,
                }}
              />
              
              {/* 背景图标 - 太阳在右 */}
              <SunOutlined
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '14px',
                  color: !isDark ? '#f59e0b' : '#64748b',
                  transition: 'all 0.3s ease',
                  opacity: !isDark ? 1 : 0.3,
                }}
              />
              
              {/* 滑动圆圈 - 包含当前状态的图标 */}
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  backgroundColor: isDark ? '#00d4ff' : '#f59e0b',
                  borderRadius: '50%',
                  position: 'absolute',
                  top: '1px',
                  left: isDark ? '2px' : '30px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: isDark 
                    ? '0 2px 8px rgba(0, 212, 255, 0.5)' 
                    : '0 2px 8px rgba(245, 158, 11, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* 圆圈内的图标 */}
                {isDark ? (
                  <MoonOutlined
                    style={{
                      fontSize: '14px',
                      color: '#0f172a',
                      transition: 'all 0.3s ease',
                    }}
                  />
                ) : (
                  <SunOutlined
                    style={{
                      fontSize: '14px',
                      color: '#ffffff',
                      transition: 'all 0.3s ease',
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* 用户头像和下拉菜单 */}
          {isAuthenticated && user && (
            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              arrow
            >
              <div
                style={{
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '0 12px',
                  height: '32px',
                  background: 'transparent',
                  borderRadius: '20px',
                  border: `1px solid ${isDark ? 'rgba(0, 212, 255, 0.25)' : 'rgba(24, 144, 255, 0.25)'}`,
                  verticalAlign: 'middle',
                }}
                className="user-dropdown-trigger"
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = isDark
                    ? '0 0 15px rgba(0, 212, 255, 0.25)'
                    : '0 0 15px rgba(24, 144, 255, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <Avatar
                  size={22}
                  icon={<UserOutlined />}
                  src={getAvatarUrl(user.avatar)}
                  style={{
                    background: isDark ? '#00d4ff' : '#1890ff',
                    boxShadow: isDark ? `0 0 10px rgba(0, 212, 255, 0.6)` : `0 0 8px rgba(24, 144, 255, 0.5)`,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: isDark ? '#fff' : '#333',
                    maxWidth: 80,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    lineHeight: '32px',
                  }}
                >
                  {user.nickname || user.username}
                </span>
              </div>
            </Dropdown>
          )}
        </div>
        </Header>

        {/* 个人中心弹窗 */}
        <UserProfileModal
          open={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
        />

        {/* 重置密码弹窗 */}
        <ResetPasswordModal
          open={resetPasswordModalOpen}
          onClose={() => setResetPasswordModalOpen(false)}
        />
        <Content
          style={{
            margin: 24,
            padding: 24,
            background: isDark ? '#1f2937' : '#fff',
            borderRadius: 8,
            overflow: 'auto',
            flex: 1,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
      </PageTabProvider>
    </ShortcutProvider>
  );
};

export default TraditionalLayout;
