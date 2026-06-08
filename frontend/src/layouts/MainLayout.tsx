import React, { useState } from 'react';
import { Layout, Menu, Typography, Space } from 'antd';
import { 
  HomeOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UnorderedListOutlined,
  BugOutlined,
  SettingOutlined,
  AppstoreOutlined
} from '@ant-design/icons';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { useTheme } from '../contexts/ThemeContext';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

export const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark, themeConfig } = useTheme();

  // 获取主题颜色
  const primaryColor = (themeConfig.token?.colorPrimary as string) || '#1890ff';
  const bgContainer = (themeConfig.token?.colorBgContainer as string) || '#ffffff';
  const bgLayout = (themeConfig.token?.colorBgLayout as string) || '#f0f2f5';
  const textBase = (themeConfig.token?.colorTextBase as string) || '#262626';
  const borderColor = (themeConfig.token?.colorBorder as string) || '#d9d9d9';

  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: '首页',
      onClick: () => navigate('/'),
    },
    {
      key: '/test-management',
      icon: <UnorderedListOutlined />,
      label: '用例管理',
      children: [
        {
          key: '/assistant',
          label: '用例助手',
          onClick: () => navigate('/assistant'),
        },
        {
          key: '/test-cases',
          label: '用例列表',
          onClick: () => navigate('/test-cases'),
        },
        {
          key: '/prompts',
          label: '提示词管理',
          onClick: () => navigate('/prompts'),
        },
        {
          key: '/system',
          label: '平台管理',
          onClick: () => navigate('/system'),
        },
      ],
    },
    {
      key: '/defects',
      icon: <BugOutlined />,
      label: '缺陷管理',
      children: [
        {
          key: '/defects/list',
          label: '问题列表',
          onClick: () => navigate('/defects/list'),
        },
        {
          key: '/defects/analysis',
          label: '数据分析',
          onClick: () => navigate('/defects'),
        },
        {
          key: '/defects/todo',
          label: '我的待办',
          onClick: () => navigate('/defects/todo'),
        },
        {
          key: '/defects/project',
          label: '项目管理',
          onClick: () => navigate('/defects/project'),
        },
        {
          key: '/defects/notification',
          label: '消息推送配置',
          onClick: () => navigate('/defects/notification'),
        },
        {
          key: '/defects/assistant',
          label: '缺陷助手',
          onClick: () => navigate('/defects/assistant'),
        },
      ],
    },
    // 应用管理 - 独立一级菜单，放置在缺陷管理和系统管理之间
    {
      key: '/app-management',
      icon: <AppstoreOutlined />,
      label: '应用管理',
      children: [
        {
          key: '/app-management/pending',
          label: '待部署应用',
          onClick: () => navigate('/app-management/pending'),
        },
        {
          key: '/app-management/history',
          label: '部署应用历史',
          onClick: () => navigate('/app-management/history'),
        },
        {
          key: '/app-management/config',
          label: '应用配置',
          onClick: () => navigate('/app-management/config'),
        },
      ],
    },
    {
      key: '/admin',
      icon: <SettingOutlined />,
      label: '系统管理',
      children: [
        {
          key: '/admin/project',
          label: '项目管理',
          onClick: () => navigate('/admin/project'),
        },
        {
          key: '/admin/notification',
          label: '消息推送配置',
          onClick: () => navigate('/admin/notification'),
        },
        {
          key: '/admin/todo-reminder',
          label: '我的待办提醒',
          onClick: () => navigate('/admin/todo-reminder'),
        },
        {
          key: '/admin/database',
          label: '数据库配置',
          onClick: () => navigate('/admin/database'),
        },
        {
          key: '/admin/llm',
          label: '大模型配置',
          onClick: () => navigate('/admin/llm'),
        },
        {
          key: '/admin/monitoring',
          label: '系统监控',
          onClick: () => navigate('/admin/monitoring'),
        },
        {
          key: '/admin/plugins',
          label: '插件管理',
          onClick: () => navigate('/admin/plugins'),
        },
      ],
    },
  ];

  // 递归查找匹配的菜单项
  const findSelectedKey = (items: any[], path: string): string => {
    for (const item of items) {
      if (item.key === path) {
        return item.key;
      }
      if (item.children && item.children.length > 0) {
        const childKey = findSelectedKey(item.children, path);
        if (childKey) {
          return childKey;
        }
      }
    }
    return '';
  };

  // 首先尝试完全匹配
  let selectedKey = findSelectedKey(menuItems, location.pathname);
  
  // 特殊处理：当路径是 /defects 时，应该选中数据分析菜单
  if (location.pathname === '/defects') {
    selectedKey = '/defects/analysis';
  }
  
  // 特殊处理：当路径是 /defects/todo 时，应该选中我的待办菜单
  if (location.pathname === '/defects/todo') {
    selectedKey = '/defects/todo';
  }
  
  // 特殊处理：当路径是 /defects/qa 时，应该选中缺陷管理助手菜单
  if (location.pathname === '/defects/qa') {
    selectedKey = '/defects/qa';
  }
  
  // 如果没有完全匹配，尝试前缀匹配
  if (!selectedKey) {
    selectedKey = menuItems.find(item => {
      if (item.key === '/') {
        return location.pathname === '/';
      }
      return location.pathname.startsWith(item.key);
    })?.key || '/';
  }
  
  // 确定默认展开的菜单项
  const getDefaultOpenKeys = () => {
    const openKeys: string[] = [];
    
    // 如果当前路径是缺陷管理相关的路径，展开缺陷管理菜单
    if (location.pathname.startsWith('/defects')) {
      openKeys.push('/defects');
    }
    
    // 如果当前路径是用例管理相关的路径，展开用例管理菜单
    if (location.pathname.startsWith('/assistant') || 
        location.pathname.startsWith('/test-cases') || 
        location.pathname.startsWith('/prompts') || 
        location.pathname.startsWith('/system')) {
      openKeys.push('/test-management');
    }
    
    return openKeys;
  };

  const getBreadcrumbTitle = () => {
    const currentItem = menuItems.find(item => item.key === selectedKey);
    return currentItem?.label || '首页';
  };

  return (
    <Layout style={{ minHeight: '100vh', background: bgLayout }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        collapsedWidth={80}
        style={{
          background: bgContainer,
          boxShadow: isDark 
            ? '2px 0 8px rgba(0, 0, 0, 0.45)' 
            : '2px 0 8px rgba(0, 0, 0, 0.1)',
        }}
        width={256}
      >
        <div style={{ 
          height: 64, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          borderBottom: `1px solid ${borderColor}`,
          marginBottom: 16,
          overflow: 'hidden',
          transition: 'all 0.3s ease-in-out',
          background: bgContainer,
        }}>
          <Title 
            level={4} 
            style={{ 
              margin: 0, 
              color: primaryColor, 
              whiteSpace: 'nowrap',
              fontWeight: 600,
            }}
          >
            {collapsed ? '测试' : '测试管理平台'}
          </Title>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          defaultOpenKeys={getDefaultOpenKeys()}
          items={menuItems}
          style={{ 
            border: 'none',
            background: bgContainer,
          }}
          inlineCollapsed={collapsed}
          theme={isDark ? 'dark' : 'light'}
        />
      </Sider>
      
      <Layout>
        <Header
          style={{
            padding: 0,
            background: bgContainer,
            boxShadow: isDark 
              ? '0 2px 8px rgba(0, 0, 0, 0.45)' 
              : '0 2px 8px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingLeft: 24,
            paddingRight: 24,
          }}
        >
          <Space>
            {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
              className: 'trigger',
              style: { 
                fontSize: 18,
                color: textBase,
              },
              onClick: () => setCollapsed(!collapsed),
            })}
            <Title 
              level={3} 
              style={{ 
                margin: 0,
                color: textBase,
              }}
            >
              {getBreadcrumbTitle()}
            </Title>
          </Space>
          
          {/* 主题切换器 */}
          <ThemeSwitcher />
        </Header>
        
        <Content
          style={{
            margin: 24,
            padding: 24,
            background: bgContainer,
            borderRadius: 8,
            minHeight: 'calc(100vh - 112px)',
            overflow: 'auto',
            color: textBase,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};
