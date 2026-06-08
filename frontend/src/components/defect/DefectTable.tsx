import React, { useState, useEffect, useCallback } from 'react';
import { Table, Pagination, Spin, Alert, Select, DatePicker, Button, Input } from 'antd';
import { FilterOutlined, AreaChartOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import defectApi from '../../services/defect/defectApi';
import { projectApi, directoryApi } from '../../services/project/projectApi';
import { Defect, DefectQueryParams } from '../../types/defect';
import { usePageState } from '../../hooks/usePageState';

interface DefectTableProps {
}

const { Option } = Select;
const { RangePicker } = DatePicker;

// 页面状态接口
interface DefectTablePageState {
  page: number;
  pageSize: number;
  filters: {
    project_id: string;
    id: string;
    subject: string;
    status_id: string[];
    priority_id: string[];
    assigned_to_id: string[];
    startDate: string;
    endDate: string;
    system_id: string;
    module_id: string;
  };
  sortBy: string;
  sortOrder: 'ascend' | 'descend' | null;
}

const DefectTable: React.FC<DefectTableProps> = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [defects, setDefects] = useState<Defect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState({
    project_id: '',
    id: '',
    subject: '',
    status_id: [] as string[],
    priority_id: [] as string[],
    assigned_to_id: [] as string[],
    startDate: '',
    endDate: '',
    system_id: '',
    module_id: '',
  });
  const [sortBy, setSortBy] = useState('updated_on');
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | null>('descend');

  // 页面状态持久化 - 保存和恢复页面状态
  usePageState(
    location.pathname,
    {
      save: useCallback(() => {
        const state = {
          page,
          pageSize,
          filters,
          sortBy,
          sortOrder,
        };
        console.log('[DefectTable] 保存页面状态:', state);
        return state;
      }, [page, pageSize, filters, sortBy, sortOrder]),
      restore: useCallback((state) => {
        console.log('[DefectTable] 恢复页面状态:', state);
        const typedState = state as unknown as DefectTablePageState;
        if (typedState.page) setPage(typedState.page);
        if (typedState.pageSize) setPageSize(typedState.pageSize);
        if (typedState.filters && typeof typedState.filters === 'object') {
          setFilters(prev => ({
            ...prev,
            ...typedState.filters,
            // 确保所有必需字段都存在
            project_id: typedState.filters.project_id || prev.project_id,
            id: typedState.filters.id || '',
            subject: typedState.filters.subject || '',
            status_id: Array.isArray(typedState.filters.status_id) ? typedState.filters.status_id : [],
            priority_id: Array.isArray(typedState.filters.priority_id) ? typedState.filters.priority_id : [],
            assigned_to_id: Array.isArray(typedState.filters.assigned_to_id) ? typedState.filters.assigned_to_id : [],
            startDate: typedState.filters.startDate || '',
            endDate: typedState.filters.endDate || '',
            system_id: typedState.filters.system_id || '',
            module_id: typedState.filters.module_id || '',
          }));
        }
        if (typedState.sortBy) setSortBy(typedState.sortBy);
        if (typedState.sortOrder) setSortOrder(typedState.sortOrder);
      }, []),
    },
    [page, pageSize, filters, sortBy, sortOrder]
  );

  const [systems, setSystems] = useState<any[]>([]); // 存储系统（二级目录）数据
  const [modules, setModules] = useState<any[]>([]); // 存储模块（三级目录）数据
  const [loadingSystems, setLoadingSystems] = useState(false); // 加载系统的loading状态
  const [loadingModules, setLoadingModules] = useState(false); // 加载模块的loading状态
  const [projects, setProjects] = useState<any[]>([]); // 存储项目列表数据
  const [loadingProjects, setLoadingProjects] = useState(false); // 加载项目的loading状态
  const [users, setUsers] = useState<any[]>([]); // 存储用户列表数据
  const [loadingUsers, setLoadingUsers] = useState(false); // 加载用户的loading状态
  const [userSearchText, setUserSearchText] = useState(''); // 用户搜索文本

  // 页面加载时默认获取数据
  useEffect(() => {
    fetchDefects();
  }, [      page, pageSize, filters.project_id, filters.id, filters.subject, filters.status_id, filters.priority_id, filters.assigned_to_id, filters.system_id, filters.module_id, filters.startDate, filters.endDate, sortBy, sortOrder]);

  // 加载项目列表数据
  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoadingProjects(true);
        const projectList = await projectApi.getProjects();
        // 防御性编程：确保返回的是数组
        if (Array.isArray(projectList)) {
          setProjects(projectList);
        } else {
          console.error('项目列表数据格式错误:', projectList);
          setProjects([]);
        }
      } catch (error) {
        console.error('加载项目列表失败:', error);
        setProjects([]);
      } finally {
        setLoadingProjects(false);
      }
    };

    loadProjects();
  }, []);

  // 加载系统（二级目录）数据
  useEffect(() => {
    const loadSystems = async () => {
      try {
        setLoadingSystems(true);
        const directories = await directoryApi.getDirectoriesByProjectId(filters.project_id);
        // 防御性编程：确保返回的是数组
        if (Array.isArray(directories)) {
          // 只获取二级目录（level=1）作为系统
          const secondLevelDirectories = directories.filter(dir => dir.level === 1);
          setSystems(secondLevelDirectories);
        } else {
          console.error('目录数据格式错误:', directories);
          setSystems([]);
        }
      } catch (error) {
        console.error('加载系统列表失败:', error);
        setSystems([]);
      } finally {
        setLoadingSystems(false);
      }
    };

    loadSystems();
  }, [filters.project_id]);

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
        
        // 递归查找所有三级目录（level=2），其父目录是当前选中的系统
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

  // 加载用户列表数据
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoadingUsers(true);
        const response = await defectApi.getUsers();
        // 防御性编程：确保返回数据格式正确
        if (response.success && response.data && Array.isArray(response.data)) {
          setUsers(response.data);
        } else {
          console.error('用户列表数据格式错误:', response);
          setUsers([]);
        }
      } catch (error) {
        console.error('加载用户列表失败:', error);
        setUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    };

    loadUsers();
  }, []);

  const fetchDefects = async () => {
    setLoading(true);
    setError(null);
    try {
      // 构建查询参数
      const params: DefectQueryParams = {
        page,
        pageSize,
      };

      // 传递项目ID参数
      if (filters.project_id && filters.project_id !== '') {
        params.project_id = filters.project_id;
      }

      // 传递缺陷编号参数
      if (filters.id && filters.id !== '') {
        params.id = filters.id;
      }

      // 传递标题模糊搜索参数
      if (filters.subject && filters.subject.trim() !== '') {
        params.subject = filters.subject.trim();
      }

      // 传递所有筛选条件，无论是否选择了项目
      if (filters.status_id.length > 0) {
        params.status_id = filters.status_id;
      }
      if (filters.priority_id.length > 0) {
        params.priority_id = filters.priority_id;
      }
      if (filters.assigned_to_id.length > 0) {
        params.assigned_to_id = filters.assigned_to_id.map(id => parseInt(id));
      }
      params.system_id = filters.system_id;
      params.module_id = filters.module_id;
      params.startDate = filters.startDate;
      params.endDate = filters.endDate;

      // 传递排序参数
      if (sortBy && sortOrder) {
        params.sort_by = sortBy;
        params.sort_direction = sortOrder === 'ascend' ? 'asc' : 'desc';
      }

      const response = await defectApi.getDefects(params);
      if (response.success && response.data) {
        setDefects(response.data.list);
        setTotal(response.data.total);
      } else {
        setError(response.error || '获取缺陷列表失败');
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
    setUserSearchText(''); // 选择后清空搜索文本
    setPage(1);
  };

  const handleUserSearch = (value: string) => {
    setUserSearchText(value);
  };

  const handleSystemChange = (value: string) => {
    // 当系统变化时，重置模块选择
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

  const handleDateChange = (dates: any) => {
    if (dates) {
      setFilters(prev => ({
        ...prev,
        startDate: dates[0].format('YYYY-MM-DD'),
        endDate: dates[1].format('YYYY-MM-DD'),
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        startDate: '',
        endDate: '',
      }));
    }
    setPage(1);
  };

  const handleReset = () => {
    setFilters({
      project_id: '',
      id: '',
      subject: '',
      status_id: [],
      priority_id: [],
      assigned_to_id: [],
      startDate: '',
      endDate: '',
      system_id: '',
      module_id: '',
    });
    setPage(1);
  };

  const handleDataAnalysis = () => {
    // 根据选择的系统名称和模块跳转到数据分析页面
    let systemId = filters.system_id;
    let moduleId = filters.module_id;
    
    // 如果选择了低代码&研发管理平台且选择了模块，使用模块ID作为系统ID
    if (systemId === '2981' && moduleId) {
      systemId = moduleId;
    }
    
    // 跳转到数据分析页面，并传递系统ID作为参数
    if (systemId) {
      navigate(`/defects?systemId=${systemId}`);
    } else {
      navigate('/defects');
    }
  };

  // 服务端排序字段映射
  const sortFieldMap: Record<string, string> = {
    'id': 'id',
    'system_module_name': 'system_module_name',
    'status_name': 'status_id',
    'priority_name': 'priority_id',
    'assigned_to_name': 'assigned_to_name',
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

    // 处理列头筛选 - 使用函数式更新避免依赖filters
    setFilters(prev => {
      const newFilters = { ...prev };
      
      // 状态筛选 - 支持多选
      if (tableFilters.status_name) {
        newFilters.status_id = tableFilters.status_name;
      } else {
        newFilters.status_id = [];
      }
      
      // 优先级筛选 - 支持多选
      if (tableFilters.priority_name) {
        newFilters.priority_id = tableFilters.priority_name;
      } else {
        newFilters.priority_id = [];
      }
      
      // 分配给筛选 - 支持多选
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
      render: (text: string, record: Defect) => (
        <a 
          href={`http://10.20.42.47:11003/issues/${record.id}`} 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ 
            color: '#1890ff', 
            textDecoration: 'underline',
            cursor: 'pointer'
          }}
        >
          {text}
        </a>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status_name',
      key: 'status_name',
      width: 100,
    },
    {
      title: '优先级',
      dataIndex: 'priority_name',
      key: 'priority_name',
      width: 100,
    },
    {
      title: '分配给',
      dataIndex: 'assigned_to_name',
      key: 'assigned_to_name',
      width: 120,
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
  ];

  return (
    <div className="defect-table" style={{ border: '1px solid var(--border-color, #334155)', borderRadius: 4, padding: 16, backgroundColor: 'var(--bg-container, #1e293b)' }}>
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
        <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* 第一行：缺陷编号、标题、系统名称、模块、状态、优先级、日期范围、重置、搜索 */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: 12, minWidth: 90, textAlign: 'right' }}>缺陷编号：</span>
              <Input
                placeholder="请输入缺陷编号"
                style={{ width: 150 }}
                value={filters.id}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setFilters(prev => ({ ...prev, id: e.target.value }));
                  setPage(1);
                }}
                allowClear
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: 12, minWidth: 90, textAlign: 'right' }}>标题：</span>
              <Input
                placeholder="请输入标题关键词"
                style={{ width: 200 }}
                value={filters.subject}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setFilters(prev => ({ ...prev, subject: e.target.value }));
                  setPage(1);
                }}
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
                onSearch={handleUserSearch}
                searchValue={userSearchText}
                allowClear
                loading={loadingUsers}
                showSearch
                optionFilterProp="children"
                mode="multiple"
                maxTagCount={2}
                filterOption={(input, option) => {
                  const user = users.find(u => u.id.toString() === option?.value);
                  if (user) {
                    return user.name.toLowerCase().includes(input.toLowerCase());
                  }
                  return false;
                }}
              >
                {users.map(user => (
                  <Option key={user.id} value={user.id.toString()}>{user.name}</Option>
                ))}
              </Select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: 12, minWidth: 90, textAlign: 'right' }}>日期范围：</span>
              <RangePicker
                style={{ width: 240 }}
                onChange={handleDateChange}
                placeholder={['开始日期', '结束日期']}
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Button onClick={handleReset}>重置</Button>
            </div>
          </div>
          
          {/* 第二行：数据分析按钮 */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 32 }}>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
              <Button 
                type="primary" 
                onClick={() => {
                  let url = 'http://10.20.42.47:11003/projects/jwsciads/issues_trees/tree_index?query_id=20';
                  
                  // 根据选择的系统名称决定跳转地址
                  if (filters.system_id) {
                    switch (filters.system_id) {
                      case '2981': // 低代码&研发管理平台
                        url = 'http://10.20.42.47:11003/issues/2981';
                        break;
                      case '2982': // 物联应用
                        url = 'http://10.20.42.47:11003/issues/2982';
                        break;
                      case '2983': // 物联平台
                        url = 'http://10.20.42.47:11003/issues/2983';
                        break;
                      case '2984': // 大数据平台
                        url = 'http://10.20.42.47:11003/issues/2984';
                        break;
                    }
                  }
                  
                  window.open(url, '_blank');
                }}
              >
                新建问题
              </Button>
              <Button icon={<AreaChartOutlined />} onClick={handleDataAnalysis}>
                数据分析
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 数据表格 */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ marginBottom: 8 }}>加载缺陷列表...</div>
          <Spin />
        </div>
      ) : error ? (
        <Alert message="错误" description={error} type="error" showIcon />
      ) : defects.length === 0 ? (
        <Alert message="暂无缺陷数据" type="info" showIcon />
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <Table
              className="defect-table-custom"
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
    </div>
  );
};

export default DefectTable;