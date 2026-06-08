import React, { useState, useEffect, useRef } from 'react';
import { Card, Input, Button, Space, Alert, Typography, Divider, Tabs, message, Tooltip } from 'antd';
import { FileTextOutlined, EditOutlined, SendOutlined } from '@ant-design/icons';
import { useGeneratePoints } from '../hooks/useGeneratePoints';
import { useProcessingLogs } from '../hooks/useProcessingLogs';
import { useAppContext } from '../contexts/AppContext';
import { useTheme } from '../contexts/ThemeContext';
import SystemModuleScenarioSelector from './SystemModuleScenarioSelector';
import DocumentUploader from './documentuploader';
import ChapterTree from './chaptertree';
import ImageUploader from './ImageUploader';
import { sanitizeRequirement } from '../utils/promptTemplate';
import { documentApi } from '../services/documentapi';
import socketService from '../services/socket';
import { v4 as uuidv4 } from 'uuid';

const { TextArea } = Input;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

const PROVIDER_VISION_MODELS: Record<string, string[]> = {
  'deepseek': ['deepseek-v4-pro', 'deepseek-chat'],
  'volcano-coding': ['doubao-seed-code', 'kimi-k2.5', 'glm-4.7', 'deepseek-v3.2'],
};

const PROVIDER_DEFAULT_VISION_MODEL: Record<string, string> = {
  'deepseek': 'deepseek-chat',
  'volcano-coding': 'doubao-seed-code',
};

interface RequirementInputProps {
  onNext?: () => void;
}

export const RequirementInput: React.FC<RequirementInputProps> = ({ onNext }) => {
  const { state, dispatch } = useAppContext();
  const { isDark } = useTheme();
  const { generatePoints, isGenerating } = useGeneratePoints();
  const processing = useProcessingLogs();
  const [activeTab, setActiveTab] = useState<string>('text');
  const [documentChapters, setDocumentChapters] = useState<any[]>([]);
  const textareaRef = useRef<any>(null);

  const primaryColor = isDark ? '#00d4ff' : '#3b82f6';

  const handleImagesChange = (count: number) => {
    if (count > 0 && state.selectedProvider && state.selectedModel) {
      const visionModels = PROVIDER_VISION_MODELS[state.selectedProvider] || [];
      if (visionModels.length > 0 && !visionModels.includes(state.selectedModel)) {
        const defaultVision = PROVIDER_DEFAULT_VISION_MODEL[state.selectedProvider] || visionModels[0];
        dispatch({ type: 'SET_SELECTED_MODEL', payload: defaultVision });
        message.info(`已上传图片，模型已自动切换至支持图片解析的「${defaultVision}」`, 3);
      }
    }
  };

  const handleGenerateFromText = async () => {
    if (!state.requirement.trim() && state.uploadedImages.length === 0) {
      dispatch({ type: 'SET_ERROR', payload: '请输入需求描述或上传图片' });
      return;
    }
    dispatch({ type: 'SET_ERROR', payload: null });
    const images = state.uploadedImages.map((img) => ({
      base64: img.base64,
      mimeType: img.mimeType,
      fileName: img.fileName,
    }));
    await generatePoints(state.requirement, images);
    onNext?.();
  };

  // 处理键盘事件：Enter换行，Ctrl+Enter提交
  const handleTextAreaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (!isGenerating && (state.requirement.trim() || state.uploadedImages.length > 0)) {
        handleGenerateFromText();
      }
    }
    // 普通Enter键默认行为是换行，不做处理
  };

  const handleGenerateFromDocument = async () => {
    if (!state.currentDocument) {
      processing.failProcessing('请先上传文档');
      dispatch({ type: 'SET_ERROR', payload: '请先上传文档' });
      return;
    }
    if (state.parseMode === 'chapters' && state.selectedChapters.length === 0) {
      processing.failProcessing('请至少选择一个章节');
      dispatch({ type: 'SET_ERROR', payload: '请至少选择一个章节' });
      return;
    }
    processing.startProcessing('文档解析生成测试点');
        processing.addLog('info', `文档：${state.currentDocument.filename || '未命名'}`);
    processing.addLog('info', `解析模式：${state.parseMode === 'chapters' ? '指定章节' : '全文解析'}`);
    dispatch({ type: 'SET_ERROR', payload: null });
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const sessionId = state.sessionId || uuidv4();
      if (!state.sessionId) {
        dispatch({ type: 'SET_SESSION_ID', payload: sessionId });
      }
      const result = await documentApi.generatePoints({
        documentId: state.currentDocument.documentId,
        chapterIds: state.parseMode === 'chapters' ? state.selectedChapters : undefined,
        parseMode: state.parseMode,
        sessionId,
        system: state.selectedSystem?.name,
        module: state.selectedModule?.name,
        scenario: state.selectedScenario?.name,
        provider: state.selectedProvider,
        model: state.selectedModel,
      });

      if (result.success && result.data) {
        const taskId = result.data.taskId;
        dispatch({ type: 'SET_TASK_ID', payload: taskId });
        processing.addLog('info', '文档解析任务已提交', `TaskId: ${taskId}`);
        processing.updateProgress('generating', 30, '正在解析文档并生成测试点...');

        message.info('正在生成测试点，请稍候...');

        let attempts = 0;
        const maxAttempts = 60;
        const pollInterval = 2000;

        const pollTaskStatus = async (): Promise<boolean> => {
          try {
            const statusResponse = await fetch(`/api/test/task/${taskId}`);
            const statusData = await statusResponse.json();
            if (statusData.success && statusData.data) {
              const task = statusData.data;
              if (task.status === 'completed') {
                if (task.data?.testPoints) {
                  processing.completeProcessing('文档解析测试点生成完成', task.data.testPoints.length);
                  dispatch({ type: 'SET_TEST_POINTS', payload: task.data.testPoints });
                }
                return true;
              } else if (task.status === 'failed') {
                processing.failProcessing(task.error || '生成测试点失败');
                dispatch({ type: 'SET_ERROR', payload: task.error || '生成测试点失败' });
                return false;
              }
            }
            return false;
          } catch (error) {
            console.error('Poll task status error:', error);
            return false;
          }
        };

        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          const isComplete = await pollTaskStatus();
          if (isComplete) {
            dispatch({ type: 'SET_CURRENT_STEP', payload: 2 });
            onNext?.();
            message.success('测试点生成完成！');
            return;
          }
          attempts++;
        }
        processing.failProcessing('生成测试点超时，请稍后刷新查看结果');
        dispatch({ type: 'SET_ERROR', payload: '生成测试点超时，请稍后刷新查看结果' });
      } else {
        processing.failProcessing(result.error || '生成测试点失败');
        dispatch({ type: 'SET_ERROR', payload: result.error || '生成测试点失败' });
      }
    } catch (error) {
      processing.failProcessing('生成测试点时发生错误');
      dispatch({ type: 'SET_ERROR', payload: '生成测试点时发生错误' });
      console.error('Generate from document error:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  const handleUploadSuccess = (_documentId: string, chapters: any[]) => {
    setDocumentChapters(chapters);
    message.success('文档上传成功，已解析章节结构');
  };

  // 监听处理日志事件（用于文档解析日志）
  useEffect(() => {
    // 确保有sessionId
    let currentSessionId = state.sessionId;
    if (!currentSessionId) {
      currentSessionId = uuidv4();
      dispatch({ type: 'SET_SESSION_ID', payload: currentSessionId });
    }

    // 建立socket连接
    socketService.ensureConnected(currentSessionId).catch(() => {
      // 连接失败不阻断流程
    });

    // 监听详细处理日志
    socketService.onProcessingLog((data) => {
      processing.addLog(data.level, data.message, data.details);
    });

    return () => {
      // 组件卸载时不需要断开连接，因为其他组件可能还在使用
    };
  }, []);

  return (
    <Card
      title={
        <span style={{ color: isDark ? '#f1f5f9' : 'inherit' }}>
          步骤 1：输入需求描述
        </span>
      }
      style={{
        width: '100%',
        height: '100%',
        background: isDark ? 'transparent' : undefined,
        border: 'none',
        boxShadow: 'none',
      }}
      bodyStyle={{ height: 'calc(100% - 57px)', overflow: 'auto', padding: '16px 12px' }}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div>
          <Title level={5} style={{ marginBottom: 12, fontSize: 15, color: isDark ? '#e2e8f0' : '#1e293b' }}>
            请选择测试范围
          </Title>
          <SystemModuleScenarioSelector />
        </div>

        <Divider style={{ margin: '8px 0', borderColor: isDark ? '#334155' : undefined }} />

        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          type="card"
          size="small"
        >
          <TabPane
            tab={
              <span>
                <EditOutlined style={{ marginRight: 4 }} />
                文本输入
              </span>
            }
            key="text"
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Title level={5} style={{ margin: 0, fontSize: 15, color: isDark ? '#e2e8f0' : '#1e293b' }}>
                  请详细描述您的测试需求
                </Title>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <span style={{ opacity: 0.7 }}>按 </span>
                  <kbd style={{
                    background: isDark ? '#334155' : '#e2e8f0',
                    padding: '2px 6px',
                    borderRadius: 4,
                    fontSize: 11,
                    fontFamily: 'monospace',
                  }}>Enter</kbd>
                  <span style={{ opacity: 0.7 }}> 换行，</span>
                  <kbd style={{
                    background: isDark ? '#334155' : '#e2e8f0',
                    padding: '2px 6px',
                    borderRadius: 4,
                    fontSize: 11,
                    fontFamily: 'monospace',
                  }}>Ctrl</kbd>
                  <span style={{ opacity: 0.7 }}> + </span>
                  <kbd style={{
                    background: isDark ? '#334155' : '#e2e8f0',
                    padding: '2px 6px',
                    borderRadius: 4,
                    fontSize: 11,
                    fontFamily: 'monospace',
                  }}>Enter</kbd>
                  <span style={{ opacity: 0.7 }}> 提交</span>
                </Text>
              </div>
              <TextArea
                ref={textareaRef}
                rows={8}
                placeholder={"例如：\n用户登录功能需求：\n1. 支持用户名/密码登录\n2. 支持手机号验证码登录\n3. 需要记住登录状态\n4. 连续5次密码错误需要锁定账号15分钟\n5. 支持找回密码功能\n\n提示：按 Enter 键换行，按 Ctrl+Enter 快速生成测试点"}
                value={state.requirement}
                onChange={(e) => dispatch({ type: 'SET_REQUIREMENT', payload: sanitizeRequirement(e.target.value) })}
                onKeyDown={handleTextAreaKeyDown}
                maxLength={2000}
                showCount
                style={{
                  resize: 'vertical',
                  minHeight: 120,
                }}
              />
            </div>

            <div style={{ marginTop: 16 }}>
              <ImageUploader onImagesChange={handleImagesChange} />
            </div>

            {state.uploadedImages.length > 0 && state.selectedModel && state.selectedProvider && (
              (() => {
                const visionModels = PROVIDER_VISION_MODELS[state.selectedProvider] || [];
                const isVisionModel = visionModels.includes(state.selectedModel);
                return !isVisionModel ? (
                  <Alert
                    message="模型提示"
                    description={`当前模型「${state.selectedModel}」不支持图片解析，请切换到视觉模型：${visionModels.join('、')}`}
                    type="warning"
                    showIcon
                    style={{ marginTop: 8 }}
                  />
                ) : null;
              })()
            )}

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16, marginBottom: 12 }}>
              <Tooltip
                title={!state.requirement.trim() && state.uploadedImages.length === 0 ? '请输入需求描述或上传图片' : 'Ctrl + Enter 快捷提交'}
                placement="top"
              >
                <Button
                  type="primary"
                  size="large"
                  icon={<SendOutlined />}
                  loading={isGenerating}
                  onClick={handleGenerateFromText}
                  disabled={!state.requirement.trim() && state.uploadedImages.length === 0}
                  style={{
                    width: 320,
                    height: 44,
                    fontSize: 15,
                    fontWeight: 600,
                    borderRadius: 10,
                    boxShadow: isDark
                      ? `0 0 20px ${primaryColor}40`
                      : `0 4px 14px rgba(59, 130, 246, 0.3)`,
                  }}
                >
                  生成测试点
                </Button>
              </Tooltip>
            </div>
          </TabPane>

          <TabPane
            tab={
              <span>
                <FileTextOutlined style={{ marginRight: 4 }} />
                文档解析
              </span>
            }
            key="document"
          >
            <DocumentUploader onUploadSuccess={handleUploadSuccess} />

            {state.currentDocument && (
              <ChapterTree
                chapters={documentChapters}
                onGeneratePoints={handleGenerateFromDocument}
                isGenerating={isGenerating || state.isLoading}
              />
            )}

            {!state.currentDocument && (
              <Alert
                message="提示"
                description="上传需求文档后，系统将自动解析文档结构，您可以选择全文解析或指定章节生成测试点。"
                type="info"
                showIcon
                style={{ marginTop: 12 }}
              />
            )}
          </TabPane>
        </Tabs>

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
      </Space>
    </Card>
  );
};
