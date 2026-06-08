import React from 'react';
import { Typography, Steps, Row, Col, Select, Tag, Space, Tooltip } from 'antd';
import { EyeOutlined, PictureOutlined } from '@ant-design/icons';
import { RequirementInput } from '../components/RequirementInput';
import { TestPointsSelector } from '../components/TestPointsSelector';
import { TestCasesSelector } from '../components/TestCasesSelector';
import ProcessingPanel from '../components/ProcessingPanel';
import { useAppContext } from '../contexts/AppContext';
import { useTheme } from '../contexts/ThemeContext';

const { Title, Paragraph } = Typography;
const { Option } = Select;

const steps = [
  { title: '需求输入', description: '输入测试需求' },
  { title: '测试点选择', description: '选择关键场景' },
  { title: '用例生成', description: '生成完整用例' },
];

const PROVIDER_OPTIONS = [
  { value: 'deepseek', label: 'DeepSeek', color: 'blue' },
  { value: 'volcano-coding', label: '火山引擎', color: 'orange' },
];

const PROVIDER_VISION_MODELS: Record<string, string[]> = {
  'deepseek': ['deepseek-v4-pro', 'deepseek-chat'],
  'volcano-coding': ['doubao-seed-code', 'kimi-k2.5', 'glm-4.7', 'deepseek-v3.2'],
};

const PROVIDER_DEFAULT_VISION_MODEL: Record<string, string> = {
  'deepseek': 'deepseek-chat',
  'volcano-coding': 'doubao-seed-code',
};

const DEEPSEEK_MODELS = [
  { value: 'deepseek-v4-flash', label: 'deepseek-v4-flash', vision: false },
  { value: 'deepseek-v4-pro', label: 'deepseek-v4-pro', vision: true },
  { value: 'deepseek-chat', label: 'deepseek-chat', vision: true },
  { value: 'deepseek-coder', label: 'deepseek-coder', vision: false },
];

const VOLCANO_MODELS = [
  { value: 'ark-code-latest', label: 'ark-code-latest', vision: false },
  { value: 'doubao-seed-code', label: 'doubao-seed-code', vision: true },
  { value: 'deepseek-v3.2', label: 'deepseek-v3.2', vision: true },
  { value: 'kimi-k2.5', label: 'kimi-k2.5', vision: true },
  { value: 'glm-4.7', label: 'glm-4.7', vision: true },
];

export const TestCaseAssistantPage: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const { isDark } = useTheme();

  const primaryColor = isDark ? '#00d4ff' : '#3b82f6';
  const hasImages = state.uploadedImages.length > 0;

  // 步骤1和步骤2时显示右侧处理面板
  const showProcessingPanel = state.currentStep === 1 || state.currentStep === 2;

  const handleProviderChange = (provider: string) => {
    dispatch({ type: 'SET_SELECTED_PROVIDER', payload: provider });
    if (hasImages) {
      const defaultVision = PROVIDER_DEFAULT_VISION_MODEL[provider];
      if (defaultVision) {
        dispatch({ type: 'SET_SELECTED_MODEL', payload: defaultVision });
        return;
      }
    }
    dispatch({ type: 'SET_SELECTED_MODEL', payload: '' });
  };

  const handleModelChange = (model: string) => {
    if (hasImages) {
      const visionModels = PROVIDER_VISION_MODELS[state.selectedProvider || 'deepseek'] || [];
      if (!visionModels.includes(model)) {
        const defaultVision = PROVIDER_DEFAULT_VISION_MODEL[state.selectedProvider || 'deepseek'] || visionModels[0];
        dispatch({ type: 'SET_SELECTED_MODEL', payload: defaultVision });
        return;
      }
    }
    dispatch({ type: 'SET_SELECTED_MODEL', payload: model });
  };

  const currentProvider = state.selectedProvider || 'deepseek';
  const currentModel = state.selectedModel;

  const getModelOptions = () => {
    const models = currentProvider === 'deepseek' ? DEEPSEEK_MODELS : VOLCANO_MODELS;
    if (hasImages) return models.filter((m) => m.vision);
    return models;
  };

  const renderStep = () => {
    switch (state.currentStep) {
      case 1: return <RequirementInput onNext={() => {}} />;
      case 2: return <TestPointsSelector onNext={() => {}} onBack={() => {}} />;
      case 3: return <TestCasesSelector onBack={() => {}} />;
      default: return <RequirementInput onNext={() => {}} />;
    }
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* ====== 简洁头部 ====== */}
      <div style={{
        flexShrink: 0,
        padding: '16px 20px 8px',
        textAlign: 'center',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute',
          top: 8,
          left: '20%',
          right: '20%',
          height: 1,
          background: `linear-gradient(90deg, transparent, ${primaryColor}40, ${primaryColor}, ${primaryColor}40, transparent)`,
        }} />

        <Title level={3} style={{
          margin: '0 0 4px',
          color: isDark ? '#f1f5f9' : '#0f172a',
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: 2,
          textShadow: isDark ? `0 0 16px ${primaryColor}30` : 'none',
        }}>
          AI 测试用例生成助手
        </Title>

        <Paragraph style={{
          marginBottom: 10,
          color: isDark ? '#475569' : '#9ca3af',
          fontSize: 12,
          letterSpacing: 1,
        }}>
          基于 AI 的智能测试用例生成工具 · 快速创建高质量测试用例
        </Paragraph>

        <Space size={12}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '3px 12px',
            borderRadius: 6,
            background: isDark ? 'rgba(0, 212, 255, 0.06)' : 'rgba(59, 130, 246, 0.04)',
            border: `1px solid ${primaryColor}20`,
          }}>
            <span style={{ fontSize: 11, color: isDark ? '#475569' : '#9ca3af', letterSpacing: 1 }}>Provider</span>
            <Select
              size="small"
              value={currentProvider}
              onChange={handleProviderChange}
              style={{ width: 120 }}
              variant="borderless"
              dropdownStyle={{ minWidth: 130 }}
            >
              {PROVIDER_OPTIONS.map((p) => (
                <Option key={p.value} value={p.value}>
                  <Tag color={p.color} style={{ margin: 0 }}>{p.label}</Tag>
                </Option>
              ))}
            </Select>
          </span>

          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '3px 12px',
            borderRadius: 6,
            background: isDark ? 'rgba(0, 212, 255, 0.06)' : 'rgba(59, 130, 246, 0.04)',
            border: `1px solid ${primaryColor}20`,
          }}>
            <span style={{ fontSize: 11, color: isDark ? '#475569' : '#9ca3af', letterSpacing: 1 }}>Model</span>
            <Select
              size="small"
              value={currentModel}
              onChange={handleModelChange}
              placeholder="选择模型"
              style={{ width: 170 }}
              allowClear={!hasImages}
              variant="borderless"
              dropdownStyle={{ minWidth: 180 }}
            >
              {getModelOptions().map((m) => (
                <Option key={m.value} value={m.value}>
                  <Space size={4}>
                    <span style={{ fontSize: 12 }}>{m.label}</span>
                    {m.vision && (
                      <Tooltip title="支持图片解析">
                        <EyeOutlined style={{ color: primaryColor, fontSize: 11 }} />
                      </Tooltip>
                    )}
                  </Space>
                </Option>
              ))}
            </Select>
          </span>

          {hasImages && (
            <Tag icon={<PictureOutlined />} color="blue" style={{ fontSize: 11, margin: 0 }}>
              {state.uploadedImages.length} 张图
            </Tag>
          )}
        </Space>
      </div>

      {/* ====== 步骤条 ====== */}
      <div style={{ flexShrink: 0, padding: '0 20px 8px' }}>
        <Row justify="center">
          <Col xs={24} sm={22} md={20} lg={18}>
            <Steps
              current={state.currentStep - 1}
              items={steps}
              size="small"
            />
          </Col>
        </Row>
      </div>

      {/* ====== 主体区域：左右布局 ====== */}
      <div style={{
        flex: 1,
        minHeight: 0,
        margin: '0 16px 16px',
        display: 'flex',
        gap: 12,
        overflow: 'hidden',
      }}>
        {/* 左侧：步骤内容 */}
        <div style={{
          flex: showProcessingPanel ? 2 : 1,
          minWidth: 0,
          background: isDark ? 'rgba(15, 23, 42, 0.55)' : 'rgba(255, 255, 255, 0.6)',
          backdropFilter: 'blur(8px)',
          border: `1px solid ${isDark ? 'rgba(0, 212, 255, 0.12)' : 'rgba(59, 130, 246, 0.1)'}`,
          borderRadius: 12,
          boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.35)' : '0 4px 20px rgba(0, 0, 0, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}>
          <CornerMarkers primaryColor={primaryColor} />
          <div style={{ flex: 1, overflow: 'auto', padding: '4px 8px' }}>
            {renderStep()}
          </div>
        </div>

        {/* 右侧：处理日志面板（仅步骤1和2显示） */}
        {showProcessingPanel && (
          <div style={{
            width: 280,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            <ProcessingPanel visible={true} />
          </div>
        )}
      </div>
    </div>
  );
};

function CornerMarkers({ primaryColor }: { primaryColor: string }) {
  const cornerStyle: React.CSSProperties = {
    position: 'absolute',
    width: 10,
    height: 10,
    borderColor: primaryColor,
    borderStyle: 'solid',
    opacity: 0.4,
    pointerEvents: 'none',
  };
  return (
    <>
      <div style={{ ...cornerStyle, top: -1, left: -1, borderWidth: '1px 0 0 1px', borderRadius: '4px 0 0 0' }} />
      <div style={{ ...cornerStyle, top: -1, right: -1, borderWidth: '1px 1px 0 0', borderRadius: '0 4px 0 0' }} />
      <div style={{ ...cornerStyle, bottom: -1, left: -1, borderWidth: '0 0 1px 1px', borderRadius: '0 0 0 4px' }} />
      <div style={{ ...cornerStyle, bottom: -1, right: -1, borderWidth: '0 1px 1px 0', borderRadius: '0 0 4px 0' }} />
    </>
  );
}
