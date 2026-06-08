import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  message,
  Popconfirm,
  Typography,
  Tooltip,
  Row,
  Col
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  KeyOutlined,
  ReloadOutlined,
  LinkOutlined,
  CopyOutlined
} from '@ant-design/icons';
import {
  getAppConfigs,
  createAppConfig,
  updateAppConfig,
  deleteAppConfig,
  getWebhookSecret,
  regenerateWebhookSecret,
  AppConfig
} from '../../services/deployment/appConfigApi';
import { projectApi, directoryApi, Project, Directory } from '../../services/project/projectApi';

const { Option } = Select;
const { TextArea } = Input;
const { Title } = Typography;

const AppConfigPage: React.FC = () => {
  const [configs, setConfigs] = useState<AppConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState<AppConfig | null>(null);
  const [secretModalVisible, setSecretModalVisible] = useState(false);
  const [currentSecret, setCurrentSecret] = useState('');
  const [form] = Form.useForm();

  // 项目和系统数据
  const [projects, setProjects] = useState<Project[]>([]);
  const [directories, setDirectories] = useState<Directory[]>([]);
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

  // 加载系统列表（根据选择的项目）
  const fetchDirectories = async (projectId: string) => {
    if (!projectId) {
      setDirectories([]);
      return;
    }
    try {
      const data = await directoryApi.getDirectoriesByProjectId(projectId);
      // 只显示系统级别（level=1）的目录
      const systemDirs = data.filter((dir: Directory) => dir.level === 1);
      setDirectories(systemDirs);
    } catch (error) {
      console.error('获取系统列表失败:', error);
    }
  };

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const result = await getAppConfigs();
      setConfigs(result.items);
    } catch (error) {
      message.error('获取应用配置失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
    fetchProjects();
  }, []);

  // 当选择的项目变化时，加载对应的系统列表
  useEffect(() => {
    fetchDirectories(selectedProjectId);
  }, [selectedProjectId]);

  const handleAdd = () => {
    setEditingConfig(null);
    form.resetFields();
    setSelectedProjectId('');
    setModalVisible(true);
  };

  const handleEdit = (config: AppConfig) => {
    setEditingConfig(config);
    const projectId = config.projectId || '';
    setSelectedProjectId(projectId);
    
    // 先设置表单值，等项目和系统数据加载完成后再更新
    form.setFieldsValue({
      ...config,
      branches: config.branches,
      projectId: projectId,
      directoryId: config.directoryId || undefined,
      jenkinsUrl: config.jenkinsUrl || ''
    });
    
    // 加载对应的系统列表
    if (projectId) {
      fetchDirectories(projectId).then(() => {
        form.setFieldsValue({
          directoryId: config.directoryId || undefined
        });
      });
    }
    
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteAppConfig(id);
      message.success('删除成功');
      fetchConfigs();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      // 处理空字符串为 undefined
      const submitData = {
        ...values,
        projectId: values.projectId || undefined,
        directoryId: values.directoryId || undefined,
        jenkinsUrl: values.jenkinsUrl || undefined
      };

      if (editingConfig) {
        await updateAppConfig(editingConfig.id, submitData);
        message.success('更新成功');
      } else {
        await createAppConfig(submitData);
        message.success('创建成功');
      }
      setModalVisible(false);
      fetchConfigs();
    } catch (error) {
      message.error(editingConfig ? '更新失败' : '创建失败');
    }
  };

  const handleViewSecret = async (id: number) => {
    try {
      const result = await getWebhookSecret(id);
      setCurrentSecret(result.webhookSecret);
      setSecretModalVisible(true);
    } catch (error) {
      message.error('获取密钥失败');
    }
  };

  const handleRegenerateSecret = async (id: number) => {
    try {
      const result = await regenerateWebhookSecret(id);
      setCurrentSecret(result.webhookSecret);
      setSecretModalVisible(true);
      message.success('密钥已重新生成，请更新GitLab Webhook配置');
    } catch (error) {
      message.error('重新生成密钥失败');
    }
  };

  const handleOpenJenkins = (jenkinsUrl?: string) => {
    if (jenkinsUrl) {
      window.open(jenkinsUrl, '_blank');
    } else {
      message.warning('该应用未配置Jenkins地址');
    }
  };

  // 后备复制方案：使用传统的 execCommand 方法
  const fallbackCopyTextToClipboard = (text: string) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        message.success('密钥已复制到剪贴板');
      } else {
        message.error('复制失败，请手动复制');
      }
    } catch (err) {
      console.error('Fallback copy failed:', err);
      message.error('复制失败，请手动复制');
    }
    
    document.body.removeChild(textArea);
  };

  const columns = [
    {
      title: '应用名称',
      dataIndex: 'appName',
      key: 'appName',
    },
    {
      title: '应用编码',
      dataIndex: 'appCode',
      key: 'appCode',
    },
    {
      title: '所属系统',
      key: 'directory',
      render: (_: any, record: AppConfig) => (
        <span>{record.directory?.name || '-'}</span>
      ),
    },
    {
      title: 'Git仓库',
      dataIndex: 'repositoryName',
      key: 'repositoryName',
    },
    {
      title: '监测分支',
      dataIndex: 'branches',
      key: 'branches',
      render: (branches: string[]) => (
        <Space>
          {branches.map(branch => (
            <Tag key={branch} color="blue">{branch}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Jenkins',
      key: 'jenkins',
      render: (_: any, record: AppConfig) => (
        record.jenkinsUrl ? (
          <Tag color="green" icon={<LinkOutlined />}>已配置</Tag>
        ) : (
          <Tag color="default">未配置</Tag>
        )
      ),
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Tag 
          color={isActive ? 'green' : 'red'}
          style={{ 
            fontSize: '13px', 
            padding: '4px 12px',
            fontWeight: 500
          }}
        >
          {isActive ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 280,
      render: (_: any, record: AppConfig) => (
        <Space>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="Jenkins构建">
            <Button
              type="text"
              icon={<LinkOutlined />}
              onClick={() => handleOpenJenkins(record.jenkinsUrl)}
              disabled={!record.jenkinsUrl}
            />
          </Tooltip>
          <Tooltip title="查看密钥">
            <Button
              type="text"
              icon={<KeyOutlined />}
              onClick={() => handleViewSecret(record.id)}
            />
          </Tooltip>
          <Tooltip title="重新生成密钥">
            <Button
              type="text"
              icon={<ReloadOutlined />}
              onClick={() => handleRegenerateSecret(record.id)}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Popconfirm
              title="确认删除"
              onConfirm={() => handleDelete(record.id)}
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4}>应用配置</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
        >
          新增应用
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={configs}
          loading={loading}
          rowKey="id"
          rowClassName={() => 'app-config-row'}
        />
      </Card>

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
              background: 'linear-gradient(180deg, transparent, #ff6b6b, transparent)',
              animation: 'scanLine 2s linear infinite'
            }} />
            
            {/* 主标题区域 */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '16px',
              marginLeft: '16px'
            }}>
              {/* 菱形图标容器 */}
              <div style={{
                width: '44px',
                height: '44px',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {/* 菱形边框 */}
                <svg width="44" height="44" viewBox="0 0 44 44" style={{ position: 'absolute' }}>
                  <polygon
                    points="22,4 40,22 22,40 4,22"
                    fill="none"
                    stroke="url(#diamondGradient)"
                    strokeWidth="2"
                    style={{ filter: 'drop-shadow(0 0 6px rgba(255, 107, 107, 0.6))' }}
                  />
                  <defs>
                    <linearGradient id="diamondGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ff6b6b" />
                      <stop offset="100%" stopColor="#ffd93d" />
                    </linearGradient>
                  </defs>
                </svg>
                {/* 内部图标 */}
                <div style={{
                  fontSize: '20px',
                  color: '#ff6b6b',
                  textShadow: '0 0 10px rgba(255, 107, 107, 0.8)',
                  zIndex: 1
                }}>
                  🔐
                </div>
                {/* 脉冲光环 */}
                <div style={{
                  position: 'absolute',
                  width: '50px',
                  height: '50px',
                  border: '1px dashed rgba(255, 107, 107, 0.3)',
                  borderRadius: '50%',
                  animation: 'pulse 2s ease-in-out infinite'
                }} />
              </div>
              
              {/* 标题文字 */}
              <div>
                <div style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  letterSpacing: '2px',
                  color: '#fff',
                  textShadow: '0 0 20px rgba(255, 107, 107, 0.5), 0 0 40px rgba(255, 107, 107, 0.3)',
                  fontFamily: "'Segoe UI', 'Roboto', sans-serif"
                }}>
                  Webhook密钥
                </div>
                <div style={{
                  fontSize: '10px',
                  color: '#ff6b6b',
                  letterSpacing: '3px',
                  marginTop: '4px',
                  fontFamily: "'Courier New', monospace",
                  opacity: 0.8
                }}>
                  SECRET KEY ACCESS
                </div>
              </div>
            </div>
            
            {/* 右侧：安全状态面板 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 16px',
              background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.05) 0%, rgba(255, 217, 61, 0.05) 100%)',
              border: '1px solid rgba(255, 107, 107, 0.2)',
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
                background: 'linear-gradient(90deg, transparent, rgba(255, 107, 107, 0.1), transparent)',
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
                    background: '#ffd93d',
                    boxShadow: '0 0 12px #ffd93d, 0 0 24px rgba(255, 217, 61, 0.4)',
                    animation: 'pulse 1.5s ease-in-out infinite'
                  }} />
                  <span style={{
                    fontSize: '11px',
                    color: '#ffd93d',
                    fontFamily: "'Courier New', monospace",
                    fontWeight: 600,
                    letterSpacing: '1px'
                  }}>SECURE</span>
                </div>
                <div style={{
                  fontSize: '9px',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontFamily: "'Courier New', monospace"
                }}>
                  CONFIDENTIAL
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
                      background: 'linear-gradient(90deg, transparent, #ff6b6b)',
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
        open={secretModalVisible}
        onCancel={() => setSecretModalVisible(false)}
        footer={null}
        className="webhook-secret-modal"
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
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 107, 107, 0.1)'
          },
          footer: {
            display: 'none'
          }
        }}
      >
        <div style={{ padding: '20px 0' }}>
          <p style={{ marginBottom: 16 }}>请妥善保管以下密钥，用于配置GitLab Webhook的Secret Token：</p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Input.TextArea
              value={currentSecret}
              readOnly
              autoSize={{ minRows: 2, maxRows: 4 }}
              style={{ fontFamily: 'monospace', fontSize: 14, flex: 1 }}
            />
            <Tooltip title="复制密钥">
              <Button
                type="primary"
                icon={<CopyOutlined />}
                onClick={() => {
                  if (!currentSecret) {
                    message.error('密钥为空，无法复制');
                    return;
                  }
                  
                  // 方法1: 使用 navigator.clipboard API
                  if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(currentSecret).then(() => {
                      message.success('密钥已复制到剪贴板');
                    }).catch((err) => {
                      console.error('Clipboard API failed:', err);
                      // 方法2: 使用传统的 execCommand 作为后备方案
                      fallbackCopyTextToClipboard(currentSecret);
                    });
                  } else {
                    // 方法2: 浏览器不支持 Clipboard API，使用传统方法
                    fallbackCopyTextToClipboard(currentSecret);
                  }
                }}
              >
                复制
              </Button>
            </Tooltip>
          </div>
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <Button type="primary" onClick={() => setSecretModalVisible(false)}>
              确定
            </Button>
          </div>
        </div>
      </Modal>

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
              background: 'linear-gradient(180deg, transparent, #00d4ff, transparent)',
              animation: 'scanLine 2s linear infinite'
            }} />
            
            {/* 主标题区域 */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '16px',
              marginLeft: '16px'
            }}>
              {/* 六边形图标容器 */}
              <div style={{
                width: '44px',
                height: '44px',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {/* 六边形边框 */}
                <svg width="44" height="44" viewBox="0 0 44 44" style={{ position: 'absolute' }}>
                  <polygon
                    points="22,2 40,12 40,32 22,42 4,32 4,12"
                    fill="none"
                    stroke="url(#hexGradient)"
                    strokeWidth="2"
                    style={{ filter: 'drop-shadow(0 0 6px rgba(0, 212, 255, 0.6))' }}
                  />
                  <defs>
                    <linearGradient id="hexGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00d4ff" />
                      <stop offset="100%" stopColor="#00ff88" />
                    </linearGradient>
                  </defs>
                </svg>
                {/* 内部图标 */}
                <div style={{
                  fontSize: '20px',
                  color: '#00d4ff',
                  textShadow: '0 0 10px rgba(0, 212, 255, 0.8)',
                  zIndex: 1
                }}>
                  {editingConfig ? '◈' : '✦'}
                </div>
                {/* 旋转光环 */}
                <div style={{
                  position: 'absolute',
                  width: '50px',
                  height: '50px',
                  border: '1px dashed rgba(0, 212, 255, 0.3)',
                  borderRadius: '50%',
                  animation: 'rotate 10s linear infinite'
                }} />
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
                  {editingConfig ? '编辑应用配置' : '新增应用配置'}
                </div>
                <div style={{
                  fontSize: '10px',
                  color: '#00d4ff',
                  letterSpacing: '3px',
                  marginTop: '4px',
                  fontFamily: "'Courier New', monospace",
                  opacity: 0.8
                }}>
                  {editingConfig ? 'EDIT APP CONFIG' : 'NEW APP CONFIG'}
                </div>
              </div>
            </div>
            
            {/* 右侧：系统状态面板 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 16px',
              background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.05) 0%, rgba(0, 255, 136, 0.05) 100%)',
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
                    background: '#00ff88',
                    boxShadow: '0 0 12px #00ff88, 0 0 24px rgba(0, 255, 136, 0.4)',
                    animation: 'pulse 1.5s ease-in-out infinite'
                  }} />
                  <span style={{
                    fontSize: '11px',
                    color: '#00ff88',
                    fontFamily: "'Courier New', monospace",
                    fontWeight: 600,
                    letterSpacing: '1px'
                  }}>ONLINE</span>
                </div>
                <div style={{
                  fontSize: '9px',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontFamily: "'Courier New', monospace"
                }}>
                  SECURE_CONNECTION
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
                      background: 'linear-gradient(90deg, transparent, #00d4ff)',
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
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        width={700}
        footer={null}
        className="app-config-modal"
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
            padding: '16px 24px 24px'
          },
          content: {
            backgroundColor: 'var(--bg-container, #1e293b)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(0, 212, 255, 0.1)'
          }
        }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="appName"
                label="应用名称"
                rules={[{ required: true, message: '请输入应用名称' }]}
              >
                <Input placeholder="如：jwsiot-frontend" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="appCode"
                label="应用编码"
                rules={[{ required: true, message: '请输入应用编码' }]}
              >
                <Input placeholder="如：jwsiot-fe" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="projectId"
                label="所属项目"
              >
                <Select
                  placeholder="选择项目"
                  allowClear
                  onChange={(value) => {
                    setSelectedProjectId(value || '');
                    form.setFieldValue('directoryId', undefined);
                  }}
                >
                  {projects.map(project => (
                    <Option key={project.id} value={project.id}>{project.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="directoryId"
                label="所属系统"
              >
                <Select
                  placeholder="选择系统"
                  allowClear
                  disabled={!selectedProjectId}
                >
                  {directories.map(dir => (
                    <Option key={dir.uuid} value={dir.uuid}>{dir.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="应用描述"
          >
            <TextArea rows={2} placeholder="应用描述（可选）" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="gitUrl"
                label="Git仓库地址"
                rules={[{ required: true, message: '请输入Git仓库地址' }]}
              >
                <Input placeholder="https://gitlab.com/group/repo.git" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="repositoryName"
                label="GitLab仓库名称"
                rules={[{ required: true, message: '请输入GitLab仓库名称' }]}
              >
                <Input placeholder="如：JWSIOT" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="projectPath"
                label="工程路径"
                rules={[{ required: true, message: '请输入工程路径' }]}
              >
                <Input placeholder="如：jwsiot-frontend/" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="jenkinsUrl"
                label="Jenkins构建地址"
              >
                <Input placeholder="如：http://jenkins/job/my-app/build" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="branches"
            label="监测分支"
            rules={[{ required: true, message: '请选择监测分支' }]}
          >
            <Select mode="tags" placeholder="输入分支名称，如：main, develop">
              <Option value="main">main</Option>
              <Option value="develop">develop</Option>
              <Option value="master">master</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="isActive"
            label="启用监测"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch
              style={{
                borderRadius: '12px'
              }}
            />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
            <Button onClick={() => setModalVisible(false)}>
              取消
            </Button>
            <Button type="primary" onClick={() => form.submit()}>
              确认
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default AppConfigPage;
