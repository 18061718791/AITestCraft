import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, Space, message, Spin, Input } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { promptApi, PromptFile } from '../services/promptApi';

const { TextArea } = Input;
const { Title, Text } = Typography;

const PromptEditPage: React.FC = () => {
  const { filename } = useParams<{ filename: string }>();
  const [prompt, setPrompt] = useState<PromptFile | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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
      setContent(data.content);
    } catch (error) {
      message.error('获取提示词内容失败');
      console.error('Error fetching prompt:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!filename) return;
    
    setSaving(true);
    try {
      await promptApi.updatePrompt(filename, content);
      message.success('保存成功');
      navigate(`/prompts/${filename}`);
    } catch (error) {
      message.error('保存失败');
      console.error('Error saving prompt:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (content !== prompt?.content) {
      if (window.confirm('有未保存的更改，确定要离开吗？')) {
        navigate(`/prompts/${filename}`);
      }
    } else {
      navigate(`/prompts/${filename}`);
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
              onClick={handleCancel}
            >
              取消
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={handleSave}
            >
              保存
            </Button>
          </Space>
        </div>

        <div style={{ marginBottom: 24 }}>
          <Title level={2} style={{ marginBottom: 8 }}>
            编辑提示词
          </Title>
          <Text type="secondary">
            文件: {prompt.filename} - {prompt.description}
          </Text>
        </div>

        <div>
          <Title level={4}>提示词内容</Title>
          <TextArea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={20}
            style={{ 
              fontFamily: 'monospace',
              fontSize: '14px',
              lineHeight: '1.6'
            }}
            placeholder="请输入提示词内容..."
          />
        </div>
      </Card>
    </div>
  );
};

export default PromptEditPage;