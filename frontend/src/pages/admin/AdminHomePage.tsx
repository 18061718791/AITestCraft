import React, { useState } from 'react';
import { Space, Tabs, Typography } from 'antd';
import { DatabaseOutlined, RobotOutlined, LineChartOutlined } from '@ant-design/icons';
import DatabaseConfigPage from './DatabaseConfigPage';
import LLMConfigPage from './LLMConfigPage';
import SystemMonitoringPage from './SystemMonitoringPage';

const { Title } = Typography;
const { TabPane } = Tabs;

const AdminHomePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('database');

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  return (
    <div style={{ width: '100%' }}>
      <Title level={2} style={{ marginBottom: 24 }}>系统管理</Title>
      
      <Tabs 
        activeKey={activeTab} 
        onChange={handleTabChange}
        style={{ width: '100%' }}
      >
        <TabPane 
          tab={<Space><DatabaseOutlined />数据库配置</Space>} 
          key="database"
        >
          <DatabaseConfigPage />
        </TabPane>
        <TabPane 
          tab={<Space><RobotOutlined />大模型配置</Space>} 
          key="llm"
        >
          <LLMConfigPage />
        </TabPane>
        <TabPane 
          tab={<Space><LineChartOutlined />系统监控</Space>} 
          key="monitoring"
        >
          <SystemMonitoringPage />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default AdminHomePage;