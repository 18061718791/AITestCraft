import React from 'react';
import { Card, Button, Space, Tag, Typography } from 'antd';
import {
  CheckCircleOutlined,
  SyncOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  PauseCircleOutlined,
  GithubOutlined,
  BranchesOutlined,
  UserOutlined,
  MessageOutlined
} from '@ant-design/icons';
import { DeploymentTask } from '../../services/deployment/deploymentApi';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Text, Paragraph } = Typography;

interface Props {
  task: DeploymentTask;
  onStatusChange: (taskId: number, status: string) => void;
  showActions?: boolean;
}

const statusConfig = {
  PENDING: { color: 'warning', icon: <ClockCircleOutlined />, text: '待部署' },
  DEPLOYING: { color: 'processing', icon: <SyncOutlined spin />, text: '部署中' },
  COMPLETED: { color: 'success', icon: <CheckCircleOutlined />, text: '已完成' },
  FAILED: { color: 'error', icon: <CloseCircleOutlined />, text: '失败' },
  IGNORED: { color: 'default', icon: <PauseCircleOutlined />, text: '已忽略' }
};

export const DeploymentTaskCard: React.FC<Props> = ({ task, onStatusChange, showActions = true }) => {
  const status = statusConfig[task.status];
  const isPending = task.status === 'PENDING';

  return (
    <Card
      size="small"
      style={{ marginBottom: 12 }}
      actions={showActions && isPending ? [
        <Button
          type="primary"
          size="small"
          icon={<CheckCircleOutlined />}
          onClick={() => onStatusChange(task.id, 'COMPLETED')}
        >
          标记完成
        </Button>,
        <Button
          size="small"
          icon={<PauseCircleOutlined />}
          onClick={() => onStatusChange(task.id, 'IGNORED')}
        >
          忽略
        </Button>
      ] : undefined}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <Space style={{ marginBottom: 8 }}>
            <Text strong style={{ fontSize: 16 }}>
              <GithubOutlined /> {task.appName}
            </Text>
            <Tag color={status.color} icon={status.icon}>
              {status.text}
            </Tag>
          </Space>

          <Space style={{ marginBottom: 8 }} wrap>
            <Tag icon={<BranchesOutlined />}>{task.repository}</Tag>
            <Tag color="blue">{task.branch}</Tag>
            <Tag color="cyan">{task.commitId?.substring(0, 7) || '未知'}</Tag>
          </Space>

          <Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ marginBottom: 8 }}>
            <MessageOutlined /> {task.commitMessage}
          </Paragraph>

          <Space size="large">
            <Text type="secondary" style={{ fontSize: 12 }}>
              <UserOutlined /> {task.commitAuthor}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {dayjs(task.createdAt).fromNow()}
            </Text>
          </Space>

          {task.deployedBy && (
            <div style={{ marginTop: 8 }}>
              <Text type="success" style={{ fontSize: 12 }}>
                由 {task.deployedBy} 于 {dayjs(task.deployedAt).format('MM-DD HH:mm')} 完成部署
              </Text>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
