import React, { useState, useEffect } from 'react';
import { Card, Select, Button, Space, Alert } from 'antd';
import axios from 'axios';

const { Option } = Select;

const DirectApiTest: React.FC = () => {
  const [systems, setSystems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSystem, setSelectedSystem] = useState<number | undefined>();
  const [apiUrl, setApiUrl] = useState('');

  const testApi = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const url = import.meta.env.VITE_API_URL || 'http://localhost:9000';
      setApiUrl(url);
      
      console.log('使用API URL:', url);
      
      const response = await axios.get(`${url}/api/system/systems`, {
        timeout: 5000,
        headers: {
          'Accept': 'application/json',
        }
      });
      
      console.log('API响应:', response);
      console.log('响应数据:', response.data);
      
      if (response.data.success) {
        setSystems(response.data.data || []);
      } else {
        setError('API返回错误: ' + (response.data.error?.message || '未知错误'));
      }
    } catch (error: any) {
      console.error('API调用失败:', error);
      setError(`API调用失败: ${error.message || '网络错误'}`);
      
      if (error.response) {
        console.error('响应状态:', error.response.status);
        console.error('响应数据:', error.response.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testApi();
  }, []);

  return (
    <div style={{ padding: '20px', maxWidth: '600px' }}>
      <Card title="直接API测试">
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>API URL: {apiUrl}</div>
          
          <Button onClick={testApi} loading={loading}>
            重新测试API
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
            <pre style={{ background: '#f5f5f5', padding: '10px', fontSize: '12px', maxHeight: '300px', overflow: 'auto' }}>
              {JSON.stringify(systems, null, 2)}
            </pre>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default DirectApiTest;