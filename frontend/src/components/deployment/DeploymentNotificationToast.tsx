/**
 * 部署任务通知弹窗组件
 * 科技感设计风格，支持暗色/亮色主题
 * 参照 TodoReminderToast 风格设计
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Card, Button, Tag, Badge } from 'antd';
import {
  BellOutlined,
  CloseOutlined,
  RocketOutlined,
  BranchesOutlined,
  UserOutlined,
  MessageOutlined,
  GithubOutlined,
  CheckCircleOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import './DeploymentNotificationToast.css';

/**
 * 部署任务数据
 */
export interface DeploymentTaskData {
  id: number;
  appName: string;
  commitMessage: string | null;
  commitAuthor: string | null;
}

/**
 * 通知数据
 */
export interface DeploymentNotificationData {
  repository: string;
  branch: string;
  tasks: DeploymentTaskData[];
  timestamp: string;
}

/**
 * 通知弹窗组件属性
 */
export interface DeploymentNotificationToastProps {
  /** 是否显示 */
  visible: boolean;
  /** 通知数据 */
  data: DeploymentNotificationData | null;
  /** 关闭回调 */
  onClose: () => void;
  /** 自动消失时间（毫秒），默认2000 */
  autoCloseDelay?: number;
}

/**
 * 部署任务通知弹窗组件
 */
export const DeploymentNotificationToast: React.FC<DeploymentNotificationToastProps> = ({
  visible,
  data,
  onClose,
  autoCloseDelay = 2000,
}) => {
  const navigate = useNavigate();
  const { isDark, themeConfig } = useTheme();
  const [isClosing, setIsClosing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // 使用 ref 来管理计时器
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const remainingTimeRef = useRef<number>(autoCloseDelay);
  const startTimeRef = useRef<number>(0);
  
  // 用于强制重新触发CSS动画的key
  const [animationKey, setAnimationKey] = useState(0);

  // 获取主题色
  const primaryColor = (themeConfig.token?.colorPrimary as string) || '#00d4ff';

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
      if (delay > 0 && !isHovered) {
        startTimeRef.current = Date.now();
        timerRef.current = setTimeout(() => {
          handleClose();
        }, delay);
      }
    },
    [clearTimer, handleClose, isHovered]
  );

  // 当弹窗显示时开始计时
  useEffect(() => {
    if (visible && autoCloseDelay > 0) {
      // 重置剩余时间和开始时间
      remainingTimeRef.current = autoCloseDelay;
      startTimeRef.current = 0;
      // 重置动画key以重新触发CSS动画
      setAnimationKey(prev => prev + 1);
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
      // 鼠标悬停时：清除计时器并计算剩余时间
      clearTimer();
      const elapsed = Date.now() - startTimeRef.current;
      // 只有计时器真正启动过（startTimeRef.current > 0）才计算已过去的时间
      if (startTimeRef.current > 0) {
        remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
      }
    } else {
      // 鼠标离开时：如果还有剩余时间，重新开始计时
      if (remainingTimeRef.current > 0) {
        startTimer(remainingTimeRef.current);
      } else {
        // 如果没有剩余时间了，直接关闭
        handleClose();
      }
    }
  }, [isHovered, visible, autoCloseDelay, clearTimer, startTimer, handleClose]);

  /**
   * 处理查看详情
   */
  const handleViewDetails = useCallback(() => {
    clearTimer();
    handleClose();
    navigate('/app-management/pending');
  }, [clearTimer, handleClose, navigate]);

  /**
   * 处理关闭按钮点击
   */
  const handleCloseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearTimer();
    handleClose();
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

  // 调试日志
  useEffect(() => {
    if (visible && data) {
      console.log('[DeploymentNotification] Data received:', data);
      console.log('[DeploymentNotification] Tasks:', data.tasks);
    }
  }, [visible, data]);

  if (!visible || !data) {
    return null;
  }

  const { repository, branch, tasks } = data;
  const taskCount = tasks?.length || 0;
  const firstTask = tasks?.[0];

  // 如果没有任务数据，显示简化版提示
  if (!tasks || tasks.length === 0) {
    return (
      <div
        className={`deployment-notification-toast ${isClosing ? 'closing' : ''} ${isDark ? 'dark' : 'light'}`}
        style={{ '--primary-color': primaryColor } as React.CSSProperties}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Card className="deployment-notification-card" size="small">
          <div className="deployment-notification-content">
            <div className="notification-header">
              <div className="header-left">
                <div className="icon-wrapper">
                  <RocketOutlined className="rocket-icon" />
                </div>
                <span className="title">新的部署任务</span>
              </div>
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined />}
                onClick={handleCloseClick}
                className="close-btn"
              />
            </div>
            <div className="notification-body" style={{ padding: '20px', textAlign: 'center' }}>
              <p>仓库: {repository || '未知'}</p>
              <p>分支: {branch || '未知'}</p>
              <p>有新的代码更新需要部署</p>
            </div>
            <div className="notification-footer">
              <Button
                type="primary"
                size="small"
                onClick={handleViewDetails}
              >
                查看详情
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div
      className={`deployment-notification-toast ${isClosing ? 'closing' : ''} ${isDark ? 'dark' : 'light'}`}
      style={{ '--primary-color': primaryColor } as React.CSSProperties}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Card className="deployment-notification-card" size="small">
        <div className="deployment-notification-content">
          {/* 头部 - 科技感标题栏 */}
          <div className="notification-header">
            <div className="header-left">
              <div className="icon-wrapper">
                <RocketOutlined className="rocket-icon" />
              </div>
              <div className="header-text">
                <span className="title">新的部署任务</span>
                <Badge
                  count={taskCount}
                  className="task-count-badge"
                  style={{
                    backgroundColor: isDark ? primaryColor : '#1890ff',
                  }}
                />
              </div>
            </div>
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined />}
              onClick={handleCloseClick}
              className="close-btn"
            />
          </div>

          {/* 主体 - 任务信息 */}
          <div className="notification-body">
            {/* 仓库信息 */}
            <div className="info-row">
              <GithubOutlined className="row-icon" />
              <span className="label">仓库</span>
              <span className="value">{repository}</span>
            </div>

            {/* 分支信息 */}
            <div className="info-row">
              <BranchesOutlined className="row-icon" />
              <span className="label">分支</span>
              <Tag
                color={isDark ? 'cyan' : 'blue'}
              >
                {branch}
              </Tag>
            </div>

            {/* 应用列表 */}
            <div className="apps-section">
              <div className="section-title">
                <BellOutlined className="section-icon" />
                <span>待部署应用 ({taskCount})</span>
              </div>
              <div className="apps-list">
                {tasks.slice(0, 3).map((task, index) => (
                  <div
                    key={task.id || index}
                    className="app-item"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="app-info">
                      <CheckCircleOutlined className="app-icon" />
                      <span className="app-name">{task.appName || '未命名应用'}</span>
                    </div>
                    {task.commitMessage && (
                      <div className="commit-info">
                        <MessageOutlined className="commit-icon" />
                        <span className="commit-text" title={task.commitMessage}>
                          {task.commitMessage.length > 15
                            ? task.commitMessage.substring(0, 15) + '...'
                            : task.commitMessage}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
                {taskCount > 3 && (
                  <div className="more-apps">
                    还有 {taskCount - 3} 个应用...
                  </div>
                )}
              </div>
            </div>

            {/* 提交者 */}
            {firstTask?.commitAuthor && (
              <div className="info-row">
                <UserOutlined className="row-icon" />
                <span className="label">提交者</span>
                <span className="value" style={{ color: primaryColor }}>
                  {firstTask.commitAuthor}
                </span>
              </div>
            )}

            {/* 倒计时 */}
            <div className="countdown-hint">
              <div className="countdown-bar">
                <div
                  key={animationKey}
                  className="countdown-progress"
                  style={{
                    animationDuration: `${autoCloseDelay}ms`,
                  }}
                />
              </div>
              <span className="countdown-text">
                {Math.ceil(remainingTimeRef.current / 1000)}秒后自动隐藏
              </span>
            </div>
          </div>

          {/* 底部 */}
          <div className="notification-footer">
            <Button
              type="primary"
              size="small"
              icon={<EyeOutlined />}
              onClick={handleViewDetails}
              className="view-btn"
            >
              查看详情
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default DeploymentNotificationToast;
