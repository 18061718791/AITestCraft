import React, { useState } from 'react';
import { Layout, Menu, Typography, Space } from 'antd';
import { 
  ApiOutlined, 
  HomeOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  FileTextOutlined,
  SettingOutlined,
  UnorderedListOutlined
} from '@ant-design/icons';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

export const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: '首页',
      onClick: () => navigate('/'),
    },
    {
      key: '/assistant',
      icon: <ApiOutlined />,
      label: '用例助手',
      onClick: () => navigate('/assistant'),
    },
    {
      key: '/test-cases',
      icon: <UnorderedListOutlined />,
      label: '用例管理',
      onClick: () => navigate('/test-cases'),
    },
    {
      key: '/prompts',
      icon: <FileTextOutlined />,
      label: '提示词管理',
      onClick: () => navigate('/prompts'),
    },
    {
      key: '/system',
      icon: <SettingOutlined />,
      label: '系统管理',
      onClick: () => navigate('/system'),
    },
  ];

  const selectedKey = menuItems.find(item => {
    if (item.key === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(item.key);
  })?.key || '/';

  const getBreadcrumbTitle = () => {
    const currentItem = menuItems.find(item => item.key === selectedKey);
    return currentItem?.label || '首页';
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        collapsedWidth={80}
        style={{
          background: '#fff',
          boxShadow: '2px 0 8px rgba(0, 0, 0, 0.1)',
        }}
        width={256}
      >
        <div style={{ 
          height: 64, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          borderBottom: '1px solid #f0f0f0',
          marginBottom: 16,
          overflow: 'hidden',
          transition: 'all 0.3s ease-in-out'
        }}>
          <Title level={4} style={{ margin: 0, color: '#1890ff', whiteSpace: 'nowrap' }}>
            {collapsed ? 'AI' : 'AI测试平台'}
          </Title>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          style={{ border: 'none' }}
          inlineCollapsed={collapsed}
        />
      </Sider>
      
      <Layout>
        <Header
          style={{
            padding: 0,
            background: '#fff',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 24,
          }}
        >
          <Space>
            {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
              className: 'trigger',
              style: { fontSize: 18 },
              onClick: () => setCollapsed(!collapsed),
            })}
            <Title level={3} style={{ margin: 0 }}>
              {getBreadcrumbTitle()}
            </Title>
          </Space>
        </Header>
        
        <Content
          style={{
            margin: 24,
            padding: 24,
            background: '#fff',
            borderRadius: 8,
            minHeight: 'calc(100vh - 112px)',
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};