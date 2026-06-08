import React, { useState, useEffect, useCallback } from 'react';
import { Layout, Typography, Table, Pagination, Spin, Alert, Select, Button, Input } from 'antd';
import { FilterOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useLocation } from 'react-router-dom';
import { Defect, DefectQueryParams } from '../../types/defect';
import { projectApi, directoryApi } from '../../services/project/projectApi';
import defectApi from '../../services/defect/defectApi';
import { usePageState } from '../../hooks/usePageState';

const { Content } = Layout;
const { Title } = Typography;
const { Option } = Select;

// 页面路径
const PAGE_PATH = '/defects/todo';

// 页面状态接口
interface MyTodoPageState {
  filters: {
    project_id: string;
    status_id: string[];
    priority_id: string[];
    assigned_to_id: string[];
    system_id: string;
    module_id: string;
    defect_ids: string;
    subject: string;
  };
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: 'ascend' | 'descend' | null;
}

const MyTodoPage: React.FC = () => {
  const location = useLocation();
  const [defects, setDefects] = useState<Defect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState('updated_on');
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | null>('descend');
  
  const [filters, setFilters] = useState(() => {
    // 检查是否有从其他页面传递过来的筛选参数
    const navigationFilter = (location.state as any)?.filter;
    if (navigationFilter) {
      // 处理 defect_ids，支持数组或逗号分隔的字符串
      let defectIdsValue = '';
      if (navigationFilter.defect_ids) {
        if (Array.isArray(navigationFilter.defect_ids)) {
          defectIdsValue = navigationFilter.defect_ids.join(',');
        } else if (typeof navigationFilter.defect_ids === 'string') {
          defectIdsValue = navigationFilter.defect_ids;
        }
      }

      return {
        project_id: String(navigationFilter.project_id || ''),
        status_id: [] as string[],
        priority_id: [] as string[],
        assigned_to_id: [] as string[],
        system_id: '',
        module_id: '',
        defect_ids: defectIdsValue,
        subject: '',
        _system_name: navigationFilter.system_name,
      };
    }
    return {
        project_id: '',
        status_id: [] as string[],
        priority_id: [] as string[],
        assigned_to_id: [] as string[],
        system_id: '',
        module_id: '',
        defect_ids: '',
        subject: '',
      };
  });

  // 注册页面状态管理
  usePageState(
    PAGE_PATH,
    {
      save: useCallback(() => ({
        filters,
        page,
        pageSize,
        sortBy,
        sortOrder,
      }), [filters, page, pageSize, sortBy, sortOrder]),
      restore: useCallback((state) => {
        const typedState = state as unknown as MyTodoPageState;
        if (typedState.filters) {
          setFilters(prev => ({
            ...prev,
            ...typedState.filters,
            status_id: Array.isArray(typedState.filters.status_id) ? typedState.filters.status_id : [],
            priority_id: Array.isArray(typedState.filters.priority_id) ? typedState.filters.priority_id : [],
            assigned_to_id: Array.isArray(typedState.filters.assigned_to_id) ? typedState.filters.assigned_to_id : [],
          }));
        }
        if (typeof typedState.page === 'number') setPage(typedState.page);
        if (typeof typedState.pageSize === 'number') setPageSize(typedState.pageSize);
        if (typedState.sortBy) setSortBy(typedState.sortBy);
        if (typedState.sortOrder) setSortOrder(typedState.sortOrder);
      }, []),
    },
    [filters, page, pageSize, sortBy, sortOrder]
  );

  const [systems, setSystems] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [loadingSystems, setLoadingSystems] = useState(false);
  const [loadingModules, setLoadingModules] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // 页面加载时默认获取数据
  useEffect(() => {
    fetchDefects();
  }, [page, pageSize, filters.project_id, filters.status_id, filters.priority_id, filters.assigned_to_id, filters.system_id, filters.module_id, sortBy, sortOrder]);

  // 监听来自 TodoStatsBadge/TodoReminderToast 的筛选事件
  useEffect(() => {
    const handleFilterApply = (event: CustomEvent) => {
      const filter = event.detail;

      if (filter) {
        // 处理 defect_ids，支持数组或逗号分隔的字符串
        let defectIdsValue = '';
        if (filter.defect_ids) {
          if (Array.isArray(filter.defect_ids)) {
            defectIdsValue = filter.defect_ids.join(',');
          } else if (typeof filter.defect_ids === 'string') {
            defectIdsValue = filter.defect_ids;
          }
        }

        setFilters(prev => ({
          ...prev,
          project_id: String(filter.project_id || prev.project_id),
          system_id: '',
          defect_ids: defectIdsValue,
          _system_name: filter.system_name,
        }));
        setPage(1);

        const changeEvent = new CustomEvent('todoFilterChanged', { detail: filter });
        window.dispatchEvent(changeEvent);
      }
    };

    window.addEventListener('todoFilterApply' as any, handleFilterApply);
    return () => {
      window.removeEventListener('todoFilterApply' as any, handleFilterApply);
    };
  }, []);

  // 加载项目列表数据
  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoadingProjects(true);
        const projectList = await projectApi.getProjects();
        setProjects(projectList);
      } catch (error) {
        // 加载失败时静默处理
      } finally {
        setLoadingProjects(false);
      }
    };

    loadProjects();
  }, []);

  // 加载用户列表数据
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoadingUsers(true);
        const response = await defectApi.getUsers();
        if (response.success && response.data) {
          setUsers(response.data);
        }
      } catch (error) {
        // 加载失败时静默处理
      } finally {
        setLoadingUsers(false);
      }
    };

    loadUsers();
  }, []);

  // 加载系统（二级目录）数据
  useEffect(() => {
    const loadSystems = async () => {
      try {
        setLoadingSystems(true);
        const directories = await directoryApi.getDirectoriesByProjectId(filters.project_id);
        const secondLevelDirectories = directories.filter(dir => dir.level === 1);
        setSystems(secondLevelDirectories);

        const systemName = (filters as any)._system_name;
        if (systemName && secondLevelDirectories.length > 0) {
          const matchedSystem = secondLevelDirectories.find(
            sys => sys.name === systemName || sys.name.includes(systemName)
          );
          if (matchedSystem) {
            setFilters(prev => ({
              ...prev,
              system_id: String(matchedSystem.id),
              _system_name: undefined,
            }));
          }
        }
      } catch (error) {
        // 加载失败时静默处理
      } finally {
        setLoadingSystems(false);
      }
    };

    loadSystems();
  }, [filters.project_id, (filters as any)._system_name]);

  // 加载模块（三级目录）数据
  useEffect(() => {
    const loadModules = async () => {
      if (!filters.system_id) {
        setModules([]);
        return;
      }

      try {
        setLoadingModules(true);
        const directories = await directoryApi.getDirectoriesByProjectId(filters.project_id);
        
        const findModules = (dirs: any[]) => {
          let result: any[] = [];
          dirs.forEach(dir => {
            if (dir.level === 2 && dir.parent_id === filters.system_id) {
              result.push(dir);
            }
            if (dir.children && dir.children.length > 0) {
              result = result.concat(findModules(dir.children));
            }
          });
          return result;
        };

        const foundModules = findModules(directories);
        setModules(foundModules);
      } catch (error) {
        // 加载失败时静默处理
      } finally {
        setLoadingModules(false);
      }
    };

    loadModules();
  }, [filters.project_id, filters.system_id]);

  const fetchDefects = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: DefectQueryParams = {
        page,
        pageSize,
        project_id: filters.project_id,
        is_todo: true,
      };

      if (filters.status_id.length > 0) {
        params.status_id = filters.status_id;
      }
      if (filters.priority_id.length > 0) {
        params.priority_id = filters.priority_id;
      }
      if (filters.assigned_to_id.length > 0) {
        params.assigned_to_id = filters.assigned_to_id.map(id => parseInt(id));
      }
      if (filters.system_id) {
        params.system_id = filters.system_id;
      }
      if (filters.module_id) {
        params.module_id = filters.module_id;
      }
      if (filters.subject && filters.subject.trim()) {
        params.subject = filters.subject.trim();
      }
      if (sortBy && sortOrder) {
        params.sort_by = sortBy;
        params.sort_direction = sortOrder === 'ascend' ? 'asc' : 'desc';
      }

      const response = await defectApi.getDefects(params);
      
      if (response.success && response.data) {
        let defectList = response.data.list;
        
        // 如果有多ID筛选条件，在前端进行过滤
        if (filters.defect_ids && filters.defect_ids.trim()) {
          const defectIds = filters.defect_ids
            .split(',')
            .map((id: string) => parseInt(id.trim()))
            .filter((id: number) => !isNaN(id));
          if (defectIds.length > 0) {
            defectList = defectList.filter((defect: Defect) => defectIds.includes(defect.id));
          }
        }

        setDefects(defectList);
        setTotal(filters.defect_ids && filters.defect_ids.trim() ? defectList.length : response.data.total);
      } else {
        setError(response.error || '获取待办列表失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (current: number, size: number) => {
    setPage(current);
    setPageSize(size);
  };

  const handleSystemChange = (value: string) => {
    setFilters(prev => ({ 
      ...prev, 
      system_id: value,
      module_id: '' 
    }));
    setPage(1);
  };

  const handleModuleChange = (value: string) => {
    setFilters(prev => ({ ...prev, module_id: value }));
    setPage(1);
  };

  const handleStatusChange = (value: string[]) => {
    setFilters(prev => ({ ...prev, status_id: value || [] }));
    setPage(1);
  };

  const handlePriorityChange = (value: string[]) => {
    setFilters(prev => ({ ...prev, priority_id: value || [] }));
    setPage(1);
  };

  const handleAssignedToChange = (value: string[]) => {
    setFilters(prev => ({ ...prev, assigned_to_id: value || [] }));
    setPage(1);
  };

  const handleReset = () => {
    setFilters({
      project_id: '2980',
      status_id: [],
      priority_id: [],
      assigned_to_id: [],
      system_id: '',
      module_id: '',
      defect_ids: '',
      subject: '',
    });
    setSortBy('updated_on');
    setSortOrder('descend');
    setPage(1);
  };

  const handleDefectIdsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, defect_ids: e.target.value }));
    setPage(1);
  };

  const handleSubjectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, subject: e.target.value }));
    setPage(1);
  };

  const handleProcess = (issueId: number) => {
    window.open(`http://10.20.42.47:11003/issues/${issueId}`, '_blank');
    setTimeout(() => {
      fetchDefects();
    }, 2000);
  };

  // 服务端排序字段映射
  const sortFieldMap: Record<string, string> = {
    'id': 'id',
    'system_module_name': 'system_module_name',
    'status_name': 'status_id',
    'priority_name': 'priority_id',
    'assigned_to_name': 'assigned_to_id',
    'created_on': 'created_on',
    'updated_on': 'updated_on',
  };

  // 处理表格排序和筛选变化
  const handleTableChange = (_pagination: any, tableFilters: any, sorter: any) => {
    // 处理排序
    if (sorter && sorter.field) {
      const actualField = sortFieldMap[sorter.field] || sorter.field;
      setSortBy(actualField);
      setSortOrder(sorter.order || null);
    } else {
      setSortBy('');
      setSortOrder(null);
    }

    // 处理列头筛选
    setFilters(prev => {
      const newFilters = { ...prev };
      
      if (tableFilters.status_name) {
        newFilters.status_id = tableFilters.status_name;
      } else {
        newFilters.status_id = [];
      }
      
      if (tableFilters.priority_name) {
        newFilters.priority_id = tableFilters.priority_name;
      } else {
        newFilters.priority_id = [];
      }
      
      if (tableFilters.assigned_to_name) {
        newFilters.assigned_to_id = tableFilters.assigned_to_name;
      } else {
        newFilters.assigned_to_id = [];
      }
      
      return newFilters;
    });
    setPage(1);
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 120,
      sorter: true,
      sortOrder: sortBy === 'id' ? sortOrder : null,
    },
    {
      title: '系统/模块',
      dataIndex: 'system_module_name',
      key: 'system_module_name',
      width: 180,
      sorter: true,
      sortOrder: sortBy === 'system_module_name' ? sortOrder : null,
    },
    {
      title: '标题',
      dataIndex: 'subject',
      key: 'subject',
      width: 300,
    },
    {
      title: '状态',
      dataIndex: 'status_name',
      key: 'status_name',
      width: 100,
      filters: [
        { text: '新建', value: '1' },
        { text: '进行中', value: '2' },
        { text: '已解决', value: '3' },
        { text: '反馈', value: '4' },
        { text: '已关闭', value: '5' },
        { text: '挂起', value: '8' },
      ],
      filteredValue: filters.status_id.length > 0 ? filters.status_id : null,
      filterMultiple: true,
    },
    {
      title: '优先级',
      dataIndex: 'priority_name',
      key: 'priority_name',
      width: 100,
      filters: [
        { text: '一般问题', value: '2' },
        { text: '紧急问题', value: '4' },
      ],
      filteredValue: filters.priority_id.length > 0 ? filters.priority_id : null,
      filterMultiple: true,
    },
    {
      title: '分配给',
      dataIndex: 'assigned_to_name',
      key: 'assigned_to_name',
      width: 120,
      filters: users.map(user => ({ text: user.name, value: user.id.toString() })),
      filteredValue: filters.assigned_to_id.length > 0 ? filters.assigned_to_id : null,
      filterMultiple: true,
    },
    {
      title: '创建时间',
      dataIndex: 'created_on',
      key: 'created_on',
      width: 150,
      sorter: true,
      sortOrder: sortBy === 'created_on' ? sortOrder : null,
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '更新时间',
      dataIndex: 'updated_on',
      key: 'updated_on',
      width: 150,
      sorter: true,
      sortOrder: sortBy === 'updated_on' ? sortOrder : null,
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: Defect) => (
        <Button 
          type="primary" 
          icon={<CheckCircleOutlined />} 
          onClick={() => handleProcess(record.id)}
        >
          处理
        </Button>
      ),
    },
  ];

  return (
    <Content style={{
      padding: '24px',
      height: '100%',
      overflow: 'auto',
    }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ display: 'flex', alignItems: 'center' }}>
          <CheckCircleOutlined style={{ marginRight: 8 }} />
          我的待办
        </Title>
        <p>展示以下两类问题：1. 分配给石彬彬的所有问题；2. 状态为已解决的所有问题。点击处理按钮查看详情并处理。</p>
      </div>

      {/* 项目选择栏 */}
      <div style={{ marginBottom: 16, padding: 16, backgroundColor: 'var(--bg-container, #1e293b)', borderRadius: 4, border: '1px solid var(--border-color, #334155)' }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: 12, minWidth: 90, textAlign: 'right', fontWeight: 'bold', color: 'var(--text-primary, #f1f5f9)' }}>选择项目：</span>
            <Select
              placeholder="请选择项目"
              style={{ width: 200 }}
              value={filters.project_id || undefined}
              onChange={(value: string) => {
                setFilters(prev => ({ ...prev, project_id: value }));
                setPage(1);
              }}
              allowClear
              loading={loadingProjects}
            >
              {projects.map(project => (
                <Option key={project.id} value={project.id}>{project.name}</Option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {/* 筛选器 */}
      <div style={{ marginBottom: 16, padding: 16, backgroundColor: 'var(--bg-container, #1e293b)', borderRadius: 4, border: '1px solid var(--border-color, #334155)' }}>
        <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', color: 'var(--text-primary, #f1f5f9)' }}>
          <FilterOutlined style={{ marginRight: 8 }} /> 筛选条件
        </h3>
        
        {/* 筛选条件行 */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: 12, minWidth: 90, textAlign: 'right' }}>ID：</span>
              <Input
                placeholder="多个ID用逗号分隔，如：123,456"
                style={{ width: 220 }}
                value={filters.defect_ids || ''}
                onChange={handleDefectIdsChange}
                allowClear
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: 12, minWidth: 90, textAlign: 'right' }}>标题：</span>
              <Input
                placeholder="请输入标题关键词"
                style={{ width: 200 }}
                value={filters.subject || ''}
                onChange={handleSubjectChange}
                allowClear
              />
            </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: 12, minWidth: 90, textAlign: 'right' }}>系统名称：</span>
            <Select
              placeholder="请选择"
              style={{ width: 200 }}
              value={filters.system_id || undefined}
              onChange={handleSystemChange}
              allowClear
              loading={loadingSystems}
            >
              {systems.map(system => (
                <Option key={system.id} value={system.id}>{system.name}</Option>
              ))}
            </Select>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: 12, minWidth: 60, textAlign: 'right' }}>模块：</span>
            <Select
              placeholder="请选择"
              style={{ width: 200 }}
              value={filters.module_id || undefined}
              onChange={handleModuleChange}
              allowClear
              disabled={!filters.system_id || modules.length === 0}
              loading={loadingModules}
            >
              {modules.map(module => (
                <Option key={module.id} value={module.id}>{module.name}</Option>
              ))}
            </Select>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: 12, minWidth: 60, textAlign: 'right' }}>状态：</span>
            <Select
              placeholder="请选择"
              style={{ width: 180 }}
              value={filters.status_id.length > 0 ? filters.status_id : undefined}
              onChange={handleStatusChange}
              allowClear
              mode="multiple"
              maxTagCount={2}
            >
              <Option value="1">新建</Option>
              <Option value="2">进行中</Option>
              <Option value="3">已解决</Option>
              <Option value="4">反馈</Option>
              <Option value="5">已关闭</Option>
              <Option value="8">挂起</Option>
            </Select>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: 12, minWidth: 90, textAlign: 'right' }}>优先级：</span>
            <Select
              placeholder="请选择"
              style={{ width: 160 }}
              value={filters.priority_id.length > 0 ? filters.priority_id : undefined}
              onChange={handlePriorityChange}
              allowClear
              mode="multiple"
              maxTagCount={2}
            >
              <Option value="2">一般问题</Option>
              <Option value="4">紧急问题</Option>
            </Select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: 12, minWidth: 90, textAlign: 'right' }}>分配给：</span>
            <Select
              placeholder="请选择"
              style={{ width: 200 }}
              value={filters.assigned_to_id.length > 0 ? filters.assigned_to_id : undefined}
              onChange={handleAssignedToChange}
              allowClear
              loading={loadingUsers}
              showSearch
              optionFilterProp="children"
              mode="multiple"
              maxTagCount={2}
            >
              {users.map(user => (
                <Option key={user.id} value={user.id.toString()}>{user.name}</Option>
              ))}
            </Select>
          </div>
          
          <Button onClick={handleReset}>重置</Button>
          <Button 
            type="primary" 
            onClick={fetchDefects}
            style={{ marginLeft: 16 }}
          >
            搜索
          </Button>

        </div>
      </div>

      {/* 数据表格 */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ marginBottom: 8 }}>加载待办列表...</div>
          <Spin />
        </div>
      ) : error ? (
        <Alert message="错误" description={error} type="error" showIcon />
      ) : defects.length === 0 ? (
        <Alert message="暂无待办数据" type="info" showIcon />
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <Table
              columns={columns}
              dataSource={defects}
              rowKey="id"
              pagination={false}
              loading={loading}
              scroll={{ x: 'max-content' }}
              onChange={handleTableChange}
            />
          </div>
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <Pagination
              current={page}
              pageSize={pageSize}
              total={total}
              onChange={handlePageChange}
              showSizeChanger
              pageSizeOptions={['10', '20', '50', '100']}
              showTotal={(total) => `共 ${total} 条记录`}
            />
          </div>
        </>
      )}


    </Content>
  );
};

export default MyTodoPage;
