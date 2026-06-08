import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, Pagination, Spin, Alert, Select, Button, Input, Card, message as antdMessage } from 'antd';
import { FilterOutlined, DownloadOutlined } from '@ant-design/icons';
import { useLocation } from 'react-router-dom';
import defectApi from '../../services/defect/defectApi';
import { projectApi, directoryApi } from '../../services/project/projectApi';
import { Defect, DefectQueryParams } from '../../types/defect';
import { usePageState } from '../../hooks/usePageState';
import axios from 'axios';
import { calculateWorkDaysExcludingHolidays, isHoliday, isWorkday } from '../../data/holidays';

interface UrgentIssueTableProps { }

const { Option } = Select;

// 页面状态接口
interface UrgentIssueTablePageState {
  page: number;
  pageSize: number;
  filters: {
    project_id: string;
    id: string;
    system_id: string;
    module_id: string;
  };
  sortBy: string;
  sortOrder: 'ascend' | 'descend' | null;
}

// 系统统计接口
interface SystemStats {
  systemId: string;
  systemName: string;
  count: number;
  avgElapsedDays: number;
  color: string;
}

// 计算已用时（排除周末和节假日，0.5为最低单位）
const calculateElapsedDays = (createdOn: string): { days: number; color: string; rawDays: number } => {
  const created = new Date(createdOn);
  const now = new Date();

  // 如果创建时间晚于当前时间，返回默认值
  if (created > now) {
    return { days: 0.5, color: '#52c41a', rawDays: 0 };
  }

  // 计算完整的工作日天数（不包括今天）
  const completedWorkDays = calculateWorkDaysExcludingHolidays(createdOn);

  // 判断今天是否是工作日
  const today = new Date(now);
  const isTodayWeekend = today.getDay() === 0 || today.getDay() === 6;
  const isTodayHoliday = isHoliday(today);
  const isTodayWorkday = isWorkday(today) || (!isTodayWeekend && !isTodayHoliday);

  // 计算今天已过的小时比例
  let todayFraction = 0;
  if (isTodayWorkday) {
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const hoursPassed = (now.getTime() - Math.max(created.getTime(), startOfToday.getTime())) / (1000 * 60 * 60);
    todayFraction = Math.min(hoursPassed / 8, 1); // 按8小时工作日计算，最多算1天
  }

  // 总工作天数 = 完整工作日 + 今天的小时比例
  const totalWorkDays = completedWorkDays + todayFraction;

  // 0.5为最低单位，向上取整到最近的0.5
  let days: number;
  if (totalWorkDays <= 0.5) {
    days = 0.5;
  } else {
    days = Math.ceil(totalWorkDays * 2) / 2;
  }

  // 颜色判断
  let color: string;
  if (days <= 2) {
    color = '#52c41a'; // 绿色
  } else if (days <= 5) {
    color = '#faad14'; // 黄色
  } else {
    color = '#f5222d'; // 红色
  }

  return { days, color, rawDays: totalWorkDays };
};

// 获取颜色对应的CSS颜色值
const getColorValue = (color: string): string => {
  switch (color) {
    case 'green':
      return '#52c41a';
    case 'yellow':
      return '#faad14';
    case 'red':
      return '#f5222d';
    default:
      return color;
  }
};

const UrgentIssueTable: React.FC<UrgentIssueTableProps> = () => {
  const location = useLocation();
  const [defects, setDefects] = useState<Defect[]>([]);
  const [allDefects, setAllDefects] = useState<Defect[]>([]); // 存储所有符合条件的数据用于统计
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState({
    project_id: '',
    id: '',
    system_id: '',
    module_id: '',
  });
  const [sortBy, setSortBy] = useState('created_on');
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | null>('descend');

  // 页面状态持久化
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
        return state;
      }, [page, pageSize, filters, sortBy, sortOrder]),
      restore: useCallback((state) => {
        const typedState = state as unknown as UrgentIssueTablePageState;
        if (typedState.page) setPage(typedState.page);
        if (typedState.pageSize) setPageSize(typedState.pageSize);
        if (typedState.filters && typeof typedState.filters === 'object') {
          setFilters(prev => ({
            ...prev,
            ...typedState.filters,
            project_id: typedState.filters.project_id || prev.project_id,
            id: typedState.filters.id || '',
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

  const [systems, setSystems] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [loadingSystems, setLoadingSystems] = useState(false);
  const [loadingModules, setLoadingModules] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [exporting, setExporting] = useState(false);

  // 计算系统统计数据 - 基于所有符合条件的数据
  const systemStats = useMemo((): SystemStats[] => {
    const statsMap = new Map<string, { name: string; count: number; totalDays: number }>();

    allDefects.forEach(defect => {
      const systemName = defect.system_module_name?.split('/')[0] || '未分类';
      const systemId = defect.parent_id?.toString() || '0';
      const elapsed = calculateElapsedDays(defect.created_on);

      if (statsMap.has(systemId)) {
        const stat = statsMap.get(systemId)!;
        stat.count++;
        stat.totalDays += elapsed.rawDays;
      } else {
        statsMap.set(systemId, {
          name: systemName,
          count: 1,
          totalDays: elapsed.rawDays,
        });
      }
    });

    return Array.from(statsMap.entries()).map(([systemId, data]) => {
      const avgDays = data.count > 0 ? data.totalDays / data.count : 0;
      // 0.5为最低单位
      let avgElapsedDays: number;
      if (avgDays <= 0.5) {
        avgElapsedDays = 0.5;
      } else {
        avgElapsedDays = Math.ceil(avgDays * 2) / 2;
      }

      let color: string;
      if (avgElapsedDays <= 2) {
        color = 'green';
      } else if (avgElapsedDays <= 5) {
        color = 'yellow';
      } else {
        color = 'red';
      }

      return {
        systemId,
        systemName: data.name,
        count: data.count,
        avgElapsedDays,
        color,
      };
    }).sort((a, b) => b.avgElapsedDays - a.avgElapsedDays);
  }, [allDefects]);

  // 页面加载时默认获取数据
  useEffect(() => {
    fetchDefects();
  }, [page, pageSize, filters.project_id, filters.id, filters.system_id, filters.module_id, sortBy, sortOrder]);

  // 获取所有数据用于统计
  useEffect(() => {
    fetchAllDefectsForStats();
  }, [filters.project_id, filters.system_id, filters.module_id]);

  // 加载项目列表数据
  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoadingProjects(true);
        const projectList = await projectApi.getProjects();
        setProjects(projectList);
      } catch (error) {
        console.error('加载项目列表失败:', error);
      } finally {
        setLoadingProjects(false);
      }
    };

    loadProjects();
  }, []);

  // 加载系统数据
  useEffect(() => {
    const loadSystems = async () => {
      try {
        setLoadingSystems(true);
        const directories = await directoryApi.getDirectoriesByProjectId(filters.project_id);
        const secondLevelDirectories = directories.filter(dir => dir.level === 1);
        setSystems(secondLevelDirectories);
      } catch (error) {
        // 加载失败时静默处理
      } finally {
        setLoadingSystems(false);
      }
    };

    loadSystems();
  }, [filters.project_id]);

  // 加载模块数据
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

  // 获取所有符合条件的数据用于统计（不分页）
  const fetchAllDefectsForStats = async () => {
    try {
      const params: DefectQueryParams = {
        page: 1,
        pageSize: 10000, // 获取大量数据用于统计
      };

      if (filters.project_id && filters.project_id !== '') {
        params.project_id = filters.project_id;
      }

      // 固定查询紧急问题
      params.priority_id = ['4']; // 紧急问题
      // 固定排除已关闭
      params.status_id = ['1', '2', '3', '4', '8'];

      params.system_id = filters.system_id;
      params.module_id = filters.module_id;

      const response = await defectApi.getDefects(params);
      if (response.success && response.data) {
        setAllDefects(response.data.list);
      }
    } catch (err) {
      console.error('获取统计数据失败:', err);
    }
  };

  const fetchDefects = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: DefectQueryParams = {
        page,
        pageSize,
      };

      if (filters.project_id && filters.project_id !== '') {
        params.project_id = filters.project_id;
      }

      if (filters.id && filters.id !== '') {
        params.id = filters.id;
      }

      // 固定查询紧急问题
      params.priority_id = ['4']; // 紧急问题
      // 固定排除已关闭
      params.status_id = ['1', '2', '3', '4', '8'];

      params.system_id = filters.system_id;
      params.module_id = filters.module_id;

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

  const handleReset = () => {
    setFilters({
      project_id: '2980',
      id: '',
      system_id: '',
      module_id: '',
    });
    setPage(1);
  };

  // 导出数据 - 调用后端API导出
  const handleExport = async () => {
    setExporting(true);
    try {
      // 构建查询参数
      const params: Record<string, string> = {};
      if (filters.project_id && filters.project_id !== '') {
        params.project_id = filters.project_id;
      }
      if (filters.system_id && filters.system_id !== '') {
        params.system_id = filters.system_id;
      }
      if (filters.module_id && filters.module_id !== '') {
        params.module_id = filters.module_id;
      }

      // 调用后端导出API
      const response = await axios.get('/api/defects/urgent/export', {
        params,
        responseType: 'blob',
      });

      // 创建下载链接
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // 从响应头获取文件名，或使用默认文件名
      const contentDisposition = response.headers['content-disposition'];
      let fileName = `紧急问题跟踪_${new Date().toISOString().split('T')[0]}.xlsx`;
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (fileNameMatch && fileNameMatch[1]) {
          fileName = decodeURIComponent(fileNameMatch[1]);
        }
      }

      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      antdMessage.success('导出成功');
    } catch (error: any) {
      console.error('导出失败:', error);
      if (error.response?.status === 404) {
        antdMessage.warning('没有数据可导出');
      } else {
        antdMessage.error('导出失败，请重试');
      }
    } finally {
      setExporting(false);
    }
  };

  // 服务端排序字段映射
  const sortFieldMap: Record<string, string> = {
    'id': 'id',
    'system_module_name': 'system_module_name',
    'status_name': 'status_id',
    'assigned_to_name': 'assigned_to_name',
    'created_on': 'created_on',
  };

  // 处理表格排序和筛选变化
  const handleTableChange = (_pagination: any, _tableFilters: any, sorter: any) => {
    if (sorter && sorter.field) {
      const actualField = sortFieldMap[sorter.field] || sorter.field;
      setSortBy(actualField);
      setSortOrder(sorter.order || null);
    } else {
      setSortBy('');
      setSortOrder(null);
    }
    setPage(1);
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
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
      title: '已用时',
      key: 'elapsed_days',
      width: 100,
      render: (_: any, record: Defect) => {
        const elapsed = calculateElapsedDays(record.created_on);
        return (
          <span style={{
            fontWeight: 'bold',
            color: elapsed.color,
            padding: '2px 8px',
            borderRadius: '4px',
            backgroundColor: `${elapsed.color}20`, // 20% 透明度的背景色
          }}>
            {elapsed.days}天
          </span>
        );
      },
    },
  ];

  return (
    <div className="urgent-issue-table" style={{ border: '1px solid var(--border-color, #334155)', borderRadius: 4, padding: 16, backgroundColor: 'var(--bg-container, #1e293b)' }}>
      {/* 系统统计卡片 */}
      {systemStats.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            {systemStats.map(stat => (
              <Card
                key={stat.systemId}
                size="small"
                style={{
                  width: 200,
                  borderLeft: `4px solid ${getColorValue(stat.color)}`,
                  backgroundColor: 'var(--bg-container, #1e293b)',
                  borderColor: 'var(--border-color, #334155)',
                }}
              >
                <div style={{ color: 'var(--text-primary, #f1f5f9)', fontWeight: 'bold', marginBottom: 8 }}>
                  {stat.systemName}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary, #94a3b8)' }}>问题数</div>
                    <div style={{ fontSize: 20, fontWeight: 'bold', color: 'var(--text-primary, #f1f5f9)' }}>
                      {stat.count}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary, #94a3b8)' }}>平均已用时</div>
                    <div style={{
                      fontSize: 20,
                      fontWeight: 'bold',
                      color: getColorValue(stat.color)
                    }}>
                      {stat.avgElapsedDays}天
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

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
            <span style={{ marginRight: 12, minWidth: 90, textAlign: 'right', color: 'var(--text-primary, #f1f5f9)' }}>缺陷编号：</span>
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
            <span style={{ marginRight: 12, minWidth: 90, textAlign: 'right', color: 'var(--text-primary, #f1f5f9)' }}>系统名称：</span>
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
            <span style={{ marginRight: 12, minWidth: 60, textAlign: 'right', color: 'var(--text-primary, #f1f5f9)' }}>模块：</span>
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
            <Button onClick={handleReset}>重置</Button>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleExport}
              loading={exporting}
            >
              导出数据
            </Button>
          </div>
        </div>
      </div>

      {/* 数据表格 */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ marginBottom: 8, color: 'var(--text-primary, #f1f5f9)' }}>加载缺陷列表...</div>
          <Spin />
        </div>
      ) : error ? (
        <Alert message="错误" description={error} type="error" showIcon />
      ) : defects.length === 0 ? (
        <Alert message="暂无紧急缺陷数据" type="info" showIcon />
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <Table
              className="urgent-issue-table-custom"
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

export default UrgentIssueTable;
