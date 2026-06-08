/**
 * 我的待办提醒功能 - 提醒弹窗组件
 * 右下角弹出提醒，显示新增待办数量和明细
 * 支持鼠标悬停暂停自动隐藏
 * 参照 TodoStatsBadge 风格设计
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Card, Button, Popover, Tag, Space } from 'antd';
import { BellOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { NewTodoData, TodoDefect } from '../../types/todoReminder';
import { useTheme } from '../../contexts/ThemeContext';
import storage from '../../services/todoReminder/storage';
import baselineManager from '../../services/todoReminder/baselineManager';
import './TodoReminderToast.css';

/**
 * 系统统计信息
 */
interface SystemStat {
  systemName: string;
  count: number;
  defectIds: number[];
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
 * 提醒弹窗组件属性
 */
export interface TodoReminderToastProps {
  /** 是否显示 */
  visible: boolean;
  /** 新增待办数据 */
  newTodoData: NewTodoData | null;
  /** 关闭回调 */
  onClose: () => void;
  /** 自动消失时间（毫秒），默认5000 */
  autoCloseDelay?: number;
}

/**
 * 提醒弹窗组件
 */
export const TodoReminderToast: React.FC<TodoReminderToastProps> = ({
  visible,
  newTodoData,
  onClose,
  autoCloseDelay = 5000,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark } = useTheme();
  const [isClosing, setIsClosing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [projectStats, setProjectStats] = useState<ProjectStat[]>([]);

  // 判断当前是否在我的待办页面
  const isOnTodoPage = location.pathname === '/defects/todo';

  // 使用 ref 来管理计时器
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const remainingTimeRef = useRef<number>(autoCloseDelay);
  const startTimeRef = useRef<number>(0);

  /**
   * 按系统分组统计
   */
  const groupBySystem = useCallback((todos: TodoDefect[]): SystemStat[] => {
    const systemMap = new Map<string, { count: number; ids: number[] }>();

    todos.forEach((todo) => {
      const systemModule = todo.system_module_name || '未分类';
      const systemName = systemModule.split(' - ')[0] || '未分类';

      const existing = systemMap.get(systemName);
      if (existing) {
        existing.count++;
        existing.ids.push(todo.id);
      } else {
        systemMap.set(systemName, { count: 1, ids: [todo.id] });
      }
    });

    return Array.from(systemMap.entries())
      .map(([systemName, data]) => ({
        systemName,
        count: data.count,
        defectIds: data.ids,
      }))
      .sort((a, b) => b.count - a.count);
  }, []);

  /**
   * 处理新增待办数据，按项目和系统分组
   */
  useEffect(() => {
    if (!newTodoData) {
      setProjectStats([]);
      return;
    }

    // 使用完整的缺陷数据按系统分组
    const stats: ProjectStat[] = newTodoData.projectBreakdown.map((project) => {
      // 使用真实的缺陷数据，如果没有则使用 mock 数据
      const todos: TodoDefect[] = project.todos && project.todos.length > 0
        ? project.todos
        : project.newIds.map((id) => ({
            id,
            subject: `缺陷 #${id}`,
            project_id: project.projectId,
            status_id: 1,
            status_name: '新建',
            priority_id: 2,
            priority_name: '普通',
            created_on: new Date().toISOString(),
            updated_on: new Date().toISOString(),
            system_module_name: '未分类',
          }));

      return {
        projectId: project.projectId,
        projectName: project.projectName,
        totalCount: project.count,
        systems: groupBySystem(todos),
      };
    });

    setProjectStats(stats);
  }, [newTodoData, groupBySystem]);

  /**
   * 处理关闭
   */
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300);
  }, [onClose]);

  /**
   * 清理计时器
   */
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /**
   * 开始计时
   */
  const startTimer = useCallback(
    (delay: number) => {
      clearTimer();
      if (delay > 0 && visible && !isHovered) {
        startTimeRef.current = Date.now();
        timerRef.current = setTimeout(() => {
          if (newTodoData) {
            for (const project of newTodoData.projectBreakdown) {
              const currentBaselineIds = baselineManager.getProjectBaselineIds(project.projectId);
              const updatedIds = [...new Set([...currentBaselineIds, ...project.newIds])];
              baselineManager.updateProjectBaseline(project.projectId, updatedIds);
            }
            storage.clearNewTodoData();
          }
          handleClose();
        }, delay);
      }
    },
    [clearTimer, handleClose, isHovered, newTodoData, visible]
  );

  // 当弹窗显示时开始计时
  useEffect(() => {
    if (visible && autoCloseDelay > 0) {
      remainingTimeRef.current = autoCloseDelay;
      startTimer(autoCloseDelay);
    }

    return () => {
      clearTimer();
    };
  }, [visible, autoCloseDelay, startTimer, clearTimer]);

  // 当鼠标悬停状态改变时处理计时器
  useEffect(() => {
    if (!visible || autoCloseDelay <= 0) return;

    if (isHovered) {
      clearTimer();
      const elapsed = Date.now() - startTimeRef.current;
      remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
    } else {
      if (remainingTimeRef.current > 0) {
        startTimer(remainingTimeRef.current);
      }
    }
  }, [isHovered, visible, autoCloseDelay, clearTimer, startTimer]);

  /**
   * 处理项目点击
   */
  const handleProjectClick = (projectId: number, projectName: string) => {
    clearTimer();
    if (newTodoData) {
      for (const project of newTodoData.projectBreakdown) {
        const currentBaselineIds = baselineManager.getProjectBaselineIds(project.projectId);
        const updatedIds = [...new Set([...currentBaselineIds, ...project.newIds])];
        baselineManager.updateProjectBaseline(project.projectId, updatedIds);
      }
      storage.clearNewTodoData();
    }
    handleClose();

    if (isOnTodoPage) {
      const event = new CustomEvent('todoFilterApply', {
        detail: { project_id: projectId, project_name: projectName },
      });
      window.dispatchEvent(event);
    } else {
      navigate('/defects/todo', {
        state: { filter: { project_id: projectId, project_name: projectName } },
      });
    }
  };

  /**
   * 处理系统点击 - 支持多ID筛选
   */
  const handleSystemClick = (
    projectId: number,
    projectName: string,
    systemName: string,
    defectIds: number[]
  ) => {
    clearTimer();
    if (newTodoData) {
      for (const project of newTodoData.projectBreakdown) {
        const currentBaselineIds = baselineManager.getProjectBaselineIds(project.projectId);
        const updatedIds = [...new Set([...currentBaselineIds, ...project.newIds])];
        baselineManager.updateProjectBaseline(project.projectId, updatedIds);
      }
      storage.clearNewTodoData();
    }
    handleClose();

    if (isOnTodoPage) {
      const event = new CustomEvent('todoFilterApply', {
        detail: {
          project_id: projectId,
          project_name: projectName,
          system_name: systemName,
          defect_ids: defectIds, // 传递多ID
        },
      });
      window.dispatchEvent(event);
    } else {
      navigate('/defects/todo', {
        state: {
          filter: {
            project_id: projectId,
            project_name: projectName,
            system_name: systemName,
            defect_ids: defectIds, // 传递多ID
          },
        },
      });
    }
  };

  /**
   * 处理关闭按钮点击
   */
  const handleCloseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearTimer();
    if (newTodoData) {
      for (const project of newTodoData.projectBreakdown) {
        const currentBaselineIds = baselineManager.getProjectBaselineIds(project.projectId);
        const updatedIds = [...new Set([...currentBaselineIds, ...project.newIds])];
        baselineManager.updateProjectBaseline(project.projectId, updatedIds);
      }
      storage.clearNewTodoData();
    }
    handleClose();
  };

  /**
   * 处理立即处理按钮点击
   */
  const handleProcessClick = () => {
    clearTimer();
    if (newTodoData) {
      for (const project of newTodoData.projectBreakdown) {
        const currentBaselineIds = baselineManager.getProjectBaselineIds(project.projectId);
        const updatedIds = [...new Set([...currentBaselineIds, ...project.newIds])];
        baselineManager.updateProjectBaseline(project.projectId, updatedIds);
      }
      storage.clearNewTodoData();
    }
    handleClose();
    navigate('/defects/todo');
  };

  /**
   * 处理鼠标进入
   */
  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  /**
   * 处理鼠标离开
   */
  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  /**
   * 渲染明细内容 - 参照 TodoStatsBadge 风格
   */
  const renderDetailContent = () => {
    if (!newTodoData || projectStats.length === 0) {
      return <div className={`todo-reminder-detail-content ${isDark ? 'dark' : 'light'}`}>暂无明细</div>;
    }

    return (
      <div className={`todo-reminder-detail-content ${isDark ? 'dark' : 'light'}`}>
        {/* 头部 */}
        <div className={`detail-header ${isDark ? 'dark' : 'light'}`}>
          <span className={`detail-title ${isDark ? 'dark' : 'light'}`}>新增待办</span>
          <Tag color="red">共 {newTodoData.totalCount} 条</Tag>
        </div>

        {/* 项目列表 */}
        <div className="detail-stats-list">
          {projectStats.map((project) => (
            <div key={project.projectId} className={`detail-project-card ${isDark ? 'dark' : 'light'}`}>
              {/* 项目标题栏 */}
              <div
                className={`detail-project-header clickable ${isDark ? 'dark' : 'light'}`}
                onClick={() => handleProjectClick(project.projectId, project.projectName)}
              >
                <span className={`detail-project-title ${isDark ? 'dark' : 'light'}`}>
                  {project.projectName}
                </span>
                <span className={`detail-project-count ${isDark ? 'dark' : 'light'}`}>
                  {project.totalCount}
                </span>
              </div>

              {/* 项目内容 - 子系统列表 */}
              {project.systems.length > 0 && (
                <div className={`detail-project-body ${isDark ? 'dark' : 'light'}`}>
                  {project.systems.map((system, index) => (
                    <div
                      key={index}
                      className={`detail-system-row ${isDark ? 'dark' : 'light'}`}
                      onClick={() =>
                        handleSystemClick(
                          project.projectId,
                          project.projectName,
                          system.systemName,
                          system.defectIds
                        )
                      }
                    >
                      <span className={`detail-system-name ${isDark ? 'dark' : 'light'}`}>
                        {system.systemName}
                      </span>
                      <span className={`detail-system-count ${isDark ? 'dark' : 'light'}`}>
                        {system.count}
                      </span>
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

  if (!visible || !newTodoData) {
    return null;
  }

  return (
    <div
      className={`todo-reminder-toast ${isClosing ? 'closing' : ''} ${isDark ? 'dark' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Popover
        content={renderDetailContent()}
        title={null}
        placement="bottomRight"
        trigger="hover"
        overlayClassName={`todo-reminder-popover ${isDark ? 'dark' : 'light'}`}
        mouseEnterDelay={0.3}
      >
        <Card className="reminder-card" size="small">
          <div className="reminder-content">
            {/* 头部 */}
            <div className="reminder-header">
              <Space>
                <BellOutlined className="bell-icon" />
                <span className="title">新待办提醒</span>
              </Space>
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined />}
                onClick={handleCloseClick}
                className="close-btn"
              />
            </div>

            {/* 主体 */}
            <div className="reminder-body">
              <div className="message">
                您有 <strong className="count">{newTodoData.totalCount}</strong> 条新的待办任务
              </div>
              <div className="hint">
              {`${Math.ceil(remainingTimeRef.current / 1000)}秒后自动隐藏`}
            </div>
            </div>

            {/* 底部 */}
            <div className="reminder-footer">
              <Button
                type="primary"
                size="small"
                icon={<EyeOutlined />}
                onClick={handleProcessClick}
                className="view-btn"
              >
                立即处理
              </Button>
            </div>
          </div>
        </Card>
      </Popover>
    </div>
  );
};

export default TodoReminderToast;
