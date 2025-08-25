import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, Space, message, Spin } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons';
import { promptApi, PromptFile } from '../services/promptApi';

const { Title, Text } = Typography;

const PromptDetailPage: React.FC = () => {
  const { filename } = useParams<{ filename: string }>();
  const [prompt, setPrompt] = useState<PromptFile | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (filename) {
      fetchPrompt();
    }
  }, [filename]);

  const fetchPrompt = async () => {
    if (!filename) return;
    
    setLoading(true);
    try {
      const data = await promptApi.getPrompt(filename);
      setPrompt(data);
    } catch (error) {
      message.error('获取提示词内容失败');
      console.error('Error fetching prompt:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!prompt) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <p>提示词不存在</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/prompts')}
            >
              返回
            </Button>
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => navigate(`/prompts/${filename}/edit`)}
            >
              编辑
            </Button>
          </Space>
        </div>

        <div style={{ marginBottom: 24 }}>
          <Title level={2} style={{ marginBottom: 8 }}>
            {prompt.description}
          </Title>
          <Text type="secondary">
            文件: {prompt.filename}
          </Text>
        </div>

        <div>
          <Title level={4}>提示词内容</Title>
          <Card
            style={{ 
              backgroundColor: '#f5f5f5',
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace',
              fontSize: '14px',
              lineHeight: '1.6'
            }}
          >
            {prompt.content}
          </Card>
        </div>
      </Card>
    </div>
  );
};

export default PromptDetailPage;