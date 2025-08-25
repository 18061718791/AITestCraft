import React from 'react';
import { Card, Input, Button, Space, Alert, Typography, Divider } from 'antd';
import { PlayCircleOutlined } from '@ant-design/icons';
import { useGeneratePoints } from '../hooks/useGeneratePoints';
import { useAppContext } from '../contexts/AppContext';
import SystemModuleScenarioSelector from './SystemModuleScenarioSelector';
import { sanitizeRequirement } from '../utils/promptTemplate';

const { TextArea } = Input;
const { Title } = Typography;

interface RequirementInputProps {
  onNext?: () => void;
}

export const RequirementInput: React.FC<RequirementInputProps> = ({ onNext }) => {
  const { state, dispatch } = useAppContext();
  const { generatePoints, isGenerating } = useGeneratePoints();

  const handleGenerate = async () => {
    if (!state.requirement.trim()) {
      dispatch({ type: 'SET_ERROR', payload: '请输入需求描述' });
      return;
    }

    dispatch({ type: 'SET_ERROR', payload: null });
    await generatePoints(state.requirement);
    
    // generatePoints会自动处理状态更新和步骤切换
    onNext?.();
  };

  return (
    <Card title="步骤1：输入需求描述" style={{ width: '100%' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={4}>请选择测试范围</Title>
          <SystemModuleScenarioSelector />
        </div>

        <Divider />

        <div>
          <Title level={4}>请详细描述您的测试需求</Title>
          <TextArea
            rows={6}
            placeholder="例如：
用户登录功能需求：
1. 支持用户名/密码登录
2. 支持手机号验证码登录
3. 需要记住登录状态
4. 连续5次密码错误需要锁定账号15分钟
5. 支持找回密码功能"
            value={state.requirement}
            onChange={(e) => dispatch({ type: 'SET_REQUIREMENT', payload: sanitizeRequirement(e.target.value) })}
            maxLength={2000}
            showCount
          />
        </div>
        
        {state.error && (
          <Alert
            message="错误"
            description={state.error}
            type="error"
            showIcon
            closable
            onClose={() => dispatch({ type: 'SET_ERROR', payload: null })}
          />
        )}

        <Button
          type="primary"
          size="large"
          icon={<PlayCircleOutlined />}
          loading={isGenerating}
          onClick={handleGenerate}
          disabled={!state.requirement.trim()}
          style={{ width: '100%' }}
        >
          生成测试点
        </Button>
      </Space>
    </Card>
  );
};