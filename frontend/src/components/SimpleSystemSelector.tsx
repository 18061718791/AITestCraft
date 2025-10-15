import React, { useState, useEffect } from 'react';
import { Select, Button, Space, Card } from 'antd';
import { systemApi } from '../services/systemApi';

const { Option } = Select;

const SimpleSystemSelector: React.FC = () => {
  const [systems, setSystems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSystem, setSelectedSystem] = useState<number | null>(null);

  const loadSystems = async () => {
    try {
      setLoading(true);
      const data = await systemApi.getSystems();
      setSystems(data);
    } catch (error) {
      console.error('加载系统失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSystems();
  }, []);

  return (
    <div style={{ padding: '20px', maxWidth: '600px' }}>
      <Card title="系统选择器测试">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button onClick={loadSystems} loading={loading}>
            重新加载系统
          </Button>
          
          <div>
            <span>系统数量: {systems.length}</span>
          </div>
          
          <Select
            placeholder="请选择系统"
            value={selectedSystem || undefined}
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
          
          {systems.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h4>系统列表:</h4>
              <ul>
                {systems.map(system => (
                  <li key={system.id}>
                    {system.name} - ID: {system.id}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Space>
      </Card>
    </div>
  );
};

export default SimpleSystemSelector;