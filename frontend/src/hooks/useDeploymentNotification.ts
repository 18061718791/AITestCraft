/**
 * 全局待部署应用提醒 Hook
 * 在应用全局监听 WebSocket 部署任务通知
 */

import { useState, useEffect, useCallback } from 'react';
import socketService from '../services/socket';
import { DeploymentNotificationData } from '../components/deployment/DeploymentNotificationToast';

/**
 * Hook 返回类型
 */
export interface UseDeploymentNotificationResult {
  /** 是否显示提醒框 */
  isVisible: boolean;
  /** 提醒数据 */
  notificationData: DeploymentNotificationData | null;
  /** 显示提醒框 */
  showNotification: (data: DeploymentNotificationData) => void;
  /** 隐藏提醒框 */
  hideNotification: () => void;
  /** WebSocket 连接状态 */
  connectionState: 'connected' | 'connecting' | 'disconnected' | 'error';
}

/**
 * 全局待部署应用提醒 Hook
 * @returns 提醒状态和操作函数
 */
export function useDeploymentNotification(): UseDeploymentNotificationResult {
  const [isVisible, setIsVisible] = useState(false);
  const [notificationData, setNotificationData] = useState<DeploymentNotificationData | null>(null);
  const [connectionState, setConnectionState] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('disconnected');

  /**
   * 显示提醒框
   */
  const showNotification = useCallback((data: DeploymentNotificationData) => {
    setNotificationData(data);
    setIsVisible(true);
  }, []);

  /**
   * 隐藏提醒框
   */
  const hideNotification = useCallback(() => {
    setIsVisible(false);
    // 延迟清空数据，避免动画过程中数据消失
    setTimeout(() => {
      setNotificationData(null);
    }, 300);
  }, []);

  /**
   * 建立 WebSocket 连接并监听部署任务通知
   */
  useEffect(() => {
    let isSubscribed = true;

    const setupSocket = async () => {
      try {
        setConnectionState('connecting');
        console.log('[DeploymentNotification] Starting WebSocket connection...');

        // 建立 WebSocket 连接，使用 'global' 作为全局 session ID
        await socketService.connect('global');

        if (!isSubscribed) return;

        setConnectionState('connected');
        console.log('[DeploymentNotification] WebSocket connected successfully');

        // 监听新的部署任务通知
        console.log('[DeploymentNotification] Registering new-deployment-tasks listener...');
        socketService.onNewDeploymentTasks((data) => {
          console.log('[DeploymentNotification] New deployment tasks received:', data);
          if (isSubscribed) {
            showNotification(data);
          }
        });

        // 监听任务状态更新
        socketService.onDeploymentTaskUpdate((data) => {
          console.log('[DeploymentNotification] Task status updated:', data);
          // 可以选择在这里显示状态更新提示
        });

        // 监听连接状态变化
        socketService.onConnect?.(() => {
          if (isSubscribed) {
            setConnectionState('connected');
            console.log('[DeploymentNotification] WebSocket reconnected');
          }
        });

        socketService.onDisconnect?.((reason) => {
          if (isSubscribed) {
            setConnectionState('disconnected');
            console.log('[DeploymentNotification] WebSocket disconnected:', reason);
          }
        });

        socketService.onConnectError?.((error) => {
          if (isSubscribed) {
            setConnectionState('error');
            console.error('[DeploymentNotification] WebSocket connection error:', error);
          }
        });

      } catch (error) {
        console.error('[DeploymentNotification] Failed to setup WebSocket:', error);
        if (isSubscribed) {
          setConnectionState('error');
        }
      }
    };

    setupSocket();

    // 清理函数
    return () => {
      isSubscribed = false;
      // 注意：不在此处断开连接，因为其他组件可能也在使用
      // socketService.disconnect();
    };
  }, [showNotification]);

  return {
    isVisible,
    notificationData,
    showNotification,
    hideNotification,
    connectionState,
  };
}

export default useDeploymentNotification;
