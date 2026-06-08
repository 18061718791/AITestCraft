/**
 * 我的待办统计徽章组件
 * 显示当前所有待办数量，悬浮展示按项目+系统维度的详细统计
 * 支持点击跳转到我的待办页面并筛选
 */

import React, { useState, useEffect } from 'react';
import { Badge, Popover, Spin, Empty } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { projectApi } from '../../services/project/projectApi';
import { TodoDefect } from '../../types/todoReminder';
import apiBase from '../../services/apiBase';
import './TodoStatsBadge.css';

/**
 * 系统统计信息
 */
interface SystemStat {
  systemName: string;
  count: number;
}

/**
 * 项目统计信息
 */
interface ProjectStat {
  projectId: number;
  projectName: string;
  totalCount: number;
  systems: SystemStat[];
}

/**
 * 筛选参数
 */
interface FilterParams {
  project_id: number;
  project_name: string;
  system_name?: string;
}

/**
 * 待办统计组件属性
 */
export interface TodoStatsBadgeProps {
  /** 自定义样式 */
  style?: React.CSSProperties;
}

/**
 * 我的待办统计徽章组件
 */
export const TodoStatsBadge: React.FC<TodoStatsBadgeProps> = ({ style }) => {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [totalCount, setTotalCount] = useState(0);
  const [projectStats, setProjectStats] = useState<ProjectStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [popoverVisible, setPopoverVisible] = useState(false);

  // 判断当前是否在我的待办页面
  const isOnTodoPage = location.pathname === '/defects/todo';

  /**
   * 查询指定项目的待办
   */
  const fetchProjectTodos = async (projectId: number): Promise<TodoDefect[]> => {
    try {
      const response = await apiBase.get('/defects/my-todo', {
        params: {
          project_id: projectId,
          page: 1,
          pageSize: 1000,
        },
      });
      // 后端返回结构: { success: true, data: { list: [], total: number } }
      const data = response.data.data?.list || [];
      return data;
    } catch (error) {
      return [];
    }
  };

  /**
   * 按系统分组统计
   */
  const groupBySystem = (todos: TodoDefect[]): SystemStat[] => {
    const systemMap = new Map<string, number>();

    todos.forEach((todo) => {
      // 从 system_module_name 提取系统名称
      // 格式通常是 "系统名称 - 模块名称" 或 "系统名称"
      const systemModule = todo.system_module_name || '未分类';
      const systemName = systemModule.split(' - ')[0] || '未分类';

      systemMap.set(systemName, (systemMap.get(systemName) || 0) + 1);
    });

    // 转换为数组并排序
    return Array.from(systemMap.entries())
      .map(([systemName, count]) => ({ systemName, count }))
      .sort((a, b) => b.count - a.count); // 按数量降序
  };

  /**
   * 加载统计数据
   */
  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // 获取所有项目
      const projects = await projectApi.getProjects();

      if (!projects || projects.length === 0) {
        setTotalCount(0);
        setProjectStats([]);
        return;
      }

      // 查询各项目待办并统计
      const stats: ProjectStat[] = [];
      let total = 0;

      for (const project of projects) {
        const projectId = parseInt(project.id);
        const todos = await fetchProjectTodos(projectId);

        if (todos.length > 0) {
          const systems = groupBySystem(todos);

          stats.push({
            projectId,
            projectName: project.name,
            totalCount: todos.length,
            systems,
          });

          total += todos.length;
        }
      }

      // 按待办数量降序排序项目
      stats.sort((a, b) => b.totalCount - a.totalCount);

      setTotalCount(total);
      setProjectStats(stats);
    } catch (err) {
      setError('加载失败');
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时加载数据
  useEffect(() => {
    loadStats();

    // 定时刷新（每60秒）
    const timer = setInterval(loadStats, 60000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  // 监听来自MyTodoPage的筛选变化
  useEffect(() => {
    const handleTodoFilterChange = (_event: CustomEvent<FilterParams>) => {
      // 可以在这里处理筛选变化后的逻辑，比如刷新统计数据
    };

    window.addEventListener('todoFilterChanged' as any, handleTodoFilterChange);
    return () => {
      window.removeEventListener('todoFilterChanged' as any, handleTodoFilterChange);
    };
  }, []);

  /**
   * 发送筛选事件给MyTodoPage
   */
  const sendFilterToTodoPage = (filter: FilterParams) => {
    // 触发自定义事件，通知MyTodoPage更新筛选
    const event = new CustomEvent('todoFilterApply', { detail: filter });
    window.dispatchEvent(event);
  };

  /**
   * 处理项目点击
   */
  const handleProjectClick = (projectId: number, projectName: string) => {
    const filter: FilterParams = {
      project_id: projectId,
      project_name: projectName,
    };

    if (isOnTodoPage) {
      // 如果已经在我的待办页面，直接发送筛选事件
      sendFilterToTodoPage(filter);
    } else {
      // 否则跳转到我的待办页面
      setPopoverVisible(false);
      navigate('/defects/todo', {
        state: { filter }
      });
    }
  };

  /**
   * 处理系统点击
   */
  const handleSystemClick = (projectId: number, projectName: string, systemName: string) => {
    const filter: FilterParams = {
      project_id: projectId,
      project_name: projectName,
      system_name: systemName,
    };

    if (isOnTodoPage) {
      // 如果已经在我的待办页面，直接发送筛选事件
      sendFilterToTodoPage(filter);
    } else {
      // 否则跳转到我的待办页面
      setPopoverVisible(false);
      navigate('/defects/todo', {
        state: { filter }
      });
    }
  };

  /**
   * 渲染统计内容
   */
  const renderStatsContent = () => {
    if (loading) {
      return (
        <div className={`todo-stats-loading ${isDark ? 'dark' : 'light'}`}>
          <Spin size="small" />
          <span>加载中...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className={`todo-stats-error ${isDark ? 'dark' : 'light'}`}>
          <Empty description={error} image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      );
    }

    if (projectStats.length === 0) {
      return (
        <div className={`todo-stats-empty ${isDark ? 'dark' : 'light'}`}>
          <Empty
            description="暂无待办任务"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </div>
      );
    }

    return (
      <div className={`todo-stats-content ${isDark ? 'dark' : 'light'}`}>
        <div className={`stats-header ${isDark ? 'dark' : 'light'}`}>
          <span className={`stats-title ${isDark ? 'dark' : 'light'}`}>我的待办</span>
          <span className={`stats-total ${isDark ? 'dark' : 'light'}`}>{totalCount}</span>
        </div>
        <div className="stats-list">
          {projectStats.map((project) => (
            <div key={project.projectId} className={`project-card ${isDark ? 'dark' : 'light'}`}>
              {/* 项目标题栏 */}
              <div 
                className={`project-card-header clickable ${isDark ? 'dark' : 'light'}`}
                onClick={() => handleProjectClick(project.projectId, project.projectName)}
                title={isOnTodoPage ? `筛选: ${project.projectName}` : `点击查看: ${project.projectName}`}
              >
                <span className={`project-card-title ${isDark ? 'dark' : 'light'}`}>{project.projectName}</span>
                <span className={`project-card-count ${isDark ? 'dark' : 'light'}`}>{project.totalCount}</span>
              </div>
              {/* 项目内容 - 子系统列表 */}
              {project.systems.length > 0 && (
                <div className={`project-card-body ${isDark ? 'dark' : 'light'}`}>
                  {project.systems.map((system, index) => (
                    <div 
                      key={index} 
                      className={`system-row clickable ${isDark ? 'dark' : 'light'}`}
                      onClick={() => handleSystemClick(project.projectId, project.projectName, system.systemName)}
                      title={isOnTodoPage ? `筛选: ${system.systemName}` : `点击查看: ${system.systemName}`}
                    >
                      <span className={`system-row-name ${isDark ? 'dark' : 'light'}`}>{system.systemName}</span>
                      <span className={`system-row-count ${isDark ? 'dark' : 'light'}`}>{system.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const primaryColor = '#00d4ff';

  return (
    <Popover
      content={renderStatsContent()}
      title={null}
      placement="bottomLeft"
      trigger="hover"
      overlayClassName={`todo-stats-popover ${isDark ? 'dark' : 'light'}`}
      mouseEnterDelay={0.3}
      open={popoverVisible}
      onOpenChange={setPopoverVisible}
    >
      <div
        className="todo-stats-badge"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          background: 'transparent',
          borderRadius: '20px',
          border: `1px solid ${primaryColor}40`,
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          ...style,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = isDark
            ? 'rgba(0, 212, 255, 0.1)'
            : 'rgba(0, 212, 255, 0.15)';
          e.currentTarget.style.boxShadow = `0 0 15px ${primaryColor}30`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <BellOutlined
          style={{
            fontSize: '16px',
            color: primaryColor,
          }}
        />
        <span
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: isDark ? '#f1f5f9' : '#1e293b',
            background: 'transparent',
          }}
        >
          我的待办
        </span>
        <Badge
          count={totalCount}
          style={{
            backgroundColor: totalCount > 0 ? '#ff4d4f' : '#52c41a',
            fontSize: '11px',
            minWidth: '18px',
            height: '18px',
            lineHeight: '18px',
            padding: '0 6px',
          }}
        />
      </div>
    </Popover>
  );
};

export default TodoStatsBadge;
