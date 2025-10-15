import React, { useState, useEffect } from 'react';
import {
  Tree,
  Card,
  Button,
  Modal,
  Form,
  Input,
  message,
  Space,
  Typography,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderOutlined,
  FileTextOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface TreeDataNode {
  key: string;
  title: React.ReactNode;
  children?: TreeDataNode[];
  [key: string]: any;
}

interface TreeNode {
  key: string;
  title: string | React.ReactNode;
  description: string;
  type: 'system' | 'module' | 'scenario';
  id: number;
  systemId?: number;
  moduleId?: number;
  children?: TreeNode[];
  content?: string;
  isLeaf?: boolean;
  [key: string]: any;
}

interface EditModalProps {
  visible: boolean;
  type: 'system' | 'module' | 'scenario';
  data?: any;
  parentId?: number;
  onCancel: () => void;
  onSuccess: () => void;
}

const EditModal: React.FC<EditModalProps> = ({
  visible,
  type,
  data,
  parentId,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      if (data) {
        form.setFieldsValue({
          name: data.title || data.name,
          description: data.description,
          content: data.content || '',
        });
      } else {
        form.resetFields();
      }
    }
  }, [visible, data, form]);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      if (data) {
        // 编辑模式
        let url = '';
        if (type === 'system') {
          url = `/api/system/systems/${data.id}`;
        } else if (type === 'module') {
          url = `/api/system/modules/${data.id}`;
        } else {
          url = `/api/system/scenarios/${data.id}`;
        }
        await axios.put(url, values);
        message.success('更新成功');
      } else {
        // 新增模式
        let url = '';
        if (type === 'system') {
          url = '/api/system/systems';
        } else if (type === 'module') {
          url = `/api/system/systems/${parentId}/modules`;
        } else {
          url = `/api/system/modules/${parentId}/scenarios`;
        }
        await axios.post(url, values);
        message.success('创建成功');
      }
      onSuccess();
    } catch (error: any) {
      message.error(error.response?.data?.error || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    if (data) {
      return `编辑${type === 'system' ? '系统' : type === 'module' ? '功能模块' : '功能场景'}`;
    }
    return `新增${type === 'system' ? '系统' : type === 'module' ? '功能模块' : '功能场景'}`;
  };

  return (
    <Modal
      title={getTitle()}
      open={visible}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={loading}
      width={600}
    >
      <Form form={form} onFinish={handleSubmit} layout="vertical">
        <Form.Item
          label="名称"
          name="name"
          rules={[{ required: true, message: '请输入名称' }]}
        >
          <Input placeholder="请输入名称" maxLength={100} />
        </Form.Item>
        <Form.Item label="描述" name="description">
          <TextArea rows={3} placeholder="请输入描述" maxLength={500} />
        </Form.Item>
        {type === 'scenario' && (
          <Form.Item label="内容" name="content">
            <TextArea rows={6} placeholder="请输入场景内容" />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

const SystemManagement: React.FC = () => {
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [editModal, setEditModal] = useState<{
    visible: boolean;
    type: 'system' | 'module' | 'scenario';
    data?: any;
    parentId?: number;
  }>({ visible: false, type: 'system' });

  const fetchTreeData = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/system/systems/tree');
      setTreeData(response.data.data);
      
      // 默认不展开任何节点
      // 移除默认展开逻辑，保持expandedKeys为空数组
    } catch (error: any) {
      message.error(error.response?.data?.error || '获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTreeData();
  }, []);

  const handleAdd = (type: 'system' | 'module' | 'scenario', parentId?: number) => {
    setEditModal({ visible: true, type, parentId });
  };

  const handleEdit = (node: TreeNode) => {
    setEditModal({ visible: true, type: node.type, data: node });
  };

  // 局部更新树数据的工具函数
  const removeNodeFromTree = (nodes: TreeNode[], targetKey: string): TreeNode[] => {
    return nodes.filter(node => {
      if (node.key === targetKey) {
        return false;
      }
      if (node.children) {
        node.children = removeNodeFromTree(node.children, targetKey);
      }
      return true;
    });
  };

  const handleDelete = async (node: TreeNode) => {
    try {
      let url = '';
      if (node.type === 'system') {
        url = `/api/system/systems/${node.id}`;
      } else if (node.type === 'module') {
        url = `/api/system/modules/${node.id}`;
      } else {
        url = `/api/system/scenarios/${node.id}`;
      }
      
      await axios.delete(url);
      
      // 局部更新树数据，保持展开状态
      const updatedTreeData = removeNodeFromTree(treeData, node.key);
      setTreeData(updatedTreeData);
      
      // 清理选中状态
      if (selectedNode?.key === node.key) {
        setSelectedNode(null);
      }
      
      message.success('删除成功');
    } catch (error: any) {
      const response = error.response;
      if (response?.status === 409) {
        const { message: errorMessage, data } = response.data;
        Modal.error({
          title: '无法删除',
          content: (
            <div>
              <p>{errorMessage}</p>
              <p>请先删除相关的{data?.childType === 'modules' ? '模块' : '场景'}后再试。</p>
            </div>
          ),
          okText: '知道了',
        });
      } else {
        message.error(response?.data?.error || '删除失败');
      }
    }
  };

  const renderTitle = (node: TreeNode) => {
    const iconMap = {
      system: <DatabaseOutlined />,
      module: <FolderOutlined />,
      scenario: <FileTextOutlined />,
    };

    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <Space>
          {iconMap[node.type]}
          <span>{node.title}</span>
        </Space>
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<PlusOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              if (node.type === 'system') {
                handleAdd('module', node.id);
              } else if (node.type === 'module') {
                handleAdd('scenario', node.id);
              }
            }}
            title={node.type === 'system' ? '新增模块' : '新增场景'}
          />
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(node);
            }}
            title="编辑"
          />
          <Popconfirm
            title={`确定删除${node.type === 'system' ? '系统' : node.type === 'module' ? '模块' : '场景'}吗？`}
            onConfirm={(e) => {
              e?.stopPropagation();
              handleDelete(node);
            }}
            okText="确定"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={(e) => e.stopPropagation()}
              title="删除"
            />
          </Popconfirm>
        </Space>
      </div>
    );
  };

  const renderContent = () => {
    if (!selectedNode) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '200px',
          color: '#666'
        }}>
          <div style={{ textAlign: 'center' }}>
            <FileTextOutlined style={{ fontSize: 48, color: '#ddd', marginBottom: 16 }} />
            <div>请选择一个节点查看详情</div>
          </div>
        </div>
      );
    }

    const getTypeLabel = (type: string) => {
      switch (type) {
        case 'system': return '系统';
        case 'module': return '功能模块';
        case 'scenario': return '功能场景';
        default: return type;
      }
    };

    const getTypeColor = (type: string) => {
      switch (type) {
        case 'system': return 'blue';
        case 'module': return 'green';
        case 'scenario': return 'orange';
        default: return 'default';
      }
    };

    return (
      <div style={{ padding: '16px 0' }}>
        <div style={{ marginBottom: 24 }}>
          <Title level={3} style={{ marginBottom: 8 }}>
            {selectedNode.title}
          </Title>
          <Space>
            <span style={{
              display: 'inline-block',
              padding: '2px 8px',
              fontSize: '12px',
              borderRadius: '10px',
              backgroundColor: getTypeColor(selectedNode.type) === 'blue' ? '#e6f7ff' :
                getTypeColor(selectedNode.type) === 'green' ? '#f6ffed' : '#fff7e6',
              color: getTypeColor(selectedNode.type) === 'blue' ? '#1890ff' :
                getTypeColor(selectedNode.type) === 'green' ? '#52c41a' : '#fa8c16',
              border: `1px solid ${getTypeColor(selectedNode.type) === 'blue' ? '#91d5ff' :
                getTypeColor(selectedNode.type) === 'green' ? '#b7eb8f' : '#ffd591'}`
            }}>
              {getTypeLabel(selectedNode.type)}
            </span>
            <Text type="secondary">ID: {selectedNode.id}</Text>
          </Space>
        </div>

        {selectedNode.description && (
          <div style={{ marginBottom: 24 }}>
            <Title level={4} style={{ marginBottom: 12 }}>描述</Title>
            <Text style={{ fontSize: 14, lineHeight: 1.6 }}>
              {selectedNode.description}
            </Text>
          </div>
        )}

        {selectedNode.type === 'scenario' && selectedNode.content && (
          <div>
            <Title level={4} style={{ marginBottom: 12 }}>场景内容</Title>
            <div style={{
              background: '#f8f9fa',
              padding: 16,
              borderRadius: 8,
              border: '1px solid #e9ecef'
            }}>
              <pre style={{
                margin: 0,
                fontSize: 14,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: 'Monaco, Menlo, Consolas, monospace'
              }}>
                {selectedNode.content}
              </pre>
            </div>
          </div>
        )}
      </div>
    );
  };

  const convertToTreeData = (nodes: TreeNode[]): TreeDataNode[] => {
    if (!nodes || !Array.isArray(nodes)) {
      return [];
    }
    return nodes.map(node => ({
      ...node,
      title: renderTitle(node),
      children: node.children ? convertToTreeData(node.children) : undefined,
    }));
  };

  const handleTreeSelect = (_: any, info: any) => {
    const node = info.node as any;
    setSelectedNode({
      key: node.key,
      title: node.title,
      description: node.description,
      type: node.type,
      id: node.id,
      systemId: node.systemId,
      moduleId: node.moduleId,
      children: node.children,
      content: node.content,
      isLeaf: node.isLeaf,
    });
  
  // 新增：点击文字区域时展开/闭合节点（仅对有子节点的节点）
  if (node.children && node.children.length > 0) {
    setExpandedKeys(prev => {
      const isExpanded = prev.includes(node.key);
      if (isExpanded) {
        return prev.filter(key => key !== node.key);
      } else {
        return [...prev, node.key];
      }
    });
  }
};

  return (
    <div style={{ height: '100%', display: 'flex', gap: 16 }}>
      <div style={{ flex: 1, minWidth: 300 }}>
        <Card
          title="系统管理"
          extra={
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleAdd('system')}
            >
              新增系统
            </Button>
          }
          style={{ height: '100%' }}
          loading={loading}
        >
          <Tree
            treeData={convertToTreeData(treeData)}
            showLine
            showIcon={false}
            onSelect={handleTreeSelect}
            expandedKeys={expandedKeys}
            onExpand={setExpandedKeys}
            style={{ fontSize: 14 }}
          />
        </Card>
      </div>
      
      <div style={{ flex: 2, minWidth: 400 }}>
        <Card title="详情" style={{ height: '100%' }}>
          {renderContent()}
        </Card>
      </div>

      <EditModal
        visible={editModal.visible}
        type={editModal.type}
        data={editModal.data}
        parentId={editModal.parentId}
        onCancel={() => setEditModal({ visible: false, type: 'system' })}
        onSuccess={() => {
          setEditModal({ visible: false, type: 'system' });
          fetchTreeData();
        }}
      />
    </div>
  );
};

export default SystemManagement;