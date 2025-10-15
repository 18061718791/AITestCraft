import React, { useState } from 'react';
import { Card, Button, Space, Typography, Alert } from 'antd';
import axios from 'axios';

const { Text, Paragraph } = Typography;

const ApiFormatTest: React.FC = () => {
  const [rawResponse, setRawResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testApiDirectly = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 使用axios直接调用，绕过所有中间层
      const response = await axios.get('http://localhost:9000/api/system/systems');
      
      setRawResponse({
        status: response.status,
        headers: response.headers,
        data: response.data,
        fullResponse: response
      });
      
    } catch (error: any) {
      setError(`API调用失败: ${error.message || '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  const testApiWithSystemApi = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 动态导入systemApi
      const { systemApi } = await import('../services/systemApi');
      const data = await systemApi.getSystems();
      
      setRawResponse({
        source: 'systemApi',
        data: data
      });
      
    } catch (error: any) {
      setError(`systemApi调用失败: ${error.message || '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px' }}>
      <Card title="API格式测试" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space>
            <Button onClick={testApiDirectly} loading={loading}>
              直接调用API
            </Button>
            <Button onClick={testApiWithSystemApi} loading={loading}>
              使用systemApi
            </Button>
          </Space>
          
          {error && (
            <Alert message="错误" description={error} type="error" />
          )}
          
          {rawResponse && (
            <div>
              <h4>响应详情:</h4>
              <Paragraph>
                <Text strong>来源:</Text> {rawResponse.source || '直接API调用'}
              </Paragraph>
              
              {rawResponse.status && (
                <Paragraph>
                  <Text strong>状态码:</Text> {rawResponse.status}
                </Paragraph>
              )}
              
              <Paragraph>
                <Text strong>数据:</Text>
              </Paragraph>
              <pre style={{ 
                background: '#f5f5f5', 
                padding: '10px', 
                fontSize: '12px', 
                maxHeight: '400px', 
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all'
              }}>
                {JSON.stringify(rawResponse.data, null, 2)}
              </pre>
              
              <Paragraph>
                <Text strong>数据类型:</Text> {Array.isArray(rawResponse.data) ? '数组' : typeof rawResponse.data}
              </Paragraph>
              
              {Array.isArray(rawResponse.data) && (
                <Paragraph>
                  <Text strong>数组长度:</Text> {rawResponse.data.length}
                </Paragraph>
              )}
            </div>
          )}
        </Space>
      </Card>
    </div>
  );
};

export default ApiFormatTest;