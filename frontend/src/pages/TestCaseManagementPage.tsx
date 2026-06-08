import React, { useState, useEffect, useMemo } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Tag,
  message,
  Popconfirm,
  Row,
  Col,
  Typography,
  Empty,
  Tree,
  Spin,
  Layout,
  Tooltip,
  Card,
  Statistic,
  Upload,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  FolderOutlined,
  FileTextOutlined,
  DatabaseOutlined,
  SearchOutlined,
  TagOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  UploadOutlined,
  DownloadOutlined,
  InboxOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
// 修复导入问题
import { testCaseService } from '../services/testCaseService';
import { systemApi } from '../services/systemApi';
import { TestCase, TestCaseStatus, TestCasePriority } from '../types/testCase';
import { System, Module, Scenario } from '../types';
import { STATUS_OPTIONS_EDITABLE, STATUS_OPTIONS_FILTER, getStatusColor, getStatusText } from '../utils/statusConfig';
import { PRIORITY_OPTIONS, getPriorityColor, getPriorityText } from '../utils/priorityConfig';
import type { ColumnsType } from 'antd/es/table';
import { getDetailViewData } from '../services/detailService';
import { batchService } from '../services/batchService';
import { useTheme } from '../contexts/ThemeContext';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { Sider, Content } = Layout;

interface TreeNode {
  key: string;
  title: string;
  type: 'system' | 'module' | 'scenario';
  id: number;
  systemId?: number;
  moduleId?: number;
  children?: TreeNode[];
  isLeaf?: boolean;
  icon?: React.ReactNode;
}

interface SelectedNode {
  type: 'system' | 'module' | 'scenario' | null;
  id: number | null;
}

interface StatusFilterProps {
  selectedStatus: string[];
  onStatusChange: (status: string[]) => void;
}

// 左侧树形组件
const SystemTreeView: React.FC<{
  data: TreeNode[];
  onSelect: (selectedNode: SelectedNode) => void;
  loading?: boolean;
  selectedKeys?: React.Key[];
}> = ({ data, onSelect, loading, selectedKeys = [] }) => {
  const [internalSelectedKeys, setInternalSelectedKeys] = useState<React.Key[]>(selectedKeys);

  // 同步外部selectedKeys
  useEffect(() => {
    setInternalSelectedKeys(selectedKeys);
  }, [selectedKeys]);

  const handleTreeSelect = (_keys: React.Key[], info: any) => {
    if (info.node) {
      const node = info.node as TreeNode;
      const newSelectedKey = `${node.type}-${node.id}`;
      
      // 始终设置为选中状态，不允许取消
      setInternalSelectedKeys([newSelectedKey]);
      
      // 通知父组件选择变化
      onSelect({
        type: node.type,
        id: node.id,
      });
    }
  };

  const renderTitle = (node: TreeNode) => (
    <Space>
      {node.icon}
      <span>{node.title}</span>
    </Space>
  );

  const transformTreeData = (nodes: TreeNode[]): any[] => {
    return nodes.map(node => ({
      ...node,
      title: renderTitle(node),
      children: node.children ? transformTreeData(node.children) : undefined,
    }));
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <Spin />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <Empty 
          description="暂无系统数据" 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </div>
    );
  }

  return (
    <Tree
      treeData={transformTreeData(data)}
      onSelect={handleTreeSelect}
      selectedKeys={internalSelectedKeys}
      showLine
      defaultExpandAll
      style={{ padding: '8px' }}
    />
  );
};

// 状态筛选器组件
const StatusFilter: React.FC<StatusFilterProps> = ({ selectedStatus, onStatusChange }) => {
  return (
    <Select
      mode="multiple"
      placeholder="状态筛选"
      value={selectedStatus}
      onChange={onStatusChange}
      style={{ width: 200 }}
      maxTagCount={1}
      maxTagTextLength={4}
      maxTagPlaceholder={`+${selectedStatus?.length - 1}`}
    >
      {STATUS_OPTIONS_FILTER.map(({ value, label }) => (
        <Option key={value} value={value}>
          {label}
        </Option>
      ))}
    </Select>
  );
};

// 状态统计卡片组件
const StatusStatistics: React.FC<{
  testCases: TestCase[];
  onStatusClick?: (status: string) => void;
}> = ({ testCases, onStatusClick }) => {
  const { isDark } = useTheme();
  
  const stats = useMemo(() => {
    // 添加防御性检查，确保 testCases 是数组
    const safeTestCases = Array.isArray(testCases) ? testCases : [];
    const statusCount = safeTestCases.reduce((acc, tc) => {
      acc[tc.status] = (acc[tc.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      {
        title: '总用例',
        value: safeTestCases.length,
        icon: <DatabaseOutlined />,
        color: '#1890ff',
      },
      {
        title: '待测试',
        value: statusCount.PENDING || 0,
        icon: <ClockCircleOutlined />,
        color: '#faad14',
      },
      {
        title: '通过',
        value: statusCount.PASSED || 0,
        icon: <CheckCircleOutlined />,
        color: '#52c41a',
      },
      {
        title: '失败',
        value: statusCount.FAILED || 0,
        icon: <ExclamationCircleOutlined />,
        color: '#ff4d4f',
      },
    ];
  }, [testCases]);

  return (
    <Row gutter={16} style={{ marginBottom: 24 }}>
      {stats.map((stat) => (
        <Col span={4} key={stat.title}>
          <Card
            hoverable
            onClick={() => onStatusClick?.(stat.title)}
            style={{ 
              borderRadius: 12,
              background: isDark ? 'transparent' : '#ffffff',
              border: isDark ? `1px solid ${stat.color}60` : '1px solid #e5e7eb',
              boxShadow: isDark 
                ? '0 4px 12px rgba(0, 0, 0, 0.3)'
                : '0 2px 8px rgba(0,0,0,0.1)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: 'pointer',
            }}
            bodyStyle={{ padding: '16px 20px' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = isDark
                ? `0 20px 40px rgba(0, 0, 0, 0.5), 0 0 30px ${stat.color}40, 0 0 60px ${stat.color}20`
                : '0 20px 40px rgba(0, 0, 0, 0.15)';
              e.currentTarget.style.borderColor = isDark ? stat.color : '#e5e7eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = isDark 
                ? '0 4px 12px rgba(0, 0, 0, 0.3)'
                : '0 2px 8px rgba(0,0,0,0.1)';
              e.currentTarget.style.borderColor = isDark ? `${stat.color}60` : '#e5e7eb';
            }}
          >
            <Statistic
              title={stat.title}
              value={stat.value}
              prefix={
                <span style={{ color: stat.color, fontSize: 18 }}>
                  {stat.icon}
                </span>
              }
              valueStyle={{ color: stat.color, fontSize: 20, fontWeight: 'bold' }}
            />
          </Card>
        </Col>
      ))}
    </Row>
  );
};

// 主页面组件
export const TestCaseManagementPage: React.FC = () => {
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [filteredTestCases, setFilteredTestCases] = useState<TestCase[]>([]);
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [treeLoading, setTreeLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTestCase, setEditingTestCase] = useState<TestCase | null>(null);
  const [selectedNode, setSelectedNode] = useState<SelectedNode>({ type: null, id: null });
  const [selectedTreeKeys, setSelectedTreeKeys] = useState<React.Key[]>([]); // 新增：树形选择高亮状态

  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [form] = Form.useForm();

  // 级联选择相关状态
  const [systems, setSystems] = useState<System[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loadingSystems, setLoadingSystems] = useState(false);
  const [loadingModules, setLoadingModules] = useState(false);
  const [loadingScenarios, setLoadingScenarios] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // 获取树形数据
  // 在获取树形数据后，初始化高亮状态
  const fetchTreeData = async () => {
    setTreeLoading(true);
    try {
      const response = await systemApi.getSystemTree();
      // 转换数据结构为树形组件需要的格式
      const treeNodes = response.map(system => ({
        key: `system-${system.id}`,
        title: system.name,
        type: 'system' as const,
        id: system.id,
        icon: <DatabaseOutlined />,
        children: system.modules.map(module => ({
          key: `module-${module.id}`,
          title: module.name,
          type: 'module' as const,
          id: module.id,
          icon: <FolderOutlined />,
          children: module.scenarios?.map(scenario => ({
            key: `scenario-${scenario.id}`,
            title: scenario.name,
            type: 'scenario' as const,
            id: scenario.id,
            icon: <FileTextOutlined />,
          })) || [],
        })),
      }));
      setTreeData(treeNodes);
      
      // 如果有选中的节点，初始化高亮状态
      if (selectedNode.type && selectedNode.id) {
        const initialKey = getTreeKey(selectedNode);
        if (initialKey) {
          setSelectedTreeKeys([initialKey]);
        }
      }
    } catch (error) {
      console.error('获取树形数据失败:', error);
      message.error('获取系统数据失败');
    } finally {
      setTreeLoading(false);
    }
  };

  // 替换现有的 fetchTestCases 方法
  
  // 获取测试用例列表（按层级过滤）
  const fetchTestCases = async (filter?: SelectedNode) => {
    setLoading(true);
    try {
      let data: TestCase[];
      // totalCount is declared but not used - removing to fix TypeScript error
  
      if (filter?.type && filter?.id) {
        // 使用新的层级过滤API
        const params: any = {};
        
        // 根据节点类型设置对应的过滤参数
        switch (filter.type) {
          case 'system':
            params.systemId = filter.id;
            break;
          case 'module':
            params.moduleId = filter.id;
            break;
          case 'scenario':
            params.scenarioId = filter.id;
            break;
        }
        
        const response = await testCaseService.getTestCasesByHierarchy(params);
        data = response.testCases;
      } else {
        // 显示所有测试用例
        const response = await testCaseService.getTestCasesByHierarchy({});
        data = response.testCases;
      }
      
      setTestCases(data);
      setFilteredTestCases(data);
    } catch (error) {
      console.error('获取测试用例失败:', error);
      message.error('获取测试用例失败');
    } finally {
      setLoading(false);
    }
  };
  
  // 处理树节点选择
  // 工具函数：将SelectedNode转换为Tree key
  const getTreeKey = (node: SelectedNode): string => {
  if (!node.type || !node.id) return '';
  return `${node.type}-${node.id}`;
  };
  
  // 更新后的handleTreeSelect方法
  const handleTreeSelect = (node: SelectedNode) => {
  if (node.type === null) {
  return;
  }
  
  // 更新选中节点状态
  setSelectedNode(node);
  
  // 更新树形高亮状态
  const newTreeKey = getTreeKey(node);
  if (newTreeKey) {
  setSelectedTreeKeys([newTreeKey]);
  }
  
  // 获取过滤后的测试用例
  fetchTestCases(node);
  };

  // 组件加载时初始化数据
  useEffect(() => {
    fetchTreeData();
    fetchTestCases();
  }, []);

  // 当测试用例数据变化时，重新应用状态筛选
  useEffect(() => {
    if (selectedStatus.length === 0) {
      setFilteredTestCases(testCases);
    } else {
      const filtered = testCases.filter(testCase => selectedStatus.includes(testCase.status));
      setFilteredTestCases(filtered);
    }
  }, [testCases, selectedStatus]);

  // 保留现有的级联选择逻辑用于模态框
  const loadSystems = async () => {
    setLoadingSystems(true);
    try {
      const data = await systemApi.getSystems();
      setSystems(data);
    } catch (error: any) {
      message.error('加载系统列表失败');
    } finally {
      setLoadingSystems(false);
    }
  };

  const loadModules = async (systemId: number) => {
    setLoadingModules(true);
    try {
      const data = await systemApi.getModules(systemId);
      setModules(data);
    } catch (error: any) {
      message.error('加载模块列表失败');
    } finally {
      setLoadingModules(false);
    }
  };

  const loadScenarios = async (moduleId: number) => {
    setLoadingScenarios(true);
    try {
      const data = await systemApi.getScenarios(moduleId);
      setScenarios(data);
    } catch (error: any) {
      message.error('加载场景列表失败');
    } finally {
      setLoadingScenarios(false);
    }
  };

  // 打开新建/编辑模态框
  const openModal = async (testCase?: TestCase) => {
    // 立即加载系统数据
    await loadSystems();
    
    setModalVisible(true);
    
    setTimeout(async () => {
      if (testCase) {
        setEditingTestCase(testCase);
        form.setFieldsValue({
          ...testCase,
          tags: testCase.tags?.join(', '),
        });
        
        if (testCase.systemId) {
          await loadModules(testCase.systemId);
          if (testCase.moduleId) {
            await loadScenarios(testCase.moduleId);
          }
        }
      } else {
        setEditingTestCase(null);
        form.resetFields();
      }
    }, 100);
  };

  const handleAdd = () => {
    setEditingTestCase(null);
    openModal();
  };

  const handleEdit = (testCase: TestCase) => {
    // 关闭可能存在的详情模态框
    Modal.destroyAll();
    openModal(testCase);
  };



  // 处理详情查看
  const handleView = async (testCase: TestCase) => {
    try {
      // 获取层级信息
      const detailData = await getDetailViewData(
        testCase.systemId,
        testCase.moduleId,
        testCase.scenarioId
      );
  
      Modal.info({
        title: '测试用例详情',
        width: 1200,
        content: (
          <div style={{ marginTop: 16 }}>
            <div style={{ 
              background: '#f9f9f9',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <h4>基本信息</h4>
              <p><strong>标题：</strong>{testCase.title}</p>
              <p><strong>系统：</strong>{detailData.systemName}</p>
              <p><strong>模块：</strong>{detailData.moduleName}</p>
              <p><strong>场景：</strong>
                {detailData.scenarioName && testCase.title 
                  ? `${detailData.scenarioName} - ${testCase.title}`
                  : detailData.scenarioName || testCase.title || '未设置'}
              </p>
            </div>

            <div style={{ 
              background: '#f5f5f5',
              padding: '8px 16px',
              borderRadius: '4px',
              marginBottom: '16px'
            }}>
              <p style={{ margin: 0, fontSize: '14px' }}>
                <strong>状态：</strong>
                <Tag 
                  color={getStatusColor(testCase.status)}
                  style={{ margin: '0 4px', fontSize: '13px' }}
                >
                  {getStatusText(testCase.status)}
                </Tag>
                <span style={{ margin: '0 12px', color: '#d9d9d9' }}>|</span>
                <strong>优先级：</strong>
                <Tag 
                  color={getPriorityColor(testCase.priority)}
                  style={{ margin: '0 4px', fontSize: '13px' }}
                >
                  {getPriorityText(testCase.priority)}
                </Tag>
              </p>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <h4>前置条件</h4>
              <p>{testCase.preconditions}</p>
            </div>
            
            <Row gutter={16} style={{ marginBottom: '16px' }}>
              <Col span={12}>
                <Card 
                  title="测试步骤" 
                  size="small"
                  style={{ backgroundColor: '#f5f5f5' }}
                >
                  <pre style={{ 
                    margin: 0, 
                    whiteSpace: 'pre-wrap', 
                    fontFamily: 'inherit',
                    maxHeight: '300px',
                    overflow: 'auto'
                  }}>
                    {testCase.steps}
                  </pre>
                </Card>
              </Col>
              <Col span={12}>
                <Card 
                  title="预期结果" 
                  size="small"
                  style={{ backgroundColor: '#f5f5f5' }}
                >
                  <pre style={{ 
                    margin: 0, 
                    whiteSpace: 'pre-wrap', 
                    fontFamily: 'inherit',
                    maxHeight: '300px',
                    overflow: 'auto'
                  }}>
                    {formatExpectedResult(testCase.expectedResult)}
                  </pre>
                </Card>
              </Col>
            </Row>
            
            <div style={{ marginBottom: '16px' }}>
              <h4>标签</h4>
              <Space wrap>
                {testCase.tags?.map(tag => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </Space>
            </div>
          </div>
        ),
      });
    } catch (error) {
      console.error('获取详情数据失败:', error);
      // 降级展示
      Modal.info({
        title: '测试用例详情',
        width: 1200,
        content: (
          <div style={{ marginTop: 16 }}>
            <div style={{ 
              background: '#fff2e8',
              padding: '12px 16px',
              borderRadius: '6px',
              marginBottom: '16px',
              borderLeft: '4px solid #ff4d4f'
            }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#fa541c' }}>
                ⚠️ 层级信息加载失败，仅展示基础信息
              </p>
            </div>
            
            <p><strong>标题：</strong>{testCase.title}</p>
            
            <div style={{ 
              background: '#f5f5f5',
              padding: '8px 16px',
              borderRadius: '4px',
              marginBottom: '16px'
            }}>
              <p style={{ margin: 0, fontSize: '14px' }}>
                <strong>状态：</strong>
                <Tag 
                  color={getStatusColor(testCase.status)}
                  style={{ margin: '0 4px', fontSize: '13px' }}
                >
                  {getStatusText(testCase.status)}
                </Tag>
                <span style={{ margin: '0 12px', color: '#d9d9d9' }}>|</span>
                <strong>优先级：</strong>
                <Tag 
                  color={getPriorityColor(testCase.priority)}
                  style={{ margin: '0 4px', fontSize: '13px' }}
                >
                  {getPriorityText(testCase.priority)}
                </Tag>
              </p>
            </div>
            
            <p><strong>前置条件：</strong>{testCase.preconditions}</p>
            <Row gutter={16} style={{ marginBottom: '16px' }}>
              <Col span={12}>
                <Card 
                  title="测试步骤" 
                  size="small"
                  style={{ backgroundColor: '#f5f5f5' }}
                >
                  <pre style={{ 
                    margin: 0, 
                    whiteSpace: 'pre-wrap', 
                    fontFamily: 'inherit',
                    maxHeight: '300px',
                    overflow: 'auto'
                  }}>
                    {testCase.steps}
                  </pre>
                </Card>
              </Col>
              <Col span={12}>
                <Card 
                  title="预期结果" 
                  size="small"
                  style={{ backgroundColor: '#f5f5f5' }}
                >
                  <pre style={{ 
                    margin: 0, 
                    whiteSpace: 'pre-wrap', 
                    fontFamily: 'inherit',
                    maxHeight: '300px',
                    overflow: 'auto'
                  }}>
                    {formatExpectedResult(testCase.expectedResult)}
                  </pre>
                </Card>
              </Col>
            </Row>
            <p><strong>标签：</strong>
              <Space wrap>
                {testCase.tags?.map(tag => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </Space>
            </p>
          </div>
        ),
      });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await testCaseService.deleteTestCase(id);
      message.success('删除成功');
      fetchTestCases(selectedNode);
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSystemChange = async (systemId: number) => {
    form.setFieldsValue({ moduleId: undefined, scenarioId: undefined });
    setModules([]);
    setScenarios([]);
    
    if (systemId) {
      loadModules(systemId);
    }
  };

  const handleModuleChange = (moduleId: number) => {
    form.setFieldsValue({ scenarioId: undefined });
    setScenarios([]);
    
    if (moduleId) {
      loadScenarios(moduleId);
    }
  };

  const handleSubmit = async (values: any) => {
    setFormSubmitting(true);
    try {
      const processedValues = {
        ...values,
        tags: values.tags ? values.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean) : [],
      };
  
      if (editingTestCase) {
        await testCaseService.updateTestCase(editingTestCase.id, processedValues);
        message.success('更新成功');
      } else {
        await testCaseService.createTestCase(processedValues);
        message.success('创建成功');
      }
      
      setModalVisible(false);
      fetchTestCases(selectedNode);
    } catch (error: any) {
      message.error(error.response?.data?.error || '操作失败');
    } finally {
      setFormSubmitting(false);
    }
  };

  // 格式化预期结果，按序号换行处理
  const formatExpectedResult = (result: string) => {
    if (!result) return result;

    // 按行分割
    const lines = result.split('\n');

    // 处理每行，为序号添加缩进
    const formattedLines = lines.map(line => {
      // 匹配序号格式（如：1.、2.、1)、2)等）
      const match = line.match(/^(\d+[\.\)])\s*/);
      if (match) {
        const numberPart = match[1];
        const content = line.substring(match[0].length);
        return `${numberPart} ${content}`;
      }
      return line;
    });

    return formattedLines.join('\n');
  };

  const handleModalCancel = () => {
    Modal.confirm({
      title: '确认取消',
      content: '确定要取消编辑吗？未保存的更改将丢失。',
      okText: '确定',
      cancelText: '继续编辑',
      onOk: () => {
        setModalVisible(false);
        form.resetFields();
      },
    });
  };

  return (
    <Layout style={{ height: '100vh', background: 'var(--bg-layout, #f5f5f5)' }}>
      <Sider
        width="22.5%"
        style={{
          background: 'var(--bg-container, #fff)',
          borderRight: '1px solid var(--border-color, #f0f0f0)',
          overflow: 'auto',
          minWidth: 300,
        }}
        collapsible={false}
      >
        <div style={{
          padding: '16px',
          borderBottom: '1px solid var(--border-color, #f0f0f0)',
          background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)',
          color: '#fff',
        }}>
          <Title level={4} style={{ margin: 0, color: '#fff' }}>
            系统列表
          </Title>
        </div>
        <SystemTreeView
          data={treeData}
          onSelect={handleTreeSelect}
          loading={treeLoading}
          selectedKeys={selectedTreeKeys}
        />
      </Sider>
      
      <Layout style={{ background: 'var(--bg-primary, #0f172a)' }}>
        <Content style={{
          padding: 24,
          overflow: 'auto',
          background: 'var(--bg-primary, #0f172a)',
        }}>
          {/* 状态统计 */}
          <StatusStatistics
            testCases={filteredTestCases}
            onStatusClick={(status) => {
              const statusMap: Record<string, string> = {
                '总用例': '',
                '待测试': 'PENDING',
                '通过': 'PASSED',
                '失败': 'FAILED',
              };
              const statusValue = statusMap[status];
              if (statusValue !== undefined) {
                setSelectedStatus(statusValue ? [statusValue] : []);
              }
            }}
          />

          {/* 增强的测试用例列表视图 */}
          <EnhancedTestCaseList
            testCases={filteredTestCases}
            loading={loading}
            onAdd={handleAdd}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={handleView}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
          />
        </Content>
      </Layout>

      {/* 模态框 */}
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
              background: 'linear-gradient(180deg, transparent, #14b8a6, transparent)',
              animation: 'scanLine 2s linear infinite'
            }} />
            
            {/* 主标题区域 */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '16px',
              marginLeft: '16px'
            }}>
              {/* 三角形图标容器 */}
              <div style={{
                width: '44px',
                height: '44px',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {/* 三角形边框 */}
                <svg width="44" height="44" viewBox="0 0 44 44" style={{ position: 'absolute' }}>
                  <polygon
                    points="22,6 38,36 6,36"
                    fill="none"
                    stroke="url(#triangleGradient)"
                    strokeWidth="2"
                    style={{ filter: 'drop-shadow(0 0 6px rgba(20, 184, 166, 0.6))' }}
                  />
                  <defs>
                    <linearGradient id="triangleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#14b8a6" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                </svg>
                {/* 内部图标 */}
                <div style={{
                  fontSize: '18px',
                  color: '#14b8a6',
                  textShadow: '0 0 10px rgba(20, 184, 166, 0.8)',
                  zIndex: 1,
                  marginTop: '4px'
                }}>
                  {editingTestCase ? '✏️' : '📝'}
                </div>
              </div>
              
              {/* 标题文字 */}
              <div>
                <div style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  letterSpacing: '2px',
                  color: '#fff',
                  textShadow: '0 0 20px rgba(20, 184, 166, 0.5), 0 0 40px rgba(20, 184, 166, 0.3)',
                  fontFamily: "'Segoe UI', 'Roboto', sans-serif"
                }}>
                  {editingTestCase ? '编辑测试用例' : '新建测试用例'}
                </div>
                <div style={{
                  fontSize: '10px',
                  color: '#14b8a6',
                  letterSpacing: '3px',
                  marginTop: '4px',
                  fontFamily: "'Courier New', monospace",
                  opacity: 0.8
                }}>
                  {editingTestCase ? 'EDIT TEST CASE' : 'CREATE TEST CASE'}
                </div>
              </div>
            </div>
            
            {/* 右侧：操作状态面板 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 16px',
              background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.05) 0%, rgba(6, 182, 212, 0.05) 100%)',
              border: '1px solid rgba(20, 184, 166, 0.2)',
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
                background: 'linear-gradient(90deg, transparent, rgba(20, 184, 166, 0.1), transparent)',
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
                    background: '#06b6d4',
                    boxShadow: '0 0 12px #06b6d4, 0 0 24px rgba(6, 182, 212, 0.4)',
                    animation: 'pulse 1.5s ease-in-out infinite'
                  }} />
                  <span style={{
                    fontSize: '11px',
                    color: '#06b6d4',
                    fontFamily: "'Courier New', monospace",
                    fontWeight: 600,
                    letterSpacing: '1px'
                  }}>{editingTestCase ? 'EDIT' : 'NEW'}</span>
                </div>
                <div style={{
                  fontSize: '9px',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontFamily: "'Courier New', monospace"
                }}>
                  TEST MANAGEMENT
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
                      background: 'linear-gradient(90deg, transparent, #14b8a6)',
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
        onCancel={handleModalCancel}
        onOk={() => form.submit()}
        confirmLoading={formSubmitting}
        width={1200}
        className="test-case-modal"
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
            padding: '24px'
          },
          content: {
            backgroundColor: 'var(--bg-container, #1e293b)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(20, 184, 166, 0.1)'
          }
        }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            label="标题"
            name="title"
            rules={[
              { required: true, message: '请输入测试用例标题' },
              { min: 5, message: '标题至少需要5个字符' },
              { max: 200, message: '标题不能超过200个字符' }
            ]}
          >
            <Input 
              placeholder="请输入测试用例标题" 
              maxLength={200}
              showCount
            />
          </Form.Item>
  
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="系统"
                name="systemId"
                rules={[{ required: true, message: '请选择系统' }]}
              >
                <Select 
                  placeholder="请选择系统"
                  onChange={handleSystemChange}
                  loading={loadingSystems}
                >
                  {systems.map(system => (
                    <Option key={system.id} value={system.id}>
                      {system.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="功能模块"
                name="moduleId"
                rules={[{ required: true, message: '请选择功能模块' }]}
              >
                <Select 
                  placeholder="请选择功能模块"
                  onChange={handleModuleChange}
                  loading={loadingModules}
                  disabled={!form.getFieldValue('systemId')}
                >
                  {modules.map(module => (
                    <Option key={module.id} value={module.id}>
                      {module.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label={
                  <span>
                    功能场景
                    <Tooltip title="功能场景为可选项，可以为空">
                      <QuestionCircleOutlined style={{ marginLeft: 4, color: '#8c8c8c' }} />
                    </Tooltip>
                  </span>
                }
                name="scenarioId"
              >
                <Select
                  placeholder="请选择功能场景（可选）"
                  loading={loadingScenarios}
                  disabled={!form.getFieldValue('moduleId')}
                  allowClear
                >
                  {scenarios.map(scenario => (
                    <Option key={scenario.id} value={scenario.id}>
                      {scenario.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
  
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="状态"
                name="status"
                initialValue="PENDING"
                rules={[{ required: true, message: '请选择状态' }]}
              >
                <Select placeholder="请选择状态">
                  {STATUS_OPTIONS_EDITABLE.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="优先级"
                name="priority"
                initialValue="MEDIUM"
                rules={[{ required: true, message: '请选择优先级' }]}
              >
                <Select placeholder="请选择优先级">
                  {PRIORITY_OPTIONS.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
  
          <Form.Item
            label="前置条件"
            name="preconditions"
            rules={[
              { required: true, message: '请输入前置条件' },
              { max: 1000, message: '前置条件不能超过1000个字符' }
            ]}
          >
            <TextArea
              rows={3}
              placeholder="请输入测试前置条件"
              maxLength={1000}
              showCount
            />
          </Form.Item>
  
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="测试步骤"
                name="steps"
                rules={[
                  { required: true, message: '请输入测试步骤' },
                  { max: 2000, message: '测试步骤不能超过2000个字符' }
                ]}
              >
                <TextArea
                  rows={6}
                  placeholder="请输入详细的测试步骤"
                  maxLength={2000}
                  showCount
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="预期结果"
                name="expectedResult"
                rules={[
                  { required: true, message: '请输入预期结果' },
                  { max: 2000, message: '预期结果不能超过2000个字符' }
                ]}
              >
                <TextArea
                  rows={6}
                  placeholder="请输入预期结果"
                  maxLength={2000}
                  showCount
                />
              </Form.Item>
            </Col>
          </Row>
  
          <Form.Item 
            label="标签" 
            name="tags"
            rules={[
              { max: 500, message: '标签不能超过500个字符' }
            ]}
          >
            <Input.TextArea
              rows={2}
              placeholder="请输入标签，用逗号分隔"
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

// 增强的测试用例列表组件
const EnhancedTestCaseList: React.FC<{
  testCases: TestCase[];
  loading?: boolean;
  onAdd: () => void;
  onEdit: (testCase: TestCase) => void;
  onDelete: (id: number) => void;
  onView: (testCase: TestCase) => void;
  selectedStatus: string[];
  onStatusChange: (status: string[]) => void;
}> = ({ testCases, loading, onAdd, onEdit, onDelete, onView, selectedStatus, onStatusChange }) => {
  
  const [searchText, setSearchText] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [filteredData, setFilteredData] = useState<TestCase[]>(testCases);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<TestCase[]>([]);
  
  // 批量操作状态
  const [batchImportModalVisible, setBatchImportModalVisible] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [importStatus, setImportStatus] = useState<'idle' | 'validating' | 'importing' | 'completed' | 'error'>('idle');
  const [importResult, setImportResult] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [fileList, setFileList] = useState<any[]>([]);

  // 整合筛选逻辑
  useEffect(() => {
    let filtered = [...testCases];

    // 按名称筛选
    if (searchText) {
      filtered = filtered.filter(tc => 
        tc.title.toLowerCase().includes(searchText.toLowerCase()) ||
        tc.preconditions?.toLowerCase().includes(searchText.toLowerCase()) ||
        tc.steps?.toLowerCase().includes(searchText.toLowerCase()) ||
        tc.expectedResult?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // 按标签筛选
    if (tagFilter) {
      filtered = filtered.filter(tc => 
        tc.tags?.some(tag => tag.toLowerCase().includes(tagFilter.toLowerCase()))
      );
    }

    // 按状态筛选
    if (selectedStatus.length > 0) {
      filtered = filtered.filter(tc => selectedStatus.includes(tc.status));
    }

    setFilteredData(filtered);
  }, [testCases, searchText, tagFilter, selectedStatus]);

  // 序号映射工具函数
  const addDisplayIndex = (testCases: TestCase[]): Array<TestCase & { displayIndex: number }> => {
    return testCases.map((testCase, index) => ({
      ...testCase,
      displayIndex: index + 1
    }));
  };

  const displayData = useMemo(() => {
    return addDisplayIndex(filteredData);
  }, [filteredData]);

  // 行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys: React.Key[], selectedRows: TestCase[]) => {
      setSelectedRowKeys(selectedKeys);
      setSelectedRows(selectedRows);
    },
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedRows.length === 0) return;
    
    Modal.confirm({
      title: '确认批量删除',
      content: `确定要删除选中的 ${selectedRows.length} 个测试用例吗？此操作不可恢复。`,
      okText: '确定删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const ids = selectedRows.map(row => row.id);
          await batchService.deleteTestCases(ids);
          message.success(`成功删除 ${ids.length} 个测试用例`);
          setSelectedRowKeys([]);
          setSelectedRows([]);
          // 重新加载数据
          window.location.reload();
        } catch (error) {
          message.error('批量删除失败');
        }
      },
    });
  };

  // 批量导入
  const handleBatchImport = async (file: File) => {
    setImportStatus('validating');
    try {
      const result = await batchService.importTestCases(file, 'skip');
      
      // 使用轮询获取最终导入结果
      setImportStatus('importing');
      
      await batchService.pollImportProgress(result.jobId, (progress) => {
        setImportResult(progress);
        
        if (progress.status === 'completed') {
          setImportStatus('completed');
          
          if (progress.success > 0) {
            message.success(`成功导入 ${progress.success} 个测试用例`);
            // 重新加载数据
            setTimeout(() => window.location.reload(), 1000);
          } else if (progress.failed > 0) {
            message.warning(`导入完成，成功：${progress.success}，失败：${progress.failed}`);
          } else {
            message.info('没有数据被导入');
          }
        } else if (progress.status === 'failed') {
          setImportStatus('error');
          message.error('导入失败');
        }
      });
      
    } catch (error: any) {
      setValidationErrors(error.validationErrors || []);
      setImportStatus('error');
      message.error('导入失败');
    }
  };

  // 下载模板
  const handleDownloadTemplate = () => {
    batchService.downloadImportTemplate();
  };

  // 批量导出
  const handleBatchExport = async () => {
    if (selectedRows.length === 0) {
      message.warning('请先选择要导出的测试用例');
      return;
    }

    if (selectedRows.length > 500) {
      message.warning('单次最多导出500个测试用例');
      return;
    }

    setExporting(true);
    try {
      const testCaseIds = selectedRows.map(row => row.id);
      await batchService.batchExport(testCaseIds);
      message.success(`成功导出 ${selectedRows.length} 个测试用例`);
    } catch (error) {
      message.error('导出失败');
    } finally {
      setExporting(false);
    }
  };

  // 重置导入状态
  const resetImportState = () => {
    setFileList([]);
    setValidationErrors([]);
    setImportResult(null);
    setImportStatus('idle');
  };

  // 增强的列配置
  const columns: ColumnsType<TestCase & { displayIndex: number }> = [
    {
      title: '序号',
      dataIndex: 'displayIndex',
      key: 'displayIndex',
      width: 80,
      align: 'center',
      render: (text: number) => (
        <span style={{
          background: '#f0f5ff',
          color: '#1890ff',
          padding: '4px 8px',
          borderRadius: '12px',
          fontWeight: 'bold',
          fontSize: '12px'
        }}>
          {text}
        </span>
      ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      width: 200,
      render: (text: string) => (
        <Tooltip title={text} placement="topLeft">
          <span style={{ fontWeight: 500 }}>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      align: 'center',
      render: (status: TestCaseStatus) => {
        const colors = {
          PENDING: { bg: '#fff7e6', color: '#fa8c16', border: '#ffd591' },
          PASSED: { bg: '#f6ffed', color: '#52c41a', border: '#b7eb8f' },
          FAILED: { bg: '#fff2f0', color: '#ff4d4f', border: '#ffccc7' },
          SKIPPED: { bg: '#f0f0f0', color: '#666666', border: '#d9d9d9' },
        };
        const style = colors[status] || colors.PENDING;
        return (
          <Tag 
            style={{
              backgroundColor: style.bg,
              borderColor: style.border,
              color: style.color,
              fontWeight: 500,
              padding: '2px 8px',
              borderRadius: '12px',
            }}
          >
            {getStatusText(status)}
          </Tag>
        );
      },
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      align: 'center',
      render: (priority: TestCasePriority) => {
        const icons = {
          HIGH: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
          MEDIUM: <ClockCircleOutlined style={{ color: '#faad14' }} />,
          LOW: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
        };
        return (
          <Tooltip title={getPriorityText(priority)}>
            <span style={{ fontSize: 16 }}>
              {icons[priority]}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 120,
      render: (tags: string[]) => {
        if (!tags || tags.length === 0) {
          return (
            <Tooltip title="该用例未设置标签">
              <span style={{ color: '#ccc', fontSize: '12px' }}>-</span>
            </Tooltip>
          );
        }
        return (
          <Space wrap size={[0, 4]}>
            {tags.slice(0, 2).map(tag => (
              <Tag 
                key={tag} 
                style={{
                  backgroundColor: '#f0f5ff',
                  borderColor: '#d6e4ff',
                  color: '#1d39c4',
                  margin: 1,
                  borderRadius: '6px',
                  fontSize: '11px',
                }}
              >
                {tag}
              </Tag>
            ))}
            {tags.length > 2 && (
              <Tooltip title={tags.slice(2).join(', ')}>
                <Tag style={{ 
                  margin: 1, 
                  borderRadius: '6px',
                  fontSize: '11px',
                }}>
                  +{tags.length - 2}
                </Tag>
              </Tooltip>
            )}
          </Space>
        );
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (text: string) => {
        if (!text || typeof text !== 'string') {
          return (
            <span style={{ fontSize: '12px', color: '#666' }}>
              未知时间
            </span>
          );
        }
        
        try {
          // 后端返回的格式已经是 yyyy-mm-dd hh:mm:ss，直接显示
          // 如果格式正确，直接返回
          if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(text)) {
            return (
              <span style={{ fontSize: '12px', color: '#666' }}>
                {text}
              </span>
            );
          }
          
          // 如果后端返回的是ISO格式，则转换为 yyyy-mm-dd hh:mm:ss
          const date = new Date(text);
          if (isNaN(date.getTime())) {
            console.warn('日期解析失败:', text);
            return (
              <span style={{ fontSize: '12px', color: '#666' }}>
                未知时间
              </span>
            );
          }
          
          // 格式化为 yyyy-mm-dd hh:mm:ss
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          const seconds = String(date.getSeconds()).padStart(2, '0');
          
          return (
            <span style={{ fontSize: '12px', color: '#666' }}>
              {`${year}-${month}-${day} ${hours}:${minutes}:${seconds}`}
            </span>
          );
        } catch (error) {
          console.warn('日期解析错误:', error, '文本:', text);
          return (
            <span style={{ fontSize: '12px', color: '#666' }}>
              未知时间
            </span>
          );
        }
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onView(record);
            }}
            title="查看详情"
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(record);
            }}
            title="编辑"
          />
          <Popconfirm
            title="确定删除该测试用例吗？"
            onConfirm={(e) => {
              e?.stopPropagation();
              onDelete(record.id);
            }}
            onCancel={(e) => {
              e?.stopPropagation();
            }}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={(e) => {
                e.stopPropagation();
              }}
              title="删除"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 批量操作按钮
  const batchActions = (
    <Space style={{ marginBottom: 16 }}>
      {selectedRows.length > 0 && (
        <>
          <Button
            type="primary"
            danger
            icon={<DeleteOutlined />}
            onClick={handleBatchDelete}
          >
            批量删除 ({selectedRows.length})
          </Button>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleBatchExport}
            loading={exporting}
          >
            用例下载 ({selectedRows.length})
          </Button>
        </>
      )}
      <Button
        type="default"
        icon={<UploadOutlined />}
        onClick={() => setBatchImportModalVisible(true)}
      >
        用例导入
      </Button>
      <Button
        type="default"
        icon={<DownloadOutlined />}
        onClick={handleDownloadTemplate}
      >
        模板下载
      </Button>
    </Space>
  );

  // 搜索和筛选区域
  const searchSection = (
    <Card
      style={{
        marginBottom: 16,
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        backgroundColor: 'var(--bg-container, #1e293b)',
        borderColor: 'var(--border-color, #334155)',
      }}
      bodyStyle={{ padding: 16, backgroundColor: 'var(--bg-container, #1e293b)' }}
    >
      <Row gutter={16} align="middle">
        <Col>
          <Input
            placeholder="搜索标题、条件、步骤或结果..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{
              width: 300,
              borderRadius: 20,
            }}
            allowClear
          />
        </Col>
        <Col>
          <Input
            placeholder="搜索标签..."
            prefix={<TagOutlined />}
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            style={{
              width: 200,
              borderRadius: 20,
            }}
            allowClear
          />
        </Col>
        <Col>
          <StatusFilter
            selectedStatus={selectedStatus}
            onStatusChange={onStatusChange}
          />
        </Col>
        <Col flex="auto" />
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onAdd}
            style={{
              borderRadius: 20,
              boxShadow: '0 2px 8px rgba(24,144,255,0.3)',
            }}
          >
            新建测试用例
          </Button>
        </Col>
      </Row>
    </Card>
  );

  // 导入模态框
  const importModal = (
    <Modal
      title="批量导入测试用例"
      open={batchImportModalVisible}
      onCancel={() => {
        setBatchImportModalVisible(false);
        resetImportState();
      }}
      footer={null}
      width={600}
    >
      <div style={{ padding: '20px 0' }}>
        <Upload.Dragger
          accept=".xlsx,.csv"
          maxCount={1}
          fileList={fileList}
          beforeUpload={(file) => {
            setFileList([file]);
            return false;
          }}
          onRemove={() => {
            setFileList([]);
          }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined style={{ fontSize: 48, color: '#1890ff' }} />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此处上传</p>
          <p className="ant-upload-hint">
            支持 .xlsx 和 .csv 格式，文件大小不超过 10MB
          </p>
        </Upload.Dragger>

        {validationErrors.length > 0 && (
          <Alert
            message="验证错误"
            description={
              <div>
                {validationErrors.map((error, index) => (
                  <div key={index} style={{ marginBottom: 8 }}>
                    <strong>第 {error.row} 行:</strong> {error.message}
                  </div>
                ))}
              </div>
            }
            type="error"
            style={{ marginTop: 16 }}
          />
        )}

        {importResult && (
          <Alert
            message="导入结果"
            description={
              <div>
                <p>成功: {importResult.success}</p>
              <p>失败: {importResult.failed}</p>
                {importResult.errors && importResult.errors.length > 0 && (
                  <div>
                    <strong>失败详情:</strong>
                    {importResult.errors.map((error: any, index: number) => (
                      <div key={index} style={{ marginLeft: 16 }}>
                        {error.row}: {error.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            }
            type={importResult.errorCount > 0 ? 'warning' : 'success'}
            style={{ marginTop: 16 }}
          />
        )}

        <div style={{ marginTop: 24, textAlign: 'right' }}>
          <Space>
            <Button onClick={() => {
              setBatchImportModalVisible(false);
              resetImportState();
            }}>
              取消
            </Button>
            <Button
              type="primary"
              disabled={fileList.length === 0 || importStatus === 'importing'}
              onClick={() => {
                if (fileList[0]) {
                  handleBatchImport(fileList[0]);
                }
              }}
            >
              {importStatus === 'validating' ? '验证中...' : 
               importStatus === 'importing' ? '导入中...' : '开始导入'}
            </Button>
          </Space>
        </div>
      </div>
    </Modal>
  );

  return (
    <div>
      {batchActions}
      {searchSection}

      <Card
        style={{
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          backgroundColor: 'var(--bg-container, #1e293b)',
          borderColor: 'var(--border-color, #334155)',
        }}
        bodyStyle={{ padding: 0, backgroundColor: 'var(--bg-container, #1e293b)' }}
      >
        <Table
          columns={columns}
          dataSource={displayData}
          rowKey="id"
          loading={loading}
          rowSelection={rowSelection}
          pagination={{
            total: displayData.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
            style: { margin: 16 },
          }}
          scroll={{ x: 1000 }}
          rowClassName="test-case-row"
          onRow={(record) => ({
            style: { cursor: 'pointer' },
            onClick: () => onView(record),
          })}
        />
      </Card>

      {importModal}
    </div>
  );
};

export default TestCaseManagementPage;