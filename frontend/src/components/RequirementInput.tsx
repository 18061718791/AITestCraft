import React, { useState } from 'react';
import { Input, Button, Card, Typography, Space, Alert } from 'antd';
import { PlayCircleOutlined } from '@ant-design/icons';
import { useAppContext } from '../contexts/AppContext';
import { useGeneratePoints } from '../hooks/useGeneratePoints';

const { Title, Paragraph } = Typography;
const { TextArea } = Input;

interface RequirementInputProps {
  onNext: () => void;
}

export const RequirementInput: React.FC<RequirementInputProps> = ({ onNext }) => {
  const { state, dispatch } = useAppContext();
  const { generatePoints, isGenerating } = useGeneratePoints();
  const [localRequirement, setLocalRequirement] = useState(state.requirement);

  const handleSubmit = async () => {
    await generatePoints(localRequirement);
    onNext();
  };

  return (
    <Card>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2}>步骤1：输入需求描述</Title>
          <Paragraph type="secondary">
            请输入您的软件需求描述，系统将基于该描述生成相应的测试点。
          </Paragraph>
        </div>

        {state.error && (
          <Alert
            message="错误"
            description={state.error}
            type="error"
            showIcon
            closable
            onClose={() => dispatch({ type: 'SET_ERROR', payload: undefined })}
          />
        )}

        <TextArea
          rows={6}
          placeholder="例如：我们需要一个用户登录功能，支持邮箱和密码登录，需要验证邮箱格式和密码强度..."
          value={localRequirement}
          onChange={(e) => setLocalRequirement(e.target.value)}
          disabled={isGenerating}
          maxLength={1000}
          showCount
        />

        <Button
          type="primary"
          size="large"
          icon={<PlayCircleOutlined />}
          onClick={handleSubmit}
          loading={isGenerating}
          disabled={!localRequirement.trim()}
          style={{ width: '100%' }}
        >
          {isGenerating ? '生成中...' : '生成测试点'}
        </Button>
      </Space>
    </Card>
  );
};