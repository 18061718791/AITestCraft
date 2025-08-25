import React, { useState, useEffect } from 'react';
import { Select, Form, Card, Button, Alert } from 'antd';
import { System } from '../types';
import { systemApi } from '../services/systemApi';

const { Option } = Select;

const SystemSelectorDebug: React.FC = () => {
  const [systems, setSystems] = useState<System[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSystem, setSelectedSystem] = useState<number | undefined>();
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const addDebugInfo = (info: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo(prev => [...prev, `[${timestamp}] ${info}`]);
  };

  const loadSystems = async () => {
    addDebugInfo('开始加载系统列表...');
    setLoading(true);
    setError(null);
    
    try {
      addDebugInfo('调用 systemApi.getSystems()...');
      const data = await systemApi.getSystems();
      addDebugInfo(`API调用成功，获取到 ${data.length} 个系统`);
      
      if (data.length === 0) {
        addDebugInfo('警告：系统列表为空');
      } else {
        data.forEach((system, index) => {
          addDebugInfo(`系统 ${index + 1}: ID=${system.id}, 名称="${system.name}"`);
        });
      }
      
      setSystems(data);
      addDebugInfo('系统列表设置完成');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      addDebugInfo(`错误: ${errorMessage}`);
      setError(errorMessage);
      console.error('加载系统失败:', error);
    } finally {
      setLoading(false);
      addDebugInfo('加载完成');
    }
  };

  const testApiConnection = async () => {
    addDebugInfo('测试API连接...');
    
    try {
      const response = await fetch('http://localhost:9000/api/system/systems');
      addDebugInfo(`HTTP状态: ${response.status}`);
      
      const data = await response.json();
      addDebugInfo(`响应数据: ${JSON.stringify(data)}`);
      
    } catch (error) {
      addDebugInfo(`连接失败: ${error}`);
    }
  };

  useEffect(() => {
    addDebugInfo('组件挂载，准备加载系统数据...');
    loadSystems();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>系统选择器调试</h2>
      
      {error && (
        <Alert
          message="加载失败"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      
      <Card title="系统选择器" style={{ marginBottom: 16 }}>
        <Form layout="vertical">
          <Form.Item label="选择系统">
            <Select
              placeholder="请选择系统"
              value={selectedSystem}
              onChange={setSelectedSystem}
              loading={loading}
              style={{ width: 300 }}
            >
              {systems.map(system => (
                <Option key={system.id} value={system.id}>
                  {system.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
        
        <div style={{ marginTop: 16 }}>
          <Button onClick={loadSystems} loading={loading}>
            重新加载系统
          </Button>
          <Button onClick={testApiConnection} style={{ marginLeft: 8 }}>
            测试API连接
          </Button>
        </div>
      </Card>
      
      <Card title="调试信息">
        <pre style={{ 
          backgroundColor: '#f5f5f5', 
          padding: 10, 
          borderRadius: 4,
          maxHeight: 400,
          overflow: 'auto',
          fontSize: 12
        }}>
          {debugInfo.length > 0 ? debugInfo.join('\n') : '暂无调试信息'}
        </pre>
      </Card>
    </div>
  );
};

export default SystemSelectorDebug;