import React, { useState, useEffect } from 'react';
import {
  Layout,
  Typography,
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Space,
  Tag,
  message,
  Popconfirm,
  Descriptions,
  Tabs,
  Alert
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  DeleteOutlined,
  PoweroffOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SettingOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Content } = Layout;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  enabled: boolean;
  intents: string[];
  dependencies: string[];
  metadata?: {
    id: string;
    name: string;
    version: string;
    description: string;
    author: string;
    dependencies: any[];
    permissions: string[];
  };
  versions?: PluginVersion[];
}

interface PluginVersion {
  pluginId: string;
  version: string;
  isActive: boolean;
  installedAt: string;
  uninstalledAt?: string;
  metadata?: any;
}

interface PluginStats {
  totalPlugins: number;
  enabledPlugins: number;
  totalVersions: number;
  healthy: boolean;
}

const PluginManagementPage: React.FC = () => {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [loadModalVisible, setLoadModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [stats, setStats] = useState<PluginStats | null>(null);
  const [loadForm] = Form.useForm();

  useEffect(() => {
    loadPlugins();
    loadStats();
  }, []);

  const loadPlugins = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/plugins');
      if (response.data.success) {
        setPlugins(response.data.plugins || []);
      }
    } catch (error) {
      message.error('加载插件列表失败');
      console.error('Failed to load plugins:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await axios.get('/api/plugins/stats');
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Failed to load plugin stats:', error);
    }
  };

  const handleLoadPlugin = async (values: any) => {
    try {
      const response = await axios.post('/api/plugins/load', values);
      if (response.data.success) {
        message.success('插件加载成功');
        setLoadModalVisible(false);
        loadForm.resetFields();
        loadPlugins();
        loadStats();
      } else {
        message.error(response.data.message || '插件加载失败');
      }
    } catch (error) {
      message.error('插件加载失败');
      console.error('Failed to load plugin:', error);
    }
  };

  const handleUnloadPlugin = async (pluginId: string) => {
    try {
      const response = await axios.post(`/api/plugins/unload/${pluginId}`);
      if (response.data.success) {
        message.success('插件卸载成功');
        loadPlugins();
        loadStats();
      } else {
        message.error(response.data.message || '插件卸载失败');
      }
    } catch (error) {
      message.error('插件卸载失败');
      console.error('Failed to unload plugin:', error);
    }
  };

  const handleReloadPlugin = async (pluginId: string) => {
    try {
      const response = await axios.post(`/api/plugins/reload/${pluginId}`);
      if (response.data.success) {
        message.success('插件重载成功');
        loadPlugins();
      } else {
        message.error(response.data.message || '插件重载失败');
      }
    } catch (error) {
      message.error('插件重载失败');
      console.error('Failed to reload plugin:', error);
    }
  };

  const handleTogglePlugin = async (pluginId: string, enabled: boolean) => {
    try {
      const action = enabled ? 'enable' : 'disable';
      const response = await axios.post(`/api/plugins/${pluginId}/${action}`);
      if (response.data.success) {
        message.success(enabled ? '插件已启用' : '插件已禁用');
        loadPlugins();
        loadStats();
      } else {
        message.error(response.data.message || '操作失败');
      }
    } catch (error) {
      message.error('操作失败');
      console.error('Failed to toggle plugin:', error);
    }
  };

  const handleRollbackPlugin = async (pluginId: string, version: string) => {
    try {
      const response = await axios.post(`/api/plugins/${pluginId}/rollback`, { version });
      if (response.data.success) {
        message.success(`插件回滚到 ${version} 成功`);
        loadPlugins();
        loadPluginDetail(pluginId);
      } else {
        message.error(response.data.message || '插件回滚失败');
      }
    } catch (error) {
      message.error('插件回滚失败');
      console.error('Failed to rollback plugin:', error);
    }
  };

  const loadPluginDetail = async (pluginId: string) => {
    try {
      const response = await axios.get(`/api/plugins/${pluginId}`);
      if (response.data.success) {
        setSelectedPlugin(response.data.plugin);
        setDetailModalVisible(true);
      }
    } catch (error) {
      message.error('加载插件详情失败');
      console.error('Failed to load plugin detail:', error);
    }
  };

  const columns = [
    {
      title: '插件ID',
      dataIndex: 'id',
      key: 'id',
      width: 200,
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      width: 100,
    },
    {
      title: '作者',
      dataIndex: 'author',
      key: 'author',
      width: 150,
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 100,
      render: (enabled: boolean) => (
        <Tag icon={enabled ? <CheckCircleOutlined /> : <CloseCircleOutlined />} color={enabled ? 'success' : 'default'}>
          {enabled ? '已启用' : '已禁用'}
        </Tag>
      ),
    },
    {
      title: '意图',
      dataIndex: 'intents',
      key: 'intents',
      width: 200,
      render: (intents: string[]) => (
        <Space size={[0, 8]} wrap>
          {intents.map(intent => (
            <Tag key={intent} color="blue">{intent}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 300,
      render: (_: any, record: Plugin) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<ReloadOutlined />}
            onClick={() => handleReloadPlugin(record.id)}
          >
            重载
          </Button>
          <Button
            type="link"
            size="small"
            icon={<PoweroffOutlined />}
            onClick={() => handleTogglePlugin(record.id, !record.enabled)}
          >
            {record.enabled ? '禁用' : '启用'}
          </Button>
          <Button
            type="link"
            size="small"
            icon={<SettingOutlined />}
            onClick={() => loadPluginDetail(record.id)}
          >
            详情
          </Button>
          <Popconfirm
            title="确定要卸载此插件吗？"
            onConfirm={() => handleUnloadPlugin(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              卸载
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const versionColumns = [
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive ? '当前版本' : '历史版本'}
        </Tag>
      ),
    },
    {
      title: '安装时间',
      dataIndex: 'installedAt',
      key: 'installedAt',
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: PluginVersion) => (
        <Space size="small">
          {!record.isActive && (
            <Button
              type="link"
              size="small"
              onClick={() => handleRollbackPlugin(record.pluginId, record.version)}
            >
              回滚
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Content style={{ padding: '24px' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3}>插件管理</Title>
        <Text type="secondary">管理系统插件，支持加载、卸载、启用、禁用和版本管理</Text>
      </div>

      {stats && (
        <Card style={{ marginBottom: 24 }}>
          <Space size="large">
            <div>
              <Text type="secondary">总插件数</Text>
              <div style={{ fontSize: 24, fontWeight: 'bold' }}>{stats.totalPlugins}</div>
            </div>
            <div>
              <Text type="secondary">已启用</Text>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>{stats.enabledPlugins}</div>
            </div>
            <div>
              <Text type="secondary">总版本数</Text>
              <div style={{ fontSize: 24, fontWeight: 'bold' }}>{stats.totalVersions}</div>
            </div>
            <div>
              <Text type="secondary">系统状态</Text>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: stats.healthy ? '#52c41a' : '#ff4d4f' }}>
                {stats.healthy ? '健康' : '异常'}
              </div>
            </div>
          </Space>
        </Card>
      )}

      <Card
        title="插件列表"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setLoadModalVisible(true)}
          >
            加载插件
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={plugins}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 个插件`,
          }}
        />
      </Card>

      <Modal
        title="加载插件"
        open={loadModalVisible}
        onCancel={() => setLoadModalVisible(false)}
        onOk={() => loadForm.submit()}
        width={600}
      >
        <Form form={loadForm} layout="vertical" onFinish={handleLoadPlugin}>
          <Form.Item
            label="插件路径"
            name="pluginPath"
            rules={[{ required: true, message: '请输入插件路径' }]}
          >
            <Input placeholder="例如: /path/to/plugin/index.ts" />
          </Form.Item>
          <Form.Item label="版本" name="version">
            <Input placeholder="例如: 1.0.0" />
          </Form.Item>
          <Alert
            message="插件路径说明"
            description="插件路径可以是绝对路径或相对路径。插件必须实现Plugin接口并导出默认类。"
            type="info"
            showIcon
          />
        </Form>
      </Modal>

      <Modal
        title="插件详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
      >
        {selectedPlugin && (
          <Tabs defaultActiveKey="info">
            <TabPane tab="基本信息" key="info">
              <Descriptions column={2} bordered>
                <Descriptions.Item label="插件ID">{selectedPlugin.id}</Descriptions.Item>
                <Descriptions.Item label="名称">{selectedPlugin.name}</Descriptions.Item>
                <Descriptions.Item label="版本">{selectedPlugin.version}</Descriptions.Item>
                <Descriptions.Item label="作者">{selectedPlugin.author}</Descriptions.Item>
                <Descriptions.Item label="状态" span={2}>
                  <Tag color={selectedPlugin.enabled ? 'success' : 'default'}>
                    {selectedPlugin.enabled ? '已启用' : '已禁用'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="描述" span={2}>
                  {selectedPlugin.description || '-'}
                </Descriptions.Item>
              </Descriptions>
            </TabPane>
            <TabPane tab="意图列表" key="intents">
              <Space size={[0, 8]} wrap>
                {selectedPlugin.intents.map(intent => (
                  <Tag key={intent} color="blue">{intent}</Tag>
                ))}
              </Space>
            </TabPane>
            <TabPane tab="依赖关系" key="dependencies">
              {selectedPlugin.dependencies.length > 0 ? (
                <Space size={[0, 8]} wrap>
                  {selectedPlugin.dependencies.map(dep => (
                    <Tag key={dep} color="orange">{dep}</Tag>
                  ))}
                </Space>
              ) : (
                <Alert message="无依赖" type="info" showIcon />
              )}
            </TabPane>
            <TabPane tab="版本历史" key="versions">
              <Table
                columns={versionColumns}
                dataSource={selectedPlugin.versions || []}
                rowKey={(record) => `${record.pluginId}-${record.version}`}
                pagination={false}
                size="small"
              />
            </TabPane>
          </Tabs>
        )}
      </Modal>
    </Content>
  );
};

export default PluginManagementPage;
