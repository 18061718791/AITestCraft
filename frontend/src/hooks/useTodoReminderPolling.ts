/**
 * 我的待办提醒功能 - 定时轮询Hook
 * 管理定时器，控制轮询启停
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { NewTodoData } from '../types/todoReminder';
import storage from '../services/todoReminder/storage';
import reminderService from '../services/todoReminder/reminderService';

/**
 * 定时轮询Hook返回类型
 */
export interface UseTodoReminderPollingResult {
  /** 是否正在运行 */
  isRunning: boolean;
  /** 上次检查时间 */
  lastCheckTime: Date | null;
  /** 下次检查时间 */
  nextCheckTime: Date | null;
  /** 新增待办数据 */
  newTodoData: NewTodoData | null;
  /** 弹窗是否显示 */
  isToastVisible: boolean;
  /** 显示弹窗 */
  showToast: () => void;
  /** 隐藏弹窗 */
  hideToast: () => void;
  /** 立即检查 */
  checkNow: () => Promise<void>;
}

/**
 * 定时轮询Hook
 * @returns 轮询状态和操作函数
 */
export function useTodoReminderPolling(): UseTodoReminderPollingResult {
  // 从localStorage获取配置
  const config = storage.getConfig();

  // 状态管理
  const [isRunning, setIsRunning] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);
  const [nextCheckTime, setNextCheckTime] = useState<Date | null>(null);
  const [newTodoData, setNewTodoData] = useState<NewTodoData | null>(null);
  const [isToastVisible, setIsToastVisible] = useState(false);

  // 使用ref保存定时器引用，避免闭包问题
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isCheckingRef = useRef(false);

  /**
   * 执行检查
   */
  const performCheck = useCallback(async () => {
    // 防止重复执行
    if (isCheckingRef.current) {
      return;
    }

    // 检查是否启用
    const currentConfig = storage.getConfig();
    if (!currentConfig.enabled) {
      return;
    }

    isCheckingRef.current = true;
    setLastCheckTime(new Date());

    try {
      const result = await reminderService.checkAllProjects();

      if (result && result.totalCount > 0) {
        setNewTodoData(result);
        setIsToastVisible(true);
      }
    } catch (error) {
      // 定时检查失败时静默处理
    } finally {
      isCheckingRef.current = false;
      // 设置下次检查时间
      const nextCheck = new Date(Date.now() + currentConfig.intervalSeconds * 1000);
      setNextCheckTime(nextCheck);
    }
  }, []);

  /**
   * 立即检查（手动触发）
   */
  const checkNow = useCallback(async () => {
    await performCheck();
  }, [performCheck]);

  /**
   * 显示弹窗
   */
  const showToast = useCallback(() => {
    setIsToastVisible(true);
  }, []);

  /**
   * 隐藏弹窗
   */
  const hideToast = useCallback(() => {
    setIsToastVisible(false);
    // 用户已看到提醒，更新基准以避免重复提醒
    // 清除新增数据标记
    storage.clearNewTodoData();
  }, []);

  /**
   * 启动轮询
   */
  useEffect(() => {
    const currentConfig = storage.getConfig();

    if (!currentConfig.enabled) {
      setIsRunning(false);
      // 清理定时器
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    setIsRunning(true);

    // 延迟执行首次检查（避免页面加载时立即执行）
    const initialDelay = setTimeout(() => {
      performCheck();
    }, 5000); // 5秒后执行首次检查

    // 设置定时器
    timerRef.current = setInterval(
      performCheck,
      currentConfig.intervalSeconds * 1000
    );

    // 设置下次检查时间
    const nextCheck = new Date(Date.now() + currentConfig.intervalSeconds * 1000 + 5000);
    setNextCheckTime(nextCheck);

    // 清理函数
    return () => {
      clearTimeout(initialDelay);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [config.enabled, config.intervalSeconds, performCheck]);

  // 监听配置变化（通过storage事件）
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'todo_reminder_config') {
        // 配置发生变化，重新加载配置
        // 注意：实际重新初始化在下一个渲染周期处理
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return {
    isRunning,
    lastCheckTime,
    nextCheckTime,
    newTodoData,
    isToastVisible,
    showToast,
    hideToast,
    checkNow,
  };
}

export default useTodoReminderPolling;
