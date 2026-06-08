import React, { useState, useEffect } from 'react';
import { Layout, Typography, Tree, Form, Input, Button, Select, Card, Space, message, Modal, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, FolderOutlined } from '@ant-design/icons';
import { projectApi, directoryApi, Directory as DirectoryType } from '../../services/project/projectApi';
import './ProjectManagementPage.css';

const { Content } = Layout;
const { Title, Text } = Typography;
const { TreeNode } = Tree;
const { Option } = Select;

interface DirectoryNode {
  uuid: string;
  id: string;
  name: string;
  parentId: string;
  level: number;
  children?: DirectoryNode[];
}

interface Project {
  id: string;
  name: string;
  directories: DirectoryNode[];
}

const ProjectManagementPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [treeData, setTreeData] = useState<DirectoryNode[]>([]);
  const [editingNode, setEditingNode] = useState<DirectoryNode | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isProjectModalVisible, setIsProjectModalVisible] = useState(false);
  const [isEditProjectModalVisible, setIsEditProjectModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [projectForm] = Form.useForm();
  const [editProjectForm] = Form.useForm();
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  // 初始化数据
  useEffect(() => {
    loadProjects();
  }, []);

  // 当选择的项目变化时，加载对应的目录
  useEffect(() => {
    if (selectedProject) {
      loadDirectories(selectedProject);
    }
  }, [selectedProject]);

  // 加载所有项目
  const loadProjects = async () => {
    try {
      const projectList = await projectApi.getProjects();
      const formattedProjects: Project[] = projectList.map(project => ({
        id: project.id,
        name: project.name,
        directories: []
      }));
      setProjects(formattedProjects);
      if (formattedProjects.length > 0) {
        setSelectedProject(formattedProjects[0].id);
      }
    } catch (error) {
      console.error('加载项目失败:', error);
      message.error('加载项目失败');
    }
  };

  // 加载项目的目录
  const loadDirectories = async (projectId: string) => {
    try {
      const directories = await directoryApi.getDirectoriesByProjectId(projectId);
      
      // 转换目录结构为前端需要的格式
      const convertToDirectoryNode = (dir: DirectoryType): DirectoryNode => {
        return {
          uuid: dir.uuid,
          id: dir.id,
          name: dir.name,
          parentId: dir.parent_id,
          level: dir.level,
          children: dir.children ? dir.children.map(child => convertToDirectoryNode(child)) : []
        };
      };
      
      const formattedDirectories = directories.map(convertToDirectoryNode);
      setTreeData(formattedDirectories);
    } catch (error) {
      console.error('加载目录失败:', error);
      message.error('加载目录失败');
    }
  };

  // 当选择的项目变化时，更新树数据
  useEffect(() => {
    // 这个effect已经被loadDirectories函数替代
  }, [selectedProject, projects]);

  // 渲染树节点
  const renderTreeNodes = (data: DirectoryNode[]) => {
    return data.map((node) => {
      // 为所有二级目录添加+号按钮
      const showAddButton = node.level === 1;
      
      if (node.children && node.children.length > 0) {
        return (
          <TreeNode 
            key={node.uuid} 
            title={
              <Space>
                <span>{node.name} (ID: {node.id})</span>
                {showAddButton && (
                  <Button 
                    type="text" 
                    icon={<PlusOutlined />} 
                    size="small" 
                    onClick={() => handleAdd(node.id)}
                    style={{ color: '#52c41a' }}
                  />
                )}
                <Button 
                  type="text" 
                  icon={<EditOutlined />} 
                  size="small" 
                  onClick={() => handleEdit(node)}
                />
                <Popconfirm
                  title="确定要删除这个目录吗？"
                  onConfirm={() => handleDelete(node.uuid)}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button 
                    type="text" 
                    danger 
                    icon={<DeleteOutlined />} 
                    size="small"
                  />
                </Popconfirm>
              </Space>
            }
          >
            {renderTreeNodes(node.children)}
          </TreeNode>
        );
      }
      return (
        <TreeNode 
          key={node.uuid} 
          title={
            <Space>
              <span>{node.name} (ID: {node.id})</span>
              {showAddButton && (
                <Button 
                  type="text" 
                  icon={<PlusOutlined />} 
                  size="small" 
                  onClick={() => handleAdd(node.id)}
                  style={{ color: '#52c41a' }}
                />
              )}
              <Button 
                type="text" 
                icon={<EditOutlined />} 
                size="small" 
                onClick={() => handleEdit(node)}
              />
              <Popconfirm
                title="确定要删除这个目录吗？"
                onConfirm={() => handleDelete(node.uuid)}
                okText="确定"
                cancelText="取消"
              >
                <Button 
                  type="text" 
                  danger 
                  icon={<DeleteOutlined />} 
                  size="small"
                />
              </Popconfirm>
            </Space>
          }
        />
      );
    });
  };

  // 处理节点点击
  const handleNodeClick = (_e: any, _info: any) => {
    // 节点点击处理
  };

  // 处理展开/收起
  const handleExpand = (expandedKeys: React.Key[]) => {
    setExpandedKeys(expandedKeys as string[]);
  };

  // 处理编辑节点
  const handleEdit = (node: DirectoryNode) => {
    setEditingNode(node);
    form.setFieldsValue({
      name: node.name,
      id: node.id,
      parentId: node.parentId
    });
    setIsModalVisible(true);
  };

  // 处理删除节点
  const handleDelete = async (nodeId: string) => {
    try {
      await directoryApi.deleteDirectory(nodeId);
      await loadDirectories(selectedProject);
      message.success('目录删除成功');
    } catch (errorInfo) {
      message.error('删除目录失败，请重试');
    }
  };

  // 处理添加节点
  const handleAdd = (parentId: string) => {
    setEditingNode(null);
    form.setFieldsValue({
      name: '',
      id: '',
      parentId
    });
    setIsModalVisible(true);
  };

  // 处理表单提交
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const { name, id } = values;
      // 获取parentId，即使对应的表单项不存在
      const parentId = form.getFieldValue('parentId');

      if (editingNode) {
        // 编辑现有节点
        const updateData: any = {
          name
        };
        
        // 如果ID发生了变化，也更新ID
        if (id !== editingNode.id) {
          updateData.id = id;
        }
        
        await directoryApi.updateDirectory(editingNode.uuid, updateData);
        await loadDirectories(selectedProject);
        message.success('目录更新成功');
      } else {
        // 添加新节点
        const createData: any = {
          name,
          project_id: selectedProject,
          parent_id: parentId,
          level: parentId === selectedProject ? 1 : 2
        };
        
        // 总是传递id参数，因为表单验证已经确保id不为空
        createData.id = id;
        
        await directoryApi.createDirectory(createData);
        await loadDirectories(selectedProject);
        message.success('目录添加成功');
      }

      setIsModalVisible(false);
      form.resetFields();
      setEditingNode(null);
    } catch (errorInfo) {
      message.error('操作失败，请重试');
    }
  };

  // 处理创建新项目
  const handleCreateProject = () => {
    // 重置项目表单
    projectForm.resetFields();
    setIsProjectModalVisible(true);
  };

  // 处理编辑项目
  const handleEditProject = () => {
    const currentProject = projects.find(p => p.id === selectedProject);
    if (currentProject) {
      editProjectForm.setFieldsValue({
        projectName: currentProject.name,
        projectId: currentProject.id
      });
      setIsEditProjectModalVisible(true);
    }
  };

  // 处理编辑项目表单提交
  const handleEditProjectModalOk = async () => {
    try {
      const values = await editProjectForm.validateFields();
      const { projectName } = values;

      // 更新项目
      await projectApi.updateProject(selectedProject, {
        name: projectName
      });

      // 重新加载项目列表
      await loadProjects();

      setIsEditProjectModalVisible(false);
      message.success('项目更新成功');
    } catch (errorInfo) {
      console.log('表单验证失败:', errorInfo);
      message.error('更新项目失败，请重试');
    }
  };

  // 处理删除项目
  const handleDeleteProject = async () => {
    try {
      // 删除项目
      await projectApi.deleteProject(selectedProject);

      // 重新加载项目列表
      await loadProjects();

      message.success('项目删除成功');
    } catch (error) {
      console.error('删除项目失败:', error);
      message.error('删除项目失败，请重试');
    }
  };

  // 处理创建项目表单提交
  const handleProjectModalOk = async () => {
    try {
      const values = await projectForm.validateFields();
      const { projectName, projectId } = values;

      // 生成唯一的项目ID（如果未提供）
      const newProjectId = projectId || (Date.now() % 10000).toString();

      // 创建新项目
      await projectApi.createProject({
        id: newProjectId,
        name: projectName
      });

      // 重新加载项目列表
      await loadProjects();

      // 选择新创建的项目
      setSelectedProject(newProjectId);

      setIsProjectModalVisible(false);
      message.success('新项目创建成功');
    } catch (errorInfo) {
      console.log('表单验证失败:', errorInfo);
      message.error('创建项目失败，请重试');
    }
  };

  return (
    <Content style={{ padding: '24px', minHeight: 280 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ display: 'flex', alignItems: 'center' }}>
          <FolderOutlined style={{ marginRight: 8 }} />
          项目管理
        </Title>
        <p>管理项目的目录结构，支持创建、编辑和删除目录。</p>
      </div>

      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Space>
            <Text strong>选择项目：</Text>
            <Select
              style={{ width: 200 }}
              value={selectedProject}
              onChange={setSelectedProject}
            >
              {projects.map(project => (
                <Option key={project.id} value={project.id}>{project.name}</Option>
              ))}
            </Select>
          </Space>
          <Space>
            <Button icon={<EditOutlined />} onClick={handleEditProject} disabled={!selectedProject}>
              编辑项目
            </Button>
            <Popconfirm
              title="确定要删除这个项目吗？"
              description="删除项目将同时删除该项目下的所有目录，此操作不可恢复！"
              onConfirm={handleDeleteProject}
              okText="确定"
              cancelText="取消"
              okButtonProps={{ danger: true }}
              disabled={!selectedProject}
            >
              <Button danger icon={<DeleteOutlined />} disabled={!selectedProject}>
                删除项目
              </Button>
            </Popconfirm>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateProject}>
              创建新项目
            </Button>
          </Space>
        </div>

        <Tree
          showLine
          defaultExpandAll
          expandedKeys={expandedKeys}
          onExpand={handleExpand}
          onSelect={(_selectedKeys: React.Key[], _info: any) => {
            // 节点选择处理
          }}
          onClick={handleNodeClick}
        >
          {renderTreeNodes(treeData)}
        </Tree>

        <div style={{ marginTop: 24 }}>
          <Space>
            <Button type="default" icon={<PlusOutlined />} onClick={() => handleAdd(selectedProject)}>
              添加目录
            </Button>
          </Space>
        </div>
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
              background: 'linear-gradient(180deg, transparent, #f97316, transparent)',
              animation: 'scanLine 2s linear infinite'
            }} />
            
            {/* 主标题区域 */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '16px',
              marginLeft: '16px'
            }}>
              {/* 方形圆角图标容器 */}
              <div style={{
                width: '44px',
                height: '44px',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {/* 方形圆角边框 */}
                <svg width="44" height="44" viewBox="0 0 44 44" style={{ position: 'absolute' }}>
                  <rect
                    x="4"
                    y="4"
                    width="36"
                    height="36"
                    rx="8"
                    fill="none"
                    stroke="url(#squareGradient)"
                    strokeWidth="2"
                    style={{ filter: 'drop-shadow(0 0 6px rgba(249, 115, 22, 0.6))' }}
                  />
                  <defs>
                    <linearGradient id="squareGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#f97316" />
                      <stop offset="100%" stopColor="#fbbf24" />
                    </linearGradient>
                  </defs>
                </svg>
                {/* 内部图标 */}
                <div style={{
                  fontSize: '20px',
                  color: '#f97316',
                  textShadow: '0 0 10px rgba(249, 115, 22, 0.8)',
                  zIndex: 1
                }}>
                  {editingNode ? '✏️' : '➕'}
                </div>
                {/* 角落装饰 */}
                <div style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  width: '8px',
                  height: '8px',
                  border: '2px solid #fbbf24',
                  borderRadius: '2px',
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
                  textShadow: '0 0 20px rgba(249, 115, 22, 0.5), 0 0 40px rgba(249, 115, 22, 0.3)',
                  fontFamily: "'Segoe UI', 'Roboto', sans-serif"
                }}>
                  {editingNode ? '编辑目录' : '添加目录'}
                </div>
                <div style={{
                  fontSize: '10px',
                  color: '#f97316',
                  letterSpacing: '3px',
                  marginTop: '4px',
                  fontFamily: "'Courier New', monospace",
                  opacity: 0.8
                }}>
                  {editingNode ? 'MODIFY DIRECTORY' : 'CREATE DIRECTORY'}
                </div>
              </div>
            </div>
            
            {/* 右侧：操作状态面板 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 16px',
              background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.05) 0%, rgba(251, 191, 36, 0.05) 100%)',
              border: '1px solid rgba(249, 115, 22, 0.2)',
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
                background: 'linear-gradient(90deg, transparent, rgba(249, 115, 22, 0.1), transparent)',
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
                    background: '#fbbf24',
                    boxShadow: '0 0 12px #fbbf24, 0 0 24px rgba(251, 191, 36, 0.4)',
                    animation: 'pulse 1.5s ease-in-out infinite'
                  }} />
                  <span style={{
                    fontSize: '11px',
                    color: '#fbbf24',
                    fontFamily: "'Courier New', monospace",
                    fontWeight: 600,
                    letterSpacing: '1px'
                  }}>{editingNode ? 'EDIT' : 'NEW'}</span>
                </div>
                <div style={{
                  fontSize: '9px',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontFamily: "'Courier New', monospace"
                }}>
                  PROJECT SYSTEM
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
                      background: 'linear-gradient(90deg, transparent, #f97316)',
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
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
          setEditingNode(null);
        }}
        className="project-mgmt-modal"
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
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(249, 115, 22, 0.1)'
          }
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="目录名称" name="name" rules={[{ required: true, message: '请输入目录名称' }]}>
            <Input placeholder="请输入目录名称" />
          </Form.Item>
          <Form.Item label="目录ID" name="id" rules={[{ required: true, message: '请输入目录ID' }]}>
            <Input placeholder="请输入目录ID" />
          </Form.Item>
          {/* 编辑目录时不显示父目录ID下拉框 */}
        </Form>
      </Modal>

      {/* 创建项目弹窗 */}
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
              background: 'linear-gradient(180deg, transparent, #10b981, transparent)',
              animation: 'scanLine 2s linear infinite'
            }} />
            
            {/* 主标题区域 */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '16px',
              marginLeft: '16px'
            }}>
              {/* 星形图标容器 */}
              <div style={{
                width: '44px',
                height: '44px',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {/* 星形边框 */}
                <svg width="44" height="44" viewBox="0 0 44 44" style={{ position: 'absolute' }}>
                  <polygon
                    points="22,2 26,16 40,16 29,24 33,38 22,30 11,38 15,24 4,16 18,16"
                    fill="none"
                    stroke="url(#starGradient)"
                    strokeWidth="2"
                    style={{ filter: 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.6))' }}
                  />
                  <defs>
                    <linearGradient id="starGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#34d399" />
                    </linearGradient>
                  </defs>
                </svg>
                {/* 内部图标 */}
                <div style={{
                  fontSize: '20px',
                  color: '#10b981',
                  textShadow: '0 0 10px rgba(16, 185, 129, 0.8)',
                  zIndex: 1
                }}>
                  🚀
                </div>
              </div>
              
              {/* 标题文字 */}
              <div>
                <div style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  letterSpacing: '2px',
                  color: '#fff',
                  textShadow: '0 0 20px rgba(16, 185, 129, 0.5), 0 0 40px rgba(16, 185, 129, 0.3)',
                  fontFamily: "'Segoe UI', 'Roboto', sans-serif"
                }}>
                  创建新项目
                </div>
                <div style={{
                  fontSize: '10px',
                  color: '#10b981',
                  letterSpacing: '3px',
                  marginTop: '4px',
                  fontFamily: "'Courier New', monospace",
                  opacity: 0.8
                }}>
                  CREATE NEW PROJECT
                </div>
              </div>
            </div>
            
            {/* 右侧：操作状态面板 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 16px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(52, 211, 153, 0.05) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
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
                background: 'linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.1), transparent)',
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
                    background: '#34d399',
                    boxShadow: '0 0 12px #34d399, 0 0 24px rgba(52, 211, 153, 0.4)',
                    animation: 'pulse 1.5s ease-in-out infinite'
                  }} />
                  <span style={{
                    fontSize: '11px',
                    color: '#34d399',
                    fontFamily: "'Courier New', monospace",
                    fontWeight: 600,
                    letterSpacing: '1px'
                  }}>NEW</span>
                </div>
                <div style={{
                  fontSize: '9px',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontFamily: "'Courier New', monospace"
                }}>
                  PROJECT SYSTEM
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
                      background: 'linear-gradient(90deg, transparent, #10b981)',
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
        open={isProjectModalVisible}
        onCancel={() => {
          setIsProjectModalVisible(false);
          projectForm.resetFields();
        }}
        className="project-create-modal"
        footer={null}
        mask={true}
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
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(16, 185, 129, 0.1)'
          },
          footer: {
            display: 'none'
          }
        }}
      >
        <Form form={projectForm} layout="vertical">
          <Form.Item label="项目名称" name="projectName" rules={[{ required: true, message: '请输入项目名称' }]}>
            <Input placeholder="请输入项目名称" />
          </Form.Item>
          <Form.Item label="项目ID" name="projectId">
            <Input placeholder="请输入项目ID（非必填）" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, marginTop: 24, textAlign: 'right' }}>
            <Button onClick={() => {
              setIsProjectModalVisible(false);
              projectForm.resetFields();
            }} style={{ marginRight: 8 }}>
              取消
            </Button>
            <Button type="primary" onClick={handleProjectModalOk}>
              确定
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑项目弹窗 */}
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
              background: 'linear-gradient(180deg, transparent, #8b5cf6, transparent)',
              animation: 'scanLine 2s linear infinite'
            }} />
            
            {/* 主标题区域 */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '16px',
              marginLeft: '16px'
            }}>
              {/* 八角形图标容器 */}
              <div style={{
                width: '44px',
                height: '44px',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {/* 八角形边框 */}
                <svg width="44" height="44" viewBox="0 0 44 44" style={{ position: 'absolute' }}>
                  <polygon
                    points="22,4 32,8 38,18 38,26 32,36 22,40 12,36 6,26 6,18 12,8"
                    fill="none"
                    stroke="url(#octagonGradient)"
                    strokeWidth="2"
                    style={{ filter: 'drop-shadow(0 0 6px rgba(139, 92, 246, 0.6))' }}
                  />
                  <defs>
                    <linearGradient id="octagonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#a78bfa" />
                    </linearGradient>
                  </defs>
                </svg>
                {/* 内部图标 */}
                <div style={{
                  fontSize: '20px',
                  color: '#8b5cf6',
                  textShadow: '0 0 10px rgba(139, 92, 246, 0.8)',
                  zIndex: 1
                }}>
                  ✏️
                </div>
              </div>
              
              {/* 标题文字 */}
              <div>
                <div style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  letterSpacing: '2px',
                  color: '#fff',
                  textShadow: '0 0 20px rgba(139, 92, 246, 0.5), 0 0 40px rgba(139, 92, 246, 0.3)',
                  fontFamily: "'Segoe UI', 'Roboto', sans-serif"
                }}>
                  编辑项目
                </div>
                <div style={{
                  fontSize: '10px',
                  color: '#8b5cf6',
                  letterSpacing: '3px',
                  marginTop: '4px',
                  fontFamily: "'Courier New', monospace",
                  opacity: 0.8
                }}>
                  EDIT PROJECT
                </div>
              </div>
            </div>
            
            {/* 右侧：操作状态面板 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 16px',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(167, 139, 250, 0.05) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
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
                background: 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.1), transparent)',
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
                    background: '#a78bfa',
                    boxShadow: '0 0 12px #a78bfa, 0 0 24px rgba(167, 139, 250, 0.4)',
                    animation: 'pulse 1.5s ease-in-out infinite'
                  }} />
                  <span style={{
                    fontSize: '11px',
                    color: '#a78bfa',
                    fontFamily: "'Courier New', monospace",
                    fontWeight: 600,
                    letterSpacing: '1px'
                  }}>EDIT</span>
                </div>
                <div style={{
                  fontSize: '9px',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontFamily: "'Courier New', monospace"
                }}>
                  PROJECT SYSTEM
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
                      background: 'linear-gradient(90deg, transparent, #8b5cf6)',
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
        open={isEditProjectModalVisible}
        onCancel={() => {
          setIsEditProjectModalVisible(false);
          editProjectForm.resetFields();
        }}
        className="project-edit-modal"
        footer={null}
        mask={true}
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
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(139, 92, 246, 0.1)'
          },
          footer: {
            display: 'none'
          }
        }}
      >
        <Form form={editProjectForm} layout="vertical">
          <Form.Item label="项目名称" name="projectName" rules={[{ required: true, message: '请输入项目名称' }]}>
            <Input placeholder="请输入项目名称" />
          </Form.Item>
          <Form.Item label="项目ID" name="projectId">
            <Input placeholder="项目ID" disabled />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, marginTop: 24, textAlign: 'right' }}>
            <Button onClick={() => {
              setIsEditProjectModalVisible(false);
              editProjectForm.resetFields();
            }} style={{ marginRight: 8 }}>
              取消
            </Button>
            <Button type="primary" onClick={handleEditProjectModalOk}>
              确定
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </Content>
  );
};

export default ProjectManagementPage;