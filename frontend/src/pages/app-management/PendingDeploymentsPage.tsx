import React, { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Statistic,
  Row,
  Col,
  message,
  Empty,
  Spin,
  Typography,
  Select,
  Badge,
  Popover,
  Tag,
  Button,
  Tooltip
} from 'antd';
import {
  ClockCircleOutlined,
  ReloadOutlined,
  LinkOutlined,
  BuildOutlined,
  BranchesOutlined,
  UserOutlined,
  MessageOutlined,
  CheckCircleOutlined,
  RocketOutlined,
  InboxOutlined
} from '@ant-design/icons';
import '../../components/deployment/DeploymentTaskPopover.css';
import {
  getPendingTasksGroupedByApp,
  getTaskStats,
  updateTaskStatus,
  DirectoryGroup,
  TaskStats
} from '../../services/deployment/deploymentApi';
import { projectApi, Project } from '../../services/project/projectApi';
import socketService from '../../services/socket';

const { Title, Text } = Typography;
const { Option } = Select;

const PendingDeploymentsPage: React.FC = () => {
  const [directoryGroups, setDirectoryGroups] = useState<DirectoryGroup[]>([]);
  const [stats, setStats] = useState<TaskStats>({
    pending: 0,
    deploying: 0,
    completed: 0,
    failed: 0,
    ignored: 0
  });
  const [loading, setLoading] = useState(false);

  // 项目筛选
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // 加载项目列表
  const fetchProjects = async () => {
    try {
      const data = await projectApi.getProjects();
      setProjects(data);
    } catch (error) {
      console.error('获取项目列表失败:', error);
    }
  };

  const fetchPendingTasks = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getPendingTasksGroupedByApp(
        selectedProjectId || undefined
      );
      setDirectoryGroups(result);
    } catch (error) {
      message.error('获取待部署任务失败');
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await getTaskStats(
        selectedProjectId || undefined
      );
      setStats(data);
    } catch (error) {
      console.error('获取统计失败:', error);
    }
  }, [selectedProjectId]);

  const handleOpenJenkins = (jenkinsUrl?: string) => {
    if (jenkinsUrl) {
      window.open(jenkinsUrl, '_blank');
    } else {
      message.warning('该应用未配置Jenkins地址');
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchPendingTasks();
    fetchStats();

    // 每30秒刷新
    const interval = setInterval(() => {
      fetchPendingTasks();
      fetchStats();
    }, 30000);

    // 监听新的部署任务通知（使用全局连接，不重复建立）
    const setupSocketListeners = () => {
      try {
        // 监听新的部署任务通知 - 只刷新列表，不显示弹窗（全局弹窗已在 App.tsx 处理）
        socketService.onNewDeploymentTasks(() => {
          // 刷新任务列表和统计
          fetchPendingTasks();
          fetchStats();
        });

        // 监听任务状态更新
        socketService.onDeploymentTaskUpdate((data) => {
          message.info(`${data.appName} 状态已更新为：${data.status}`);
          fetchPendingTasks();
          fetchStats();
        });
      } catch (error) {
        console.error('WebSocket监听设置失败:', error);
      }
    };

    setupSocketListeners();

    return () => {
      clearInterval(interval);
      // 注意：不在页面卸载时断开连接，因为全局连接需要保持
      // socketService.disconnect();
    };
  }, [fetchPendingTasks, fetchStats]);

  const handleIgnoreAll = async (app: any) => {
    try {
      for (const task of app.tasks) {
        await updateTaskStatus(task.id, 'IGNORED', '当前用户');
      }
      message.success(`已忽略 ${app.appName} 的所有待部署任务`);
      fetchPendingTasks();
      fetchStats();
    } catch (error) {
      message.error('批量操作失败');
    }
  };

  const handleDeployAll = async (app: any) => {
    try {
      for (const task of app.tasks) {
        await updateTaskStatus(task.id, 'COMPLETED', '当前用户');
      }
      message.success(`已标记 ${app.appName} 的所有任务为部署完成`);
      fetchPendingTasks();
      fetchStats();
    } catch (error) {
      message.error('批量操作失败');
    }
  };

  // 渲染应用卡片
  const renderAppCard = (app: any) => {
    const taskCount = app.tasks.length;

    // 悬停内容 - 显示所有待部署请求（科技感风格）
    const hoverContent = (
      <div className="deployment-task-popover">
        {/* 扫描线效果 */}
        <div className="scan-line"></div>
        
        {/* 角落装饰 */}
        <div className="tech-corners">
          <div className="tech-corner tech-corner-tl"></div>
          <div className="tech-corner tech-corner-tr"></div>
          <div className="tech-corner tech-corner-bl"></div>
          <div className="tech-corner tech-corner-br"></div>
        </div>

        {/* 头部 */}
        <div className="popover-header">
          <div className="popover-icon">
            <RocketOutlined />
          </div>
          <div className="popover-title-section">
            <div className="popover-title">{app.appName}</div>
            <div className="popover-subtitle">{app.appCode}</div>
          </div>
        </div>

        {/* 任务列表 */}
        <div className="task-list-container">
          {app.tasks.length === 0 ? (
            <div className="empty-tasks">
              <InboxOutlined />
              <div>暂无待部署任务</div>
            </div>
          ) : (
            app.tasks.map((task: any, index: number) => (
              <div key={task.id} className="task-item" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="task-header">
                  <div className="task-tags">
                    <Tag className="branch-tag" icon={<BranchesOutlined />}>
                      {task.branch}
                    </Tag>
                    <Tag className="commit-tag">
                      {task.commitId?.substring(0, 7) || '------'}
                    </Tag>
                  </div>
                </div>
                <div className="task-meta">
                  {task.commitMessage && (
                    <div className="commit-message">
                      <MessageOutlined />
                      <span className="commit-message-text">{task.commitMessage}</span>
                    </div>
                  )}
                  {/* 重点标注提交人员 */}
                  <div className="author-info-highlight">
                    <div className="author-avatar">
                      <UserOutlined />
                    </div>
                    <div className="author-details">
                      <span className="author-label">提交者</span>
                      <span className="author-name-highlight">{task.commitAuthor || '未知'}</span>
                    </div>
                    <span className="time-separator">·</span>
                    <span className="task-time">{new Date(task.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 全局操作按钮 */}
        {app.tasks.length > 0 && (
          <div className="global-actions">
            <Button
              className="action-btn action-btn-ignore"
              size="small"
              onClick={() => handleIgnoreAll(app)}
            >
              全部忽略
            </Button>
            <Button
              className="action-btn action-btn-deploy"
              size="small"
              onClick={() => handleDeployAll(app)}
            >
              全部完成
            </Button>
          </div>
        )}
      </div>
    );

    return (
      <Popover
        key={app.appId}
        content={hoverContent}
        placement="right"
        trigger="hover"
        overlayStyle={{ padding: 0, maxWidth: 450 }}
        overlayInnerStyle={{ padding: 0 }}
      >
        <Card
          hoverable
          style={{
            width: 160,
            height: 160,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            position: 'relative',
            cursor: 'pointer'
          }}
          bodyStyle={{
            padding: 16,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {/* 待部署数量徽章 */}
          {taskCount > 0 && (
            <Badge
              count={taskCount}
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                backgroundColor: '#faad14'
              }}
            />
          )}
          
          {/* 应用图标 */}
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12
            }}
          >
            <BuildOutlined style={{ fontSize: 24, color: '#fff' }} />
          </div>
          
          {/* 应用名称 */}
          <Text
            strong
            style={{
              fontSize: 14,
              marginBottom: 4,
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
            title={app.appName}
          >
            {app.appName}
          </Text>
          
          {/* 应用编码 */}
          <Text type="secondary" style={{ fontSize: 12 }}>
            {app.appCode}
          </Text>
          
          {/* Jenkins按钮 */}
          <Tooltip title="打开Jenkins构建">
            <Button
              type="primary"
              size="small"
              icon={<LinkOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenJenkins(app.jenkinsUrl);
              }}
              disabled={!app.jenkinsUrl}
              style={{ marginTop: 8, fontWeight: 500, color: '#fff' }}
            >
              构建
            </Button>
          </Tooltip>
        </Card>
      </Popover>
    );
  };

  return (
    <div style={{ padding: 24 }}>
      {/* 头部 */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4}>待部署应用</Title>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* 项目筛选 */}
          <Select
            placeholder="选择项目"
            allowClear
            style={{ width: 200 }}
            value={selectedProjectId || undefined}
            onChange={(value) => setSelectedProjectId(value || '')}
          >
            {projects.map(project => (
              <Option key={project.id} value={project.id}>{project.name}</Option>
            ))}
          </Select>
          
          <ReloadOutlined
            style={{ fontSize: 18, cursor: 'pointer' }}
            onClick={() => {
              fetchPendingTasks();
              fetchStats();
            }}
            spin={loading}
          />
        </div>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card>
            <Statistic
              title="待部署"
              value={stats.pending}
              valueStyle={{ color: '#faad14' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card>
            <Statistic
              title="部署完成"
              value={stats.completed}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 按系统分组的待部署应用 */}
      <Spin spinning={loading}>
        {directoryGroups.length === 0 ? (
          <Card>
            <Empty description="暂无待部署应用" />
          </Card>
        ) : (
          directoryGroups.map((group) => (
            <Card
              key={group.directoryId}
              title={
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <BuildOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                  <Text strong>{group.directoryName}</Text>
                  <Badge
                    count={group.apps.reduce((sum, app) => sum + app.tasks.length, 0)}
                    style={{ marginLeft: 12, backgroundColor: '#faad14' }}
                  />
                </div>
              }
              style={{ marginBottom: 16 }}
            >
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 16
                }}
              >
                {group.apps.map((app) => renderAppCard(app))}
              </div>
            </Card>
          ))
        )}
      </Spin>
    </div>
  );
};

export default PendingDeploymentsPage;
