import React, { useState, useEffect } from 'react';
import { Card, Select, Button, Space, Alert } from 'antd';
import { systemApi } from '../services/systemApi';

const { Option } = Select;

const SimpleSystemTest: React.FC = () => {
  const [systems, setSystems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSystem, setSelectedSystem] = useState<number | undefined>();

  const loadSystems = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('开始加载系统数据...');
      const data = await systemApi.getSystems();
      console.log('系统数据加载成功:', data);
      
      setSystems(data);
      
      if (data.length === 0) {
        setError('没有获取到任何系统数据');
      }
    } catch (error) {
      console.error('加载系统数据失败:', error);
      setError(`加载失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSystems();
  }, []);

  return (
    <div style={{ padding: '20px', maxWidth: '600px' }}>
      <Card title="系统选择器简单测试">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button onClick={loadSystems} loading={loading}>
            重新加载系统
          </Button>
          
          {error && (
            <Alert message="错误" description={error} type="error" />
          )}
          
          <div>
            <h3>系统数量: {systems.length}</h3>
            <Select
              placeholder="请选择系统"
              value={selectedSystem}
              onChange={setSelectedSystem}
              loading={loading}
              style={{ width: '100%' }}
            >
              {systems.map(system => (
                <Option key={system.id} value={system.id}>
                  {system.name} (ID: {system.id})
                </Option>
              ))}
            </Select>
          </div>
          
          <div>
            <h4>原始数据:</h4>
            <pre style={{ background: '#f5f5f5', padding: '10px', fontSize: '12px' }}>
              {JSON.stringify(systems, null, 2)}
            </pre>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default SimpleSystemTest;