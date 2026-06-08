import React, { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Modal,
  List,
  Empty,
  Spin,
  Typography,
  Select,
  Space,
  Tooltip
} from 'antd';
import {
  ReloadOutlined,
  HistoryOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  StopOutlined,
  LinkOutlined,
  BuildOutlined,
  BranchesOutlined,
  UserOutlined,
  MessageOutlined,
  DeploymentUnitOutlined
} from '@ant-design/icons';
import {
  getAppDeploymentList,
  getAppDeploymentHistory,
  AppDeploymentInfo,
  DeploymentTask
} from '../../services/deployment/deploymentApi';
import { projectApi, Project } from '../../services/project/projectApi';
import '../../components/deployment/DeploymentTaskPopover.css';
import './DeploymentHistoryPage.css';

const { Title, Text } = Typography;
const { Option } = Select;

const DeploymentHistoryPage: React.FC = () => {
  const [apps, setApps] = useState<AppDeploymentInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  // 项目筛选
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // 历史记录弹窗
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [selectedApp, setSelectedApp] = useState<AppDeploymentInfo | null>(null);
  const [historyTasks, setHistoryTasks] = useState<DeploymentTask[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPagination, setHistoryPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  // 加载项目列表
  const fetchProjects = async () => {
    try {
      const data = await projectApi.getProjects();
      setProjects(data);
    } catch (error) {
      console.error('获取项目列表失败:', error);
    }
  };

  const fetchApps = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const result = await getAppDeploymentList({
        projectId: selectedProjectId || undefined,
        page,
        pageSize: pagination.pageSize
      });
      setApps(result.items);
      setPagination(prev => ({
        ...prev,
        current: page,
        total: result.total
      }));
    } catch (error) {
      console.error('获取应用列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId, pagination.pageSize]);

  const fetchHistory = async (appId: number, page = 1) => {
    setHistoryLoading(true);
    try {
      const result = await getAppDeploymentHistory(appId, {
        page,
        pageSize: historyPagination.pageSize
      });
      setHistoryTasks(result.items);
      setHistoryPagination(prev => ({
        ...prev,
        current: page,
        total: result.total
      }));
    } catch (error) {
      console.error('获取部署历史失败:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleOpenHistory = (app: AppDeploymentInfo) => {
    setSelectedApp(app);
    setHistoryModalVisible(true);
    fetchHistory(app.id, 1);
  };

  const handleOpenJenkins = (jenkinsUrl?: string) => {
    if (jenkinsUrl) {
      window.open(jenkinsUrl, '_blank');
    }
  };

  const getStatusTag = (status?: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Tag color="success" icon={<CheckCircleOutlined />}>已完成</Tag>;
      case 'FAILED':
        return <Tag color="error" icon={<CloseCircleOutlined />}>失败</Tag>;
      case 'IGNORED':
        return <Tag color="default" icon={<StopOutlined />}>已忽略</Tag>;
      default:
        return <Tag color="default">从未部署</Tag>;
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'FAILED':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'IGNORED':
        return <StopOutlined style={{ color: '#8c8c8c' }} />;
      default:
        return <ClockCircleOutlined style={{ color: '#bfbfbf' }} />;
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchApps(1);
  }, [fetchApps, selectedProjectId]);

  const columns = [
    {
      title: '应用名称',
      dataIndex: 'appName',
      key: 'appName',
      render: (text: string, record: AppDeploymentInfo) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{record.appCode}</Text>
        </div>
      )
    },
    {
      title: '所属系统',
      key: 'directory',
      render: (_: any, record: AppDeploymentInfo) => (
        <span>{record.directoryName || '-'}</span>
      )
    },
    {
      title: 'Git仓库',
      dataIndex: 'repositoryName',
      key: 'repositoryName',
    },
    {
      title: '最新部署时间',
      key: 'latestDeployment',
      render: (_: any, record: AppDeploymentInfo) => {
        if (record.latestDeployment) {
          return (
            <div>
              <div>{new Date(record.latestDeployment.deployedAt).toLocaleString()}</div>
              <div>{getStatusTag(record.latestDeployment.status)}</div>
            </div>
          );
        }
        return <Text type="secondary">从未部署</Text>;
      }
    },
    {
      title: 'Jenkins',
      key: 'jenkins',
      render: (_: any, record: AppDeploymentInfo) => (
        record.jenkinsUrl ? (
          <Tag color="green" icon={<LinkOutlined />}>已配置</Tag>
        ) : (
          <Tag color="default">未配置</Tag>
        )
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: AppDeploymentInfo) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<HistoryOutlined />}
            onClick={() => handleOpenHistory(record)}
          >
            查看历史
          </Button>
          <Tooltip title="打开Jenkins">
            <Button
              size="small"
              icon={<LinkOutlined />}
              onClick={() => handleOpenJenkins(record.jenkinsUrl)}
              disabled={!record.jenkinsUrl}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* 头部 */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4}>部署应用历史</Title>
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
            onClick={() => fetchApps(pagination.current)}
            spin={loading}
          />
        </div>
      </div>

      {/* 应用列表 */}
      <Card>
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={apps}
            rowKey="id"
            pagination={{
              ...pagination,
              onChange: (page) => fetchApps(page),
              showSizeChanger: false
            }}
            locale={{
              emptyText: <Empty description="暂无应用数据" />
            }}
            rowClassName={() => 'app-history-row'}
          />
        </Spin>
      </Card>

      {/* 历史记录弹窗 */}
      <Modal
        title={
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 0',
            position: 'relative'
          }}>
            {/* 左侧：动态扫描线效果 */}
            <div style={{
              position: 'absolute',
              left: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              width: '3px',
              height: '40px',
              background: 'linear-gradient(180deg, transparent, var(--primary-color, #00d4ff), transparent)',
              animation: 'scanLine 2s linear infinite'
            }} />
            
            {/* 主标题区域 */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '16px',
              marginLeft: '16px'
            }}>
              {/* 圆形图标容器 */}
              <div style={{
                width: '44px',
                height: '44px',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {/* 外圆环 */}
                <svg width="44" height="44" viewBox="0 0 44 44" style={{ position: 'absolute' }}>
                  <circle
                    cx="22"
                    cy="22"
                    r="20"
                    fill="none"
                    stroke="url(#circleGradientHistory)"
                    strokeWidth="2"
                    style={{ filter: 'drop-shadow(0 0 6px rgba(0, 212, 255, 0.6))' }}
                  />
                  <defs>
                    <linearGradient id="circleGradientHistory" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="var(--primary-color, #00d4ff)" />
                      <stop offset="100%" stopColor="#00a8ff" />
                    </linearGradient>
                  </defs>
                </svg>
                {/* 内部图标 */}
                <div style={{
                  fontSize: '20px',
                  color: 'var(--primary-color, #00d4ff)',
                  textShadow: '0 0 10px rgba(0, 212, 255, 0.8)',
                  zIndex: 1
                }}>
                  <DeploymentUnitOutlined />
                </div>
                {/* 旋转圆点 */}
                <div style={{
                  position: 'absolute',
                  width: '50px',
                  height: '50px',
                  animation: 'rotate 8s linear infinite'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '4px',
                    height: '4px',
                    background: 'var(--primary-color, #00d4ff)',
                    borderRadius: '50%',
                    boxShadow: '0 0 8px var(--primary-color, #00d4ff)'
                  }} />
                </div>
              </div>
              
              {/* 标题文字 */}
              <div>
                <div style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  letterSpacing: '2px',
                  color: '#fff',
                  textShadow: '0 0 20px rgba(0, 212, 255, 0.5), 0 0 40px rgba(0, 212, 255, 0.3)',
                  fontFamily: "'Segoe UI', 'Roboto', sans-serif"
                }}>
                  {selectedApp?.appName}
                </div>
                <div style={{
                  fontSize: '10px',
                  color: 'var(--primary-color, #00d4ff)',
                  letterSpacing: '3px',
                  marginTop: '4px',
                  fontFamily: "'Courier New', monospace",
                  opacity: 0.8
                }}>
                  DEPLOYMENT HISTORY
                </div>
              </div>
            </div>
            
            {/* 右侧：统计面板 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 16px',
              background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.05) 0%, rgba(0, 168, 255, 0.05) 100%)',
              border: '1px solid rgba(0, 212, 255, 0.2)',
              borderRadius: '8px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* 动态背景扫描效果 */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: '-100%',
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.1), transparent)',
                animation: 'scanBg 3s linear infinite'
              }} />
              
              {/* 状态指示器 */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '2px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: 'var(--primary-color, #00d4ff)',
                    boxShadow: '0 0 12px var(--primary-color, #00d4ff), 0 0 24px rgba(0, 212, 255, 0.4)',
                    animation: 'pulse 1.5s ease-in-out infinite'
                  }} />
                  <span style={{
                    fontSize: '11px',
                    color: 'var(--primary-color, #00d4ff)',
                    fontFamily: "'Courier New', monospace",
                    fontWeight: 600,
                    letterSpacing: '1px'
                  }}>RECORDS</span>
                </div>
                <div style={{
                  fontSize: '9px',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontFamily: "'Courier New', monospace"
                }}>
                  {historyPagination.total} ENTRIES
                </div>
              </div>
              
              {/* 数据流动画 */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                width: '20px'
              }}>
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      height: '2px',
                      background: 'linear-gradient(90deg, transparent, var(--primary-color, #00d4ff))',
                      borderRadius: '1px',
                      animation: `dataFlow 1s ease-in-out ${i * 0.1}s infinite`,
                      opacity: 0.6
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        }
        open={historyModalVisible}
        onCancel={() => setHistoryModalVisible(false)}
        footer={null}
        width={800}
        className="deployment-history-modal"
        styles={{
          header: {
            background: 'transparent !important',
            backgroundColor: 'transparent !important',
            padding: '0 24px',
            borderBottom: 'none',
            marginBottom: 0,
            boxShadow: 'none'
          },
          body: {
            padding: '20px 24px 0'
          },
          content: {
            backgroundColor: 'var(--bg-container, #1e293b)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(0, 212, 255, 0.1)'
          }
        }}
      >
        <Spin spinning={historyLoading}>
          <div className="deployment-history-list">
            {/* 扫描线效果 */}
            <div className="scan-line"></div>
            
            {/* 角落装饰 */}
            <div className="tech-corners">
              <div className="tech-corner tech-corner-tl"></div>
              <div className="tech-corner tech-corner-tr"></div>
              <div className="tech-corner tech-corner-bl"></div>
              <div className="tech-corner tech-corner-br"></div>
            </div>
            
            <List
              dataSource={historyTasks}
              renderItem={(task, index) => (
                <List.Item
                  className="history-task-item"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="history-task-content">
                    {/* 头部：状态和时间 */}
                    <div className="history-task-header">
                      <div className="history-task-status">
                        <div className={`status-icon-wrapper status-${task.status?.toLowerCase()}`}>
                          {getStatusIcon(task.status)}
                        </div>
                        <span className={`status-text status-${task.status?.toLowerCase()}`}>
                          {task.status === 'COMPLETED' ? '部署完成' : task.status === 'FAILED' ? '部署失败' : '已忽略'}
                        </span>
                      </div>
                      <div className="history-task-time">
                        <ClockCircleOutlined />
                        <span>{task.deployedAt ? new Date(task.deployedAt).toLocaleString() : new Date(task.createdAt).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* 分支和提交信息 */}
                    <div className="history-task-tags">
                      <Tag className="branch-tag" icon={<BranchesOutlined />}>
                        {task.branch}
                      </Tag>
                      <Tag className="commit-tag">
                        {task.commitId?.substring(0, 7) || '------'}
                      </Tag>
                    </div>

                    {/* 提交信息 */}
                    {task.commitMessage && (
                      <div className="history-commit-message">
                        <MessageOutlined />
                        <span className="commit-message-text">{task.commitMessage}</span>
                      </div>
                    )}

                    {/* 作者和部署人 - 科技感样式 */}
                    <div className="history-author-section">
                      <div className="author-info-highlight">
                        <div className="author-avatar">
                          <UserOutlined />
                        </div>
                        <div className="author-details">
                          <span className="author-label">提交者</span>
                          <span className="author-name-highlight">{task.commitAuthor || '未知'}</span>
                        </div>
                      </div>
                      
                      {task.deployedBy && (
                        <div className="deployer-info">
                          <div className="deployer-avatar">
                            <BuildOutlined />
                          </div>
                          <div className="deployer-details">
                            <span className="deployer-label">部署人</span>
                            <span className="deployer-name">{task.deployedBy}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </List.Item>
              )}
              pagination={{
                ...historyPagination,
                onChange: (page) => {
                  if (selectedApp) {
                    fetchHistory(selectedApp.id, page);
                  }
                },
                showSizeChanger: false
              }}
              locale={{
                emptyText: (
                  <div className="empty-tasks">
                    <HistoryOutlined />
                    <div>暂无部署历史</div>
                  </div>
                )
              }}
            />
          </div>
        </Spin>
      </Modal>
    </div>
  );
};

export default DeploymentHistoryPage;
