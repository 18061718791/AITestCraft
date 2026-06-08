import React, { useRef, useEffect } from 'react';
import { Card, Tag, Progress, Space, Typography, Empty, Badge } from 'antd';
import {
  CheckCircleOutlined,
  SyncOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useAppContext } from '../contexts/AppContext';
import { useTheme } from '../contexts/ThemeContext';
import { ProcessingLog, ProcessStage } from '../types/processing';

const { Text } = Typography;

interface ProcessingPanelProps {
  visible: boolean;
}

const STAGE_CONFIG: Record<ProcessStage, { label: string; color: string; icon: React.ReactNode }> = {
  idle: { label: '等待中', color: 'default', icon: <ClockCircleOutlined /> },
  connecting: { label: '连接中', color: 'processing', icon: <SyncOutlined spin /> },
  analyzing: { label: '分析中', color: 'processing', icon: <SyncOutlined spin /> },
  generating: { label: '生成中', color: 'processing', icon: <SyncOutlined spin /> },
  completed: { label: '已完成', color: 'success', icon: <CheckCircleOutlined /> },
  failed: { label: '处理失败', color: 'error', icon: <CloseCircleOutlined /> },
};

const LOG_ICON: Record<ProcessingLog['level'], React.ReactNode> = {
  info: <InfoCircleOutlined />,
  success: <CheckCircleOutlined />,
  warning: <ExclamationCircleOutlined />,
  error: <CloseCircleOutlined />,
};

const LOG_COLOR: Record<ProcessingLog['level'], string> = {
  info: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
};

export const ProcessingPanel: React.FC<ProcessingPanelProps> = ({ visible }) => {
  const { state } = useAppContext();
  const { isDark } = useTheme();
  const logsEndRef = useRef<HTMLDivElement>(null);
  const { processingLogs: logs, processingStatus: status } = state;

  const primaryColor = isDark ? '#00d4ff' : '#3b82f6';
  const stageConfig = STAGE_CONFIG[status.stage];

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (!visible) return null;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        overflow: 'hidden',
      }}
    >
      {/* 状态卡片 */}
      <Card
        size="small"
        style={{
          background: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.7)',
          border: `1px solid ${isDark ? 'rgba(0, 212, 255, 0.15)' : 'rgba(59, 130, 246, 0.1)'}`,
          flexShrink: 0,
        }}
        bodyStyle={{ padding: '12px 16px' }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={10}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Space>
              <Badge status={status.stage === 'failed' ? 'error' : status.stage === 'completed' ? 'success' : 'processing'} />
              <Text strong style={{ color: isDark ? '#f1f5f9' : '#0f172a', fontSize: 14 }}>
                {stageConfig.label}
              </Text>
            </Space>
            <Tag color={stageConfig.color} icon={stageConfig.icon} style={{ fontSize: 11 }}>
              {stageConfig.label}
            </Tag>
          </div>

          <Text style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }}>
            {status.currentStep || '准备就绪'}
          </Text>

          {status.stage !== 'idle' && status.stage !== 'completed' && status.stage !== 'failed' && (
            <Progress
              percent={status.progress}
              status="active"
              size="small"
              strokeColor={primaryColor}
              trailColor={isDark ? '#334155' : '#e2e8f0'}
              showInfo={false}
            />
          )}
        </Space>
      </Card>

      {/* 日志列表 */}
      <Card
        size="small"
        title={
          <span style={{ color: isDark ? '#e2e8f0' : '#1e293b', fontSize: 13 }}>
            处理日志 {logs.length > 0 && <span style={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: 11 }}>({logs.length})</span>}
          </span>
        }
        style={{
          flex: 1,
          minHeight: 0,
          background: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.7)',
          border: `1px solid ${isDark ? 'rgba(0, 212, 255, 0.15)' : 'rgba(59, 130, 246, 0.1)'}`,
          display: 'flex',
          flexDirection: 'column',
        }}
        bodyStyle={{
          padding: '8px 12px',
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {logs.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span style={{ color: isDark ? '#475569' : '#94a3b8', fontSize: 12 }}>
                暂无处理日志
              </span>
            }
            style={{ margin: 'auto' }}
          />
        ) : (
          <div style={{ paddingTop: 4 }}>
            {logs.map((log) => (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  paddingBottom: 10,
                  borderBottom: `1px solid ${isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(226, 232, 240, 0.6)'}`,
                  marginBottom: 10,
                }}
              >
                {/* 图标 */}
                <span style={{
                  color: LOG_COLOR[log.level],
                  fontSize: 12,
                  marginTop: 2,
                  flexShrink: 0,
                }}>
                  {LOG_ICON[log.level]}
                </span>
                {/* 内容 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 2,
                  }}>
                    <Text style={{
                      color: isDark ? '#e2e8f0' : '#334155',
                      fontSize: 12,
                      lineHeight: 1.5,
                      fontWeight: 500,
                    }}>
                      {log.message}
                    </Text>
                    <span style={{
                      color: isDark ? '#475569' : '#9ca3af',
                      fontSize: 10,
                      fontFamily: 'monospace',
                      flexShrink: 0,
                    }}>
                      {log.timestamp}
                    </span>
                  </div>
                  {log.details && (
                    <div style={{
                      marginTop: 4,
                      padding: '4px 8px',
                      background: isDark ? 'rgba(0, 0, 0, 0.2)' : '#f8fafc',
                      borderRadius: 4,
                      fontSize: 11,
                      color: isDark ? '#94a3b8' : '#64748b',
                      lineHeight: 1.5,
                      wordBreak: 'break-all' as const,
                    }}>
                      {log.details}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </Card>
    </div>
  );
};

export default ProcessingPanel;
